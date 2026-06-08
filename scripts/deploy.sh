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

for SERVICE in "${SERVICES[@]}"; do
  if should_deploy "$SERVICE"; then
    IMAGE_NAME="ghcr.io/kashyap-1811/$SERVICE"
    echo "Pulling $IMAGE_NAME:$IMAGE_TAG..."
    docker pull "$IMAGE_NAME:$IMAGE_TAG" || echo "Warning: Failed to pre-pull $SERVICE, will try to build/pull during container startup."
  fi
done

# 3. Deploy service-by-service conditionally
export IMAGE_TAG

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

deploy_zero_downtime() {
  SERVICE_NAME=$1
  CONTAINER_NAME="artha-$SERVICE_NAME"
  TEMP_SERVICE_NAME="${SERVICE_NAME}-temp"
  TEMP_CONTAINER_NAME="${CONTAINER_NAME}-temp"

  echo "-----------------------------------------"
  echo "Deploying $SERVICE_NAME with zero-downtime..."
  echo "-----------------------------------------"

  dcompose rm -f -s "$TEMP_SERVICE_NAME" 2>/dev/null || true
  docker rm -f "$TEMP_CONTAINER_NAME" 2>/dev/null || true

  echo "Starting temp container via Docker Compose..."
  dcompose up -d --no-deps "$TEMP_SERVICE_NAME"

  echo "Waiting for temp $SERVICE_NAME to become healthy..."
  until [ "$(docker inspect --format='{{.State.Health.Status}}' "$TEMP_CONTAINER_NAME" 2>/dev/null)" == "healthy" ]; do
    if [ "$(docker inspect --format='{{.State.Status}}' "$TEMP_CONTAINER_NAME" 2>/dev/null)" == "exited" ]; then
      echo "Error: Temp container $TEMP_CONTAINER_NAME exited unexpectedly. Logs:"
      docker logs "$TEMP_CONTAINER_NAME"
      exit 1
    fi
    sleep 2
  done
  echo "Temp $SERVICE_NAME is healthy!"

  echo "Recreating main $CONTAINER_NAME container via Docker Compose..."
  dcompose up -d --no-deps "$SERVICE_NAME"

  echo "Waiting for new main $CONTAINER_NAME to become healthy..."
  until [ "$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null)" == "healthy" ]; do
    sleep 2
  done
  echo "New main $CONTAINER_NAME is healthy!"

  echo "Stopping and removing temp container..."
  dcompose stop "$TEMP_SERVICE_NAME"
  dcompose rm -f "$TEMP_SERVICE_NAME"
  
  echo "$SERVICE_NAME deployed successfully with zero downtime!"
}

# Sequentially check and deploy each service
if should_deploy "service-registry"; then
  echo "Deploying service-registry..."
  dcompose up -d --no-deps service-registry
  echo "Waiting for service-registry healthcheck..."
  until [ "$(docker inspect --format='{{.State.Health.Status}}' artha-service-registry)" == "healthy" ]; do
    sleep 2
  done
fi

if should_deploy "user-service"; then
  deploy_zero_downtime user-service
fi

if should_deploy "api-gateway"; then
  deploy_zero_downtime api-gateway
fi

if should_deploy "budget-service"; then
  deploy_zero_downtime budget-service
fi

if should_deploy "expense-service"; then
  deploy_zero_downtime expense-service
fi

if should_deploy "notification-service"; then
  deploy_zero_downtime notification-service
fi

if should_deploy "analysis-service"; then
  deploy_zero_downtime analysis-service
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
