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

echo "Deploying service-registry..."
docker compose up -d --no-deps service-registry
echo "Waiting for service-registry healthcheck..."
until [ "$(docker inspect --format='{{.State.Health.Status}}' artha-service-registry)" == "healthy" ]; do
  sleep 2
done

echo "Deploying user-service..."
docker compose up -d --no-deps user-service
echo "Waiting for user-service healthcheck..."
until [ "$(docker inspect --format='{{.State.Health.Status}}' artha-user-service)" == "healthy" ]; do
  sleep 2
done

echo "Deploying api-gateway..."
docker compose up -d --no-deps api-gateway
echo "Waiting for api-gateway healthcheck..."
until [ "$(docker inspect --format='{{.State.Health.Status}}' artha-api-gateway)" == "healthy" ]; do
  sleep 2
done

echo "Deploying other backend microservices..."
docker compose up -d --no-deps budget-service expense-service notification-service analysis-service

# Restart Nginx to verify configuration
echo "Deploying nginx..."
docker compose up -d --no-deps nginx

# 4. Cleanup old unused images
echo "Pruning unused Docker images..."
docker image prune -f

echo "========================================="
echo "Deployment completed successfully!"
echo "========================================="
