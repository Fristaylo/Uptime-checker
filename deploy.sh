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

# Build and start the new inactive environment
docker-compose up -d --build app-$INACTIVE_COLOR

echo "New container app-$INACTIVE_COLOR is starting..."
echo "Waiting for $WAIT_TIME seconds for the container to initialize..."

# --- Health Check Placeholder ---
# In a production environment, you should replace this sleep
# with a loop that polls a health check endpoint.
# For example:
#
# until $(curl --output /dev/null --silent --head --fail http://localhost:PORT/health); do
#   printf '.'
#   sleep 5
# done
#
sleep $WAIT_TIME

echo "Container is assumed to be healthy."

# Switch traffic to the new environment
echo "Switching traffic to $INACTIVE_COLOR..."
./switch-env.sh $INACTIVE_COLOR

# Stop the old active environment
echo "Stopping old environment: $ACTIVE_COLOR..."
docker-compose stop app-$ACTIVE_COLOR

echo "Deployment to $INACTIVE_COLOR is complete."