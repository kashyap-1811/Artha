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

# Global list of successfully deployed services in this run (for transactional rollback)
DEPLOYED_SERVICES=()

trigger_global_rollback() {
  if [ ${#DEPLOYED_SERVICES[@]} -eq 0 ]; then
    echo "No previously deployed services to roll back."
    return
  fi

  echo "========================================="
  echo "GLOBAL TRANSACTION-STYLE ROLLBACK INITIATED!"
  echo "Rolling back all successfully deployed services in this batch..."
  echo "========================================="

  # Loop backwards through DEPLOYED_SERVICES to roll back in reverse order
  for (( i=${#DEPLOYED_SERVICES[@]}-1; i>=0; i-- )); do
    local SERVICE="${DEPLOYED_SERVICES[$i]}"
    local VAR_NAME="PREV_TAG_${SERVICE//-/_}"
    local PREV_TAG="${!VAR_NAME}"
    local CONTAINER_NAME="artha-$SERVICE"
    
    echo "Rolling back $SERVICE to previous stable tag: $PREV_TAG..."
    (
      IMAGE_TAG=$PREV_TAG
      export IMAGE_TAG
      dcompose up -d --no-deps "$SERVICE"
    )
    
    echo "Waiting for rolled-back $SERVICE to become healthy..."
    until [ "$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null)" == "healthy" ]; do
      sleep 2
    done
    echo "$SERVICE rollback successful."
  done
  echo "========================================="
  echo "GLOBAL ROLLBACK COMPLETED SUCCESSFULLY!"
  echo "========================================="
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

  # Get the current running tag and image ID of the main container before touching it (for rollback)
  local PREV_IMAGE=$(docker inspect --format='{{.Config.Image}}' "$CONTAINER_NAME" 2>/dev/null || true)
  local PREV_IMAGE_ID=$(docker inspect --format='{{.Image}}' "$CONTAINER_NAME" 2>/dev/null || true)
  local PREV_TAG=""
  if [ -n "$PREV_IMAGE" ]; then
    PREV_TAG=$(echo "$PREV_IMAGE" | awk -F':' '{print $NF}')
  fi
  if [ -z "$PREV_TAG" ]; then
    PREV_TAG="latest"
  fi
  echo "Previous running tag for $SERVICE_NAME was: $PREV_TAG"
  eval "PREV_TAG_${SERVICE_NAME//-/_}=\"$PREV_TAG\""

  # Clean up any leftover temp containers
  dcompose rm -f -s "$TEMP_SERVICE_NAME" 2>/dev/null || true
  docker rm -f "$TEMP_CONTAINER_NAME" 2>/dev/null || true

  # 1. Start temp container
  echo "Starting temp container via Docker Compose..."
  dcompose up -d --no-deps "$TEMP_SERVICE_NAME"

  # 2. Poll temp container health with a timeout (120 seconds)
  echo "Waiting for temp $SERVICE_NAME to become healthy..."
  local TIMEOUT=120
  local ELAPSED=0
  local TEMP_HEALTHY=false

  while [ $ELAPSED -lt $TIMEOUT ]; do
    local STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$TEMP_CONTAINER_NAME" 2>/dev/null || true)
    local STATE=$(docker inspect --format='{{.State.Status}}' "$TEMP_CONTAINER_NAME" 2>/dev/null || true)
    
    if [ "$STATUS" == "healthy" ]; then
      TEMP_HEALTHY=true
      break
    elif [ "$STATE" == "exited" ]; then
      echo "Error: Temp container $TEMP_CONTAINER_NAME exited unexpectedly."
      break
    fi
    
    sleep 2
    ELAPSED=$((ELAPSED + 2))
  done

  if [ "$TEMP_HEALTHY" != "true" ]; then
    echo "========================================="
    echo "ERROR: New version of $SERVICE_NAME failed health checks!"
    echo "Cleaning up temp container..."
    dcompose stop "$TEMP_SERVICE_NAME" 2>/dev/null || true
    dcompose rm -f "$TEMP_SERVICE_NAME" 2>/dev/null || true
    echo "Old version remains running on production."
    echo "========================================="
    trigger_global_rollback
    exit 1
  fi
  echo "Temp $SERVICE_NAME is healthy!"

  # 3. Recreate main container
  echo "Recreating main $CONTAINER_NAME container via Docker Compose..."
  dcompose up -d --no-deps "$SERVICE_NAME"

  # 4. Poll main container health with a timeout
  echo "Waiting for new main $CONTAINER_NAME to become healthy..."
  ELAPSED=0
  local MAIN_HEALTHY=false

  while [ $ELAPSED -lt $TIMEOUT ]; do
    local STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || true)
    local STATE=$(docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || true)
    
    if [ "$STATUS" == "healthy" ]; then
      MAIN_HEALTHY=true
      break
    elif [ "$STATE" == "exited" ]; then
      echo "Error: Main container $CONTAINER_NAME exited unexpectedly."
      break
    fi
    
    sleep 2
    ELAPSED=$((ELAPSED + 2))
  done

  if [ "$MAIN_HEALTHY" != "true" ]; then
    echo "========================================="
    echo "ERROR: Main container $CONTAINER_NAME failed to become healthy!"
    echo "TRIGGERING AUTOMATED ROLLBACK TO PREVIOUS TAG: $PREV_TAG..."
    echo "========================================="
    
    # Rollback main container
    IMAGE_TAG=$PREV_TAG dcompose up -d --no-deps "$SERVICE_NAME"
    
    # Wait for rolled-back container to be healthy
    echo "Waiting for rolled-back main container to become healthy..."
    until [ "$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null)" == "healthy" ]; do
      sleep 2
    done
    echo "Rollback successful! Previous stable version is running."
    
    # Cleanup temp container
    dcompose stop "$TEMP_SERVICE_NAME" 2>/dev/null || true
    dcompose rm -f "$TEMP_SERVICE_NAME" 2>/dev/null || true
    
    trigger_global_rollback
    exit 1
  fi
  echo "New main $CONTAINER_NAME is healthy!"

  # 5. Clean up temp container
  echo "Stopping and removing temp container..."
  dcompose stop "$TEMP_SERVICE_NAME"
  dcompose rm -f "$TEMP_SERVICE_NAME"
  
  # Register in successfully deployed list only if version actually changed
  local NEW_IMAGE_ID=$(docker inspect --format='{{.Image}}' "$CONTAINER_NAME" 2>/dev/null || true)
  if [ -n "$PREV_IMAGE_ID" ] && [ "$PREV_IMAGE_ID" != "$NEW_IMAGE_ID" ]; then
    DEPLOYED_SERVICES+=("$SERVICE_NAME")
    echo "$SERVICE_NAME version actually changed; registered for rollback."
  else
    echo "$SERVICE_NAME version did not change; skipping rollback registration."
  fi
  echo "$SERVICE_NAME deployed successfully with zero downtime!"
}

# Sequentially check and deploy each service
if should_deploy "service-registry"; then
  echo "Deploying service-registry..."
  
  # Get the current running tag and image ID of service-registry (for rollback)
  PREV_REG_IMAGE=$(docker inspect --format='{{.Config.Image}}' artha-service-registry 2>/dev/null || true)
  PREV_REG_IMAGE_ID=$(docker inspect --format='{{.Image}}' artha-service-registry 2>/dev/null || true)
  PREV_REG_TAG=""
  if [ -n "$PREV_REG_IMAGE" ]; then
    PREV_REG_TAG=$(echo "$PREV_REG_IMAGE" | awk -F':' '{print $NF}')
  fi
  if [ -z "$PREV_REG_TAG" ]; then
    PREV_REG_TAG="latest"
  fi
  echo "Previous running tag for service-registry was: $PREV_REG_TAG"

  TARGET_REG_TAG=$(get_service_tag service-registry)
  (
    IMAGE_TAG=$TARGET_REG_TAG
    export IMAGE_TAG
    dcompose up -d --no-deps service-registry
  )

  echo "Waiting for service-registry healthcheck..."
  TIMEOUT=120
  ELAPSED=0
  REG_HEALTHY=false

  while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' artha-service-registry 2>/dev/null || true)
    STATE=$(docker inspect --format='{{.State.Status}}' artha-service-registry 2>/dev/null || true)
    
    if [ "$STATUS" == "healthy" ]; then
      REG_HEALTHY=true
      break
    elif [ "$STATE" == "exited" ]; then
      echo "Error: service-registry container exited unexpectedly."
      break
    fi
    
    sleep 2
    ELAPSED=$((ELAPSED + 2))
  done

  if [ "$REG_HEALTHY" != "true" ]; then
    echo "========================================="
    echo "ERROR: service-registry failed to become healthy!"
    echo "TRIGGERING AUTOMATED ROLLBACK TO PREVIOUS TAG: $PREV_REG_TAG..."
    echo "========================================="
    
    (
      IMAGE_TAG=$PREV_REG_TAG
      export IMAGE_TAG
      dcompose up -d --no-deps service-registry
    )
    
    until [ "$(docker inspect --format='{{.State.Health.Status}}' artha-service-registry)" == "healthy" ]; do
      sleep 2
    done
    echo "Rollback successful for service-registry!"
    trigger_global_rollback
    exit 1
  fi

  # Register in successfully deployed list only if version actually changed
  NEW_REG_IMAGE_ID=$(docker inspect --format='{{.Image}}' artha-service-registry 2>/dev/null || true)
  if [ -n "$PREV_REG_IMAGE_ID" ] && [ "$PREV_REG_IMAGE_ID" != "$NEW_REG_IMAGE_ID" ]; then
    eval "PREV_TAG_service_registry=\"$PREV_REG_TAG\""
    DEPLOYED_SERVICES+=("service-registry")
    echo "service-registry version actually changed; registered for rollback."
  else
    echo "service-registry version did not change; skipping rollback registration."
  fi
  echo "service-registry deployed successfully!"
fi

if should_deploy "user-service"; then
  deploy_zero_downtime user-service $(get_service_tag user-service)
fi

if should_deploy "api-gateway"; then
  deploy_zero_downtime api-gateway $(get_service_tag api-gateway)
fi

if should_deploy "budget-service"; then
  deploy_zero_downtime budget-service $(get_service_tag budget-service)
fi

if should_deploy "expense-service"; then
  deploy_zero_downtime expense-service $(get_service_tag expense-service)
fi

if should_deploy "notification-service"; then
  deploy_zero_downtime notification-service $(get_service_tag notification-service)
fi

if should_deploy "analysis-service"; then
  deploy_zero_downtime analysis-service $(get_service_tag analysis-service)
fi

# Deploy nginx reload if config changes or it is part of full deploy
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

# 4. Cleanup old unused images
echo "Pruning unused Docker images..."
docker image prune -f

echo "========================================="
echo "Deployment completed successfully!"
echo "========================================="
