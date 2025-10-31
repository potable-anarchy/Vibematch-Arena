#!/bin/bash

# Auto-deployment script for Vibematch-Arena
# This script is triggered by the webhook endpoint

set -e

PROJECT_DIR="/home/brad/vibematch-arena"
TEMP_DIR="/tmp/vibematch-deploy-$$"
CONTAINER_NAME="vibematch-arena-app"
IMAGE_NAME="vibematch-arena:latest"

echo "🚀 Starting deployment..."

# Clone fresh copy of code (avoids git auth issues)
echo "📥 Fetching latest code from GitHub..."
rm -rf "$TEMP_DIR"
git clone --depth 1 https://github.com/potable-anarchy/Vibematch-Arena.git "$TEMP_DIR"

# Sync to project directory (excluding .git)
echo "📦 Syncing files..."
rsync -av --exclude='.git' --exclude='node_modules' --exclude='mods.db*' "$TEMP_DIR/" "$PROJECT_DIR/"

# Cleanup temp directory
rm -rf "$TEMP_DIR"

cd "$PROJECT_DIR"

# Build new Docker image
echo "🏗️  Building Docker image..."
docker build -t "$IMAGE_NAME" .

# Stop old container
echo "🛑 Stopping old container..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# Start new container
echo "▶️  Starting new container..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p 5500:5500 \
  -e NODE_ENV=production \
  -e PORT=5500 \
  -e WEBHOOK_SECRET="${WEBHOOK_SECRET}" \
  "$IMAGE_NAME"

echo "✅ Deployment complete!"
docker ps --filter name="$CONTAINER_NAME"
