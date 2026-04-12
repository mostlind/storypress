#!/bin/bash
set -e

# Load NEXT_PUBLIC vars from .env.local
source .env.local

IMAGE="ghcr.io/mostlind/storypress:latest"

docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" \
  -t "$IMAGE" .

docker push "$IMAGE"

echo ""
echo "Pushed $IMAGE"
echo "On the droplet, run: docker compose pull && docker compose up -d"
