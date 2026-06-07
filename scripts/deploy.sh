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
  OLD_CONTAINER_NAME="${CONTAINER_NAME}-old"

  echo "-----------------------------------------"
  echo "Deploying $SERVICE_NAME with zero-downtime..."
  echo "-----------------------------------------"

  # 1. Rename existing container if it is running
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Renaming existing container to ${OLD_CONTAINER_NAME}..."
    docker rm -f "$OLD_CONTAINER_NAME" 2>/dev/null || true
    docker rename "$CONTAINER_NAME" "$OLD_CONTAINER_NAME"
  fi

  # 2. Start new container with new image tag
  dcompose up -d --no-deps "$SERVICE_NAME"

  # 3. Wait for new container to become healthy
  echo "Waiting for new $SERVICE_NAME to become healthy..."
  until [ "$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null)" == "healthy" ]; do
    sleep 2
  done
  echo "New $SERVICE_NAME is healthy!"

  # 4. Stop and remove the old container
  if docker ps -a --format '{{.Names}}' | grep -q "^${OLD_CONTAINER_NAME}$"; then
    echo "Stopping and removing old $SERVICE_NAME container..."
    docker stop "$OLD_CONTAINER_NAME"
    docker rm "$OLD_CONTAINER_NAME"
  fi
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
