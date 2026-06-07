#!/bin/bash
set -e

IMAGE_TAG=$1
if [ -z "$IMAGE_TAG" ]; then
  echo "Error: IMAGE_TAG is required."
  exit 1
fi

echo "========================================="
echo "Starting deployment for tag: $IMAGE_TAG"
echo "========================================="

cd /opt/artha

# 1. Authenticate with GHCR
echo "$GHCR_PAT" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin

# 2. Pre-pull all images to minimize container downtime during download
echo "Pre-pulling images..."
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
  IMAGE_NAME="ghcr.io/kashyap-1811/$SERVICE"
  echo "Pulling $IMAGE_NAME:$IMAGE_TAG..."
  docker pull "$IMAGE_NAME:$IMAGE_TAG"
done

# 3. Deploy service-by-service in dependency order
export IMAGE_TAG

# Detect environment file
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

  # 1. Clean up any leftover temp container
  dcompose rm -f -s "$TEMP_SERVICE_NAME" 2>/dev/null || true
  docker rm -f "$TEMP_CONTAINER_NAME" 2>/dev/null || true

  # 2. Start the temp container with the new image
  echo "Starting temp container via Docker Compose..."
  dcompose up -d --no-deps "$TEMP_SERVICE_NAME"

  # 3. Wait for temp container to become healthy
  echo "Waiting for temp $SERVICE_NAME to become healthy..."
  until [ "$(docker inspect --format='{{.State.Health.Status}}' "$TEMP_CONTAINER_NAME" 2>/dev/null)" == "healthy" ]; do
    # Check if the container crashed to avoid infinite loop
    if [ "$(docker inspect --format='{{.State.Status}}' "$TEMP_CONTAINER_NAME" 2>/dev/null)" == "exited" ]; then
      echo "Error: Temp container $TEMP_CONTAINER_NAME exited unexpectedly. Logs:"
      docker logs "$TEMP_CONTAINER_NAME"
      exit 1
    fi
    sleep 2
  done
  echo "Temp $SERVICE_NAME is healthy!"

  # 4. Recreate the main container using docker compose
  echo "Recreating main $CONTAINER_NAME container via Docker Compose..."
  dcompose up -d --no-deps "$SERVICE_NAME"

  # 5. Wait for the new main container to become healthy
  echo "Waiting for new main $CONTAINER_NAME to become healthy..."
  until [ "$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null)" == "healthy" ]; do
    sleep 2
  done
  echo "New main $CONTAINER_NAME is healthy!"

  # 6. Stop and remove the temp container
  echo "Stopping and removing temp container..."
  dcompose stop "$TEMP_SERVICE_NAME"
  dcompose rm -f "$TEMP_SERVICE_NAME"
  
  echo "$SERVICE_NAME deployed successfully with zero downtime!"
}

echo "Deploying service-registry..."
dcompose up -d --no-deps service-registry
echo "Waiting for service-registry healthcheck..."
until [ "$(docker inspect --format='{{.State.Health.Status}}' artha-service-registry)" == "healthy" ]; do
  sleep 2
done

# Deploy microservices in dependency order with zero-downtime rolling updates
deploy_zero_downtime user-service
deploy_zero_downtime api-gateway
deploy_zero_downtime budget-service
deploy_zero_downtime expense-service
deploy_zero_downtime notification-service
deploy_zero_downtime analysis-service

# Deploy nginx with zero-downtime config reload if running
echo "Deploying nginx..."
if [ -d "/opt/artha/nginx/nginx.conf" ]; then
  echo "Removing invalid directory-mount fallback at /opt/artha/nginx/nginx.conf..."
  rm -rf /opt/artha/nginx/nginx.conf
fi
if [ -d "/opt/artha/nginx/nginx.conf.production" ]; then
  echo "Removing invalid directory-mount fallback at /opt/artha/nginx/nginx.conf.production..."
  rm -rf /opt/artha/nginx/nginx.conf.production
fi

if docker ps --format '{{.Names}}' | grep -q "^artha-nginx$"; then
  echo "Reloading nginx configuration..."
  docker exec artha-nginx nginx -s reload
else
  echo "Starting nginx..."
  dcompose up -d --no-deps nginx
fi

# 4. Cleanup old unused images
echo "Pruning unused Docker images..."
docker image prune -f

echo "========================================="
echo "Deployment completed successfully!"
echo "========================================="
