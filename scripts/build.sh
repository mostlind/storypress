#!/bin/bash
set -e

ENV="${1:-dev}"

if [[ "$ENV" != "local" && "$ENV" != "dev" && "$ENV" != "prod" ]]; then
  echo "Usage: build.sh [local|dev|prod]"
  exit 1
fi

ENV_FILE=".env.$ENV"
if [[ "$ENV" == "local" ]]; then
  ENV_FILE=".env.local"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

GCP_PROJECT="storypress-493121"
GCP_REGION="us-central1"
GCP_REPOSITORY="storypress"
IMAGE_NAME="storypress"

IMAGE="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT/$GCP_REPOSITORY/$IMAGE_NAME:$ENV"

set -a
source "$ENV_FILE"
set +a

echo "Building $IMAGE from $ENV_FILE..."

docker buildx build \
  --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" \
  -t "$IMAGE" \
  --push .

echo ""
echo "Done. Image available at:"
echo "  $IMAGE"
