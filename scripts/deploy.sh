#!/bin/bash
set -e

IMAGE_TAG=$1
if [ -z "$IMAGE_TAG" ]; then
  echo "Error: IMAGE_TAG is required."
  exit 1
fi

# Shift the first argument (IMAGE_TAG) so $@ contains only the service list
shift

DEPLOY_ARGS="$@"
SHOULD_DEPLOY_ALL=false

# If no service list is provided, or if the list contains "all"
if [ -z "$DEPLOY_ARGS" ] || [[ " $DEPLOY_ARGS " =~ " all " ]]; then
  SHOULD_DEPLOY_ALL=true
  echo "========================================="
  echo "Starting FULL deployment for tag: $IMAGE_TAG"
  echo "========================================="
else
  echo "========================================="
  echo "Starting SERVICE-SPECIFIC deployment for tag: $IMAGE_TAG"
  echo "Target services: $DEPLOY_ARGS"
  echo "========================================="
fi

cd /opt/artha

# 1. Authenticate with GHCR
echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin

# Helper function to check if a service should be deployed
should_deploy() {
  local SERVICE=$1
  if [ "$SHOULD_DEPLOY_ALL" = "true" ] || [[ " $DEPLOY_ARGS " =~ " $SERVICE " ]]; then
    return 0 # True
  fi
  return 1 # False
}

# 2. Pre-pull images only for the target services
echo "Pre-pulling target images..."
SERVICES=(
  "service-registry"
  "api-gateway"
  "user-service"
  "budget-service"
  "expense-service"
  "notification-service"
  "analysis-service"
)

# Initialize pulled flags
for SERVICE in "${SERVICES[@]}"; do
  eval "PULLED_${SERVICE//-/_}=false"
done

for SERVICE in "${SERVICES[@]}"; do
  if should_deploy "$SERVICE"; then
    IMAGE_NAME="ghcr.io/kashyap-1811/$SERVICE"
    echo "Pulling $IMAGE_NAME:$IMAGE_TAG..."
    if docker pull "$IMAGE_NAME:$IMAGE_TAG"; then
      eval "PULLED_${SERVICE//-/_}=true"
      echo "Successfully pulled $SERVICE with tag $IMAGE_TAG"
    else
      echo "Warning: Failed to pre-pull $SERVICE with tag $IMAGE_TAG. Falling back to latest."
      eval "PULLED_${SERVICE//-/_}=false"
      docker pull "$IMAGE_NAME:latest" || echo "Warning: Failed to pull latest for $SERVICE too."
    fi
  fi
done

# Helper function to dynamically resolve the image tag for a service
get_service_tag() {
  local SERVICE=$1
  local SERVICE_VAR="PULLED_${SERVICE//-/_}"
  if [ "${!SERVICE_VAR}" = "true" ]; then
    echo "$IMAGE_TAG"
  else
    echo "latest"
  fi
}

ENV_FILE=""
if [ -f ".env.production" ]; then
  ENV_FILE=".env.production"
elif [ -f ".env" ]; then
  ENV_FILE=".env"
fi

dcompose() {
  if [ -n "$ENV_FILE" ]; then
    docker compose --env-file "$ENV_FILE" "$@"
  else
    docker compose "$@"
  fi
}

wait_for_health() {
  local CONTAINER_NAME=$1
  local TIMEOUT=${2:-120}
  local ELAPSED=0
  echo "Waiting for $CONTAINER_NAME to become healthy..."
  while [ $ELAPSED -lt $TIMEOUT ]; do
    local STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || true)
    local STATE=$(docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || true)

    if [ "$STATUS" == "healthy" ]; then
      echo "$CONTAINER_NAME is healthy!"
      return 0
    fi

    if [ "$STATE" == "exited" ]; then
      echo "Error: $CONTAINER_NAME has exited."
      return 1
    fi

    sleep 2
    ELAPSED=$((ELAPSED + 2))
  done
  echo "Error: Timed out waiting for $CONTAINER_NAME to become healthy."
  return 1
}

