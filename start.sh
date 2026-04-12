#!/bin/sh
set -e

# Start Redis in the background
redis-server --daemonize yes --loglevel notice

# Wait for Redis to be ready
until redis-cli ping | grep -q PONG; do
  echo "Waiting for Redis..."
  sleep 0.5
done
echo "Redis ready"

# Start the worker in the background
node_modules/.bin/tsx jobs/worker.ts &
echo "Worker started"

# Start Next.js (foreground — this is what Cloud Run health-checks)
exec node server.js
