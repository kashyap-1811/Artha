#!/bin/sh

# This script replaces the placeholder in the built Javascript files with the actual environment variable
# assigned at runtime. This allows for a single Docker image to be portable across different IPs.

set -e

echo "Starting environment synchronization..."

# Default value if VITE_API_BASE_URL is not set
if [ -z "$VITE_API_BASE_URL" ]; then
  VITE_API_BASE_URL="http://localhost:8080"
fi

echo "Injecting API URL: $VITE_API_BASE_URL"

# Find all JS files in the index directory and replace the placeholder
find /usr/share/nginx/html -name "*.js" -exec sed -i "s|PLACEHOLDER_VITE_API_BASE_URL|$VITE_API_BASE_URL|g" {} +

echo "Environment synchronization complete."

# Execute the original CMD (Nginx)
exec "$@"
