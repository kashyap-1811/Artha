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

echo "Deploying service-registry..."
dcompose up -d --no-deps service-registry
echo "Waiting for service-registry healthcheck..."
until [ "$(docker inspect --format='{{.State.Health.Status}}' artha-service-registry)" == "healthy" ]; do
  sleep 2
done

echo "Deploying user-service..."
dcompose up -d --no-deps user-service
echo "Waiting for user-service healthcheck..."
until [ "$(docker inspect --format='{{.State.Health.Status}}' artha-user-service)" == "healthy" ]; do
  sleep 2
done

echo "Deploying api-gateway..."
dcompose up -d --no-deps api-gateway
echo "Waiting for api-gateway healthcheck..."
until [ "$(docker inspect --format='{{.State.Health.Status}}' artha-api-gateway)" == "healthy" ]; do
  sleep 2
done

echo "Deploying other backend microservices..."
dcompose up -d --no-deps budget-service expense-service notification-service analysis-service

# Restart Nginx with zero-downtime and verify configuration
echo "Deploying nginx..."
if [ -d "/opt/artha/nginx/nginx.conf" ]; then
  echo "Removing invalid directory-mount fallback at /opt/artha/nginx/nginx.conf..."
  rm -rf /opt/artha/nginx/nginx.conf
fi
if [ -d "/opt/artha/nginx/nginx.conf.production" ]; then
  echo "Removing invalid directory-mount fallback at /opt/artha/nginx/nginx.conf.production..."
  rm -rf /opt/artha/nginx/nginx.conf.production
fi
dcompose up -d --no-deps nginx

# 4. Cleanup old unused images
echo "Pruning unused Docker images..."
docker image prune -f

echo "========================================="
echo "Deployment completed successfully!"
echo "========================================="
