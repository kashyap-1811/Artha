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
  PORT=$2
  HEALTH_PATH=$3
  VOLUME_IN_CONTAINER=$4  # optional, e.g. "/app/certs"

  CONTAINER_NAME="artha-$SERVICE_NAME"
  TEMP_CONTAINER_NAME="${CONTAINER_NAME}-temp"
  IMAGE_NAME="ghcr.io/kashyap-1811/$SERVICE_NAME:$IMAGE_TAG"

  echo "-----------------------------------------"
  echo "Deploying $SERVICE_NAME with zero-downtime..."
  echo "-----------------------------------------"

  # 1. Clean up any existing temp container
  docker rm -f "$TEMP_CONTAINER_NAME" 2>/dev/null || true

  # 2. Start the temp container with the new image
  VOLUME_OPT=""
  if [ -n "$VOLUME_IN_CONTAINER" ]; then
    VOLUME_OPT="-v /opt/artha/certs:${VOLUME_IN_CONTAINER}:ro"
  fi

  echo "Starting temp container $TEMP_CONTAINER_NAME..."
  docker run -d \
    --name "$TEMP_CONTAINER_NAME" \
    --network artha_artha-net \
    --network-alias "$SERVICE_NAME" \
    --env-file "$ENV_FILE" \
    $VOLUME_OPT \
    "$IMAGE_NAME"

  # 3. Wait for temp container to become healthy
  echo "Waiting for temp $SERVICE_NAME to become healthy..."
  until
    if [ "$SERVICE_NAME" == "notification-service" ]; then
      docker exec "$TEMP_CONTAINER_NAME" wget --spider -q http://localhost:${PORT}${HEALTH_PATH}
    elif [ "$SERVICE_NAME" == "analysis-service" ]; then
      docker exec "$TEMP_CONTAINER_NAME" wget --spider -q http://localhost:${PORT}${HEALTH_PATH}
    else
      # Spring Boot services
      docker exec "$TEMP_CONTAINER_NAME" curl -s http://localhost:${PORT}${HEALTH_PATH} | grep -q "UP"
    fi
  do
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
  docker stop "$TEMP_CONTAINER_NAME"
  docker rm "$TEMP_CONTAINER_NAME"
  
  echo "$SERVICE_NAME deployed successfully with zero downtime!"
}

echo "Deploying service-registry..."
dcompose up -d --no-deps service-registry
echo "Waiting for service-registry healthcheck..."
until [ "$(docker inspect --format='{{.State.Health.Status}}' artha-service-registry)" == "healthy" ]; do
  sleep 2
done

# Deploy microservices in dependency order with zero-downtime rolling updates
deploy_zero_downtime user-service 8083 /actuator/health /app/certs
deploy_zero_downtime api-gateway 8080 /actuator/health
deploy_zero_downtime budget-service 8081 /actuator/health /app/certs
deploy_zero_downtime expense-service 8082 /actuator/health /app/certs
deploy_zero_downtime notification-service 8086 /health /app/src/certs
deploy_zero_downtime analysis-service 8084 /docs /app/app/certs

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
