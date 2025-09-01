#!/bin/sh

# Start nginx
nginx -g 'daemon off;' &

# Start node server
cd /app/server
npm start