deploy_zero_downtime() {
  local SERVICE_NAME=$1
  local IMAGE_TAG=$2
  export IMAGE_TAG
  local CONTAINER_NAME="artha-$SERVICE_NAME"
  local TEMP_SERVICE_NAME="${SERVICE_NAME}-temp"
  local TEMP_CONTAINER_NAME="${CONTAINER_NAME}-temp"

  echo "-----------------------------------------"
  echo "Deploying $SERVICE_NAME with tag: $IMAGE_TAG (zero-downtime)..."
  echo "-----------------------------------------"

  dcompose rm -f -s "$TEMP_SERVICE_NAME" 2>/dev/null || true
  docker rm -f "$TEMP_CONTAINER_NAME" 2>/dev/null || true

  echo "Starting temp container via Docker Compose..."
  if ! dcompose up -d --no-deps "$TEMP_SERVICE_NAME"; then
    echo "Error: Failed to start temp container for $SERVICE_NAME"
    return 1
  fi

  if ! wait_for_health "$TEMP_CONTAINER_NAME" 120; then
    echo "Error: Temp container $TEMP_CONTAINER_NAME failed healthcheck. Logs:"
    docker logs "$TEMP_CONTAINER_NAME"
    dcompose stop "$TEMP_SERVICE_NAME" 2>/dev/null || true
    dcompose rm -f "$TEMP_SERVICE_NAME" 2>/dev/null || true
    return 1
  fi

  echo "Recreating main $CONTAINER_NAME container via Docker Compose..."
  if ! dcompose up -d --no-deps "$SERVICE_NAME"; then
    echo "Error: Failed to recreate main container for $SERVICE_NAME"
    dcompose stop "$TEMP_SERVICE_NAME" 2>/dev/null || true
    dcompose rm -f "$TEMP_SERVICE_NAME" 2>/dev/null || true
    return 1
  fi

  if ! wait_for_health "$CONTAINER_NAME" 120; then
    echo "Error: Main container $CONTAINER_NAME failed healthcheck. Logs:"
    docker logs "$CONTAINER_NAME"
    return 1
  fi

  echo "Stopping and removing temp container..."
  dcompose stop "$TEMP_SERVICE_NAME" 2>/dev/null || true
  dcompose rm -f "$TEMP_SERVICE_NAME" 2>/dev/null || true
  
  echo "$SERVICE_NAME deployed successfully with zero downtime!"
  return 0
}

cleanup_rollback_tags() {
  echo "Cleaning up temporary rollback tags..."
  for SERVICE in "${SERVICES[@]}"; do
    local HAD_PREVIOUS_VAR="HAD_PREVIOUS_${SERVICE//-/_}"
    if [ "${!HAD_PREVIOUS_VAR}" = "true" ]; then
      local IMAGE_NAME="ghcr.io/kashyap-1811/$SERVICE"
      docker rmi "$IMAGE_NAME:rollback-$SERVICE" 2>/dev/null || true
    fi
  done
}

rollback_services() {
  echo "========================================="
  echo "CRITICAL: Deployment failed! Initiating rollback..."
  echo "========================================="

  # Roll back services in REVERSE order of deployment
  local REVERSE_SERVICES=(
    "analysis-service"
    "notification-service"
    "expense-service"
    "budget-service"
    "api-gateway"
    "user-service"
    "service-registry"
  )

  for SERVICE in "${REVERSE_SERVICES[@]}"; do
    local DEPLOYED_VAR="DEPLOYED_${SERVICE//-/_}"
    if [ "${!DEPLOYED_VAR}" = "true" ]; then
      local HAD_PREVIOUS_VAR="HAD_PREVIOUS_${SERVICE//-/_}"
      local IMAGE_NAME="ghcr.io/kashyap-1811/$SERVICE"
      
      if [ "${!HAD_PREVIOUS_VAR}" = "true" ]; then
        echo "Rolling back $SERVICE to previous version (Tag: rollback-$SERVICE)..."
        if [ "$SERVICE" = "service-registry" ]; then
          (
            IMAGE_TAG="rollback-$SERVICE"
            export IMAGE_TAG
            dcompose up -d --no-deps "$SERVICE"
          )
          wait_for_health artha-service-registry 120 || echo "Warning: Failed to make service-registry healthy during rollback"
        else
          if ! deploy_zero_downtime "$SERVICE" "rollback-$SERVICE"; then
            echo "Warning: Zero-downtime rollback failed for $SERVICE. Falling back to direct recreate..."
            (
              IMAGE_TAG="rollback-$SERVICE"
              export IMAGE_TAG
              dcompose up -d --no-deps "$SERVICE"
            )
            wait_for_health "artha-$SERVICE" 120 || echo "Warning: Failed to make $SERVICE healthy during fallback rollback"
          fi
        fi
      else
        echo "$SERVICE had no previous running container. Stopping and removing..."
        dcompose stop "$SERVICE" 2>/dev/null || true
        dcompose rm -f "$SERVICE" 2>/dev/null || true
      fi
    fi
  done

  cleanup_rollback_tags

  echo "========================================="
  echo "Rollback completed."
  echo "========================================="
}

# Initialize deployed and rollback tracker flags
for SERVICE in "${SERVICES[@]}"; do
  eval "DEPLOYED_${SERVICE//-/_}=false"
  eval "OLD_IMAGE_${SERVICE//-/_}=\"\""
  eval "HAD_PREVIOUS_${SERVICE//-/_}=false"
done

