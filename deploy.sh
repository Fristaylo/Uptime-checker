#!/bin/bash

# --- Configuration ---
# Time to wait in seconds after the new container is up before switching traffic.
# In a real-world scenario, this should be replaced with a proper health check.
WAIT_TIME=120

# --- Script Logic ---

# Determine the current active environment
if [ -f .env ]; then
  source .env
fi

if [ "$UPSTREAM_APP" == "app-green" ]; then
  ACTIVE_COLOR="green"
  INACTIVE_COLOR="blue"
else
  # Default to blue if not set or set to blue
  ACTIVE_COLOR="blue"
  INACTIVE_COLOR="green"
fi

echo "Current active environment: $ACTIVE_COLOR"
echo "Deploying new version to: $INACTIVE_COLOR"

# Build and start the new inactive environment AND nginx
INACTIVE_SERVICE_NAME="app-$INACTIVE_COLOR"
docker-compose up -d --build $INACTIVE_SERVICE_NAME nginx

echo "New container $INACTIVE_SERVICE_NAME is starting..."
echo "Waiting for $WAIT_TIME seconds for the container to initialize..."

# --- Health Check Placeholder ---
# In a production environment, you should replace this sleep
# with a loop that polls a health check endpoint.
sleep $WAIT_TIME

echo "Container is assumed to be healthy."

# Switch traffic to the new environment
echo "Switching traffic to $INACTIVE_COLOR..."
./switch-env.sh $INACTIVE_COLOR

# Stop the old active environment
ACTIVE_SERVICE_NAME="app-$ACTIVE_COLOR"
echo "Stopping old environment: $ACTIVE_COLOR..."
docker-compose stop $ACTIVE_SERVICE_NAME

echo "Deployment to $INACTIVE_COLOR is complete."