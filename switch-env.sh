#!/bin/bash

# Check if an argument is provided
if [ -z "$1" ]; then
  echo "Usage: $0 [blue|green]"
  exit 1
fi

# Set the active environment based on the argument
if [ "$1" == "blue" ]; then
  echo "Switching to blue environment..."
  echo "UPSTREAM_APP=app-blue" > .env
elif [ "$1" == "green" ]; then
  echo "Switching to green environment..."
  echo "UPSTREAM_APP=app-green" > .env
else
  echo "Invalid argument. Use 'blue' or 'green'."
  exit 1
fi

# Restart nginx to apply the changes
echo "Restarting nginx..."
docker-compose restart nginx

echo "Successfully switched to $1 environment."