# Back up current running images/tags and create rollback tags
echo "Backing up current service states..."
for SERVICE in "${SERVICES[@]}"; do
  if should_deploy "$SERVICE"; then
    CONTAINER_NAME="artha-$SERVICE"
    OLD_IMAGE_ID=$(docker inspect --format='{{.Image}}' "$CONTAINER_NAME" 2>/dev/null || true)
    if [ -n "$OLD_IMAGE_ID" ]; then
      eval "OLD_IMAGE_${SERVICE//-/_}=\"$OLD_IMAGE_ID\""
      eval "HAD_PREVIOUS_${SERVICE//-/_}=true"
      IMAGE_NAME="ghcr.io/kashyap-1811/$SERVICE"
      echo "Backing up $SERVICE (Image: $OLD_IMAGE_ID) as $IMAGE_NAME:rollback-$SERVICE..."
      docker tag "$OLD_IMAGE_ID" "$IMAGE_NAME:rollback-$SERVICE" || echo "Warning: Failed to tag rollback image for $SERVICE"
    else
      echo "$SERVICE is not currently running. No rollback backup needed."
    fi
  fi
done

DEPLOY_FAILED=false

# Helper to mark a service as successfully deployed in this run
mark_deployed() {
  local SERVICE=$1
  eval "DEPLOYED_${SERVICE//-/_}=true"
}

# 3. Sequentially check and deploy each service
if should_deploy "service-registry"; then
  echo "Deploying service-registry..."
  IMAGE_TAG=$(get_service_tag service-registry)
  export IMAGE_TAG
  if dcompose up -d --no-deps service-registry && wait_for_health artha-service-registry 120; then
    mark_deployed "service-registry"
  else
    echo "Error: Failed to deploy service-registry"
    DEPLOY_FAILED=true
  fi
fi

if [ "$DEPLOY_FAILED" = "false" ] && should_deploy "user-service"; then
  if deploy_zero_downtime user-service "$(get_service_tag user-service)"; then
    mark_deployed "user-service"
  else
    echo "Error: Failed to deploy user-service"
    DEPLOY_FAILED=true
  fi
fi

if [ "$DEPLOY_FAILED" = "false" ] && should_deploy "api-gateway"; then
  if deploy_zero_downtime api-gateway "$(get_service_tag api-gateway)"; then
    mark_deployed "api-gateway"
  else
    echo "Error: Failed to deploy api-gateway"
    DEPLOY_FAILED=true
  fi
fi

if [ "$DEPLOY_FAILED" = "false" ] && should_deploy "budget-service"; then
  if deploy_zero_downtime budget-service "$(get_service_tag budget-service)"; then
    mark_deployed "budget-service"
  else
    echo "Error: Failed to deploy budget-service"
    DEPLOY_FAILED=true
  fi
fi

if [ "$DEPLOY_FAILED" = "false" ] && should_deploy "expense-service"; then
  if deploy_zero_downtime expense-service "$(get_service_tag expense-service)"; then
    mark_deployed "expense-service"
  else
    echo "Error: Failed to deploy expense-service"
    DEPLOY_FAILED=true
  fi
fi

if [ "$DEPLOY_FAILED" = "false" ] && should_deploy "notification-service"; then
  if deploy_zero_downtime notification-service "$(get_service_tag notification-service)"; then
    mark_deployed "notification-service"
  else
    echo "Error: Failed to deploy notification-service"
    DEPLOY_FAILED=true
  fi
fi

if [ "$DEPLOY_FAILED" = "false" ] && should_deploy "analysis-service"; then
  if deploy_zero_downtime analysis-service "$(get_service_tag analysis-service)"; then
    mark_deployed "analysis-service"
  else
    echo "Error: Failed to deploy analysis-service"
    DEPLOY_FAILED=true
  fi
fi

# Deploy nginx reload if config changes or it is part of full deploy
if [ "$DEPLOY_FAILED" = "false" ]; then
  if [ "$SHOULD_DEPLOY_ALL" = "true" ] || [[ " $DEPLOY_ARGS " =~ " nginx " ]]; then
    echo "Deploying/Reloading nginx..."
    if [ -d "/opt/artha/nginx/nginx.conf" ]; then
      rm -rf /opt/artha/nginx/nginx.conf
    fi
    if [ -d "/opt/artha/nginx/nginx.conf.production" ]; then
      rm -rf /opt/artha/nginx/nginx.conf.production
    fi

    if docker ps --format '{{.Names}}' | grep -q "^artha-nginx$"; then
      echo "Reloading nginx configuration..."
      docker exec artha-nginx nginx -s reload
    else
      echo "Starting nginx..."
      dcompose up -d --no-deps nginx
    fi
  fi
fi

# 4. Cleanup
if [ "$DEPLOY_FAILED" = "true" ]; then
  rollback_services
  exit 1
else
  cleanup_rollback_tags
  echo "Pruning unused Docker images..."
  docker image prune -a -f --filter "until=24h"
  echo "========================================="
  echo "Deployment completed successfully!"
  echo "========================================="
fi
