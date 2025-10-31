#!/bin/bash

# Vibematch-Arena Deployment Script
# Deploys the game to a remote server running Docker

set -e

# Configuration
REMOTE_HOST="100.120.77.39"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-~/vibematch-arena}"
PROJECT_NAME="vibematch-arena"
CONTAINER_NAME="vibematch-arena-app"

echo "🚀 Starting deployment to ${REMOTE_HOST}..."

# Check SSH connection
echo "📡 Testing SSH connection..."
if ! ssh -o ConnectTimeout=5 "${REMOTE_USER}@${REMOTE_HOST}" "echo 'SSH connection successful'"; then
    echo "❌ Failed to connect to ${REMOTE_HOST}"
    echo "Please ensure:"
    echo "  1. SSH is enabled on the remote server"
    echo "  2. You have SSH key authentication set up"
    echo "  3. The IP address is correct"
    exit 1
fi

echo "✅ SSH connection successful"

# Create remote directory
echo "📁 Creating remote directory..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p ${REMOTE_DIR}"

# Sync project files
echo "📦 Syncing project files..."
rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.env' \
    --exclude '*.log' \
    --exclude '.DS_Store' \
    ./ "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/"

echo "✅ Files synced successfully"

# Deploy on remote server
echo "🐳 Building and starting Docker container..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" "cd ${REMOTE_DIR} && bash -s" << 'ENDSSH'
    set -e

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed on the remote server"
        echo "Please install Docker first: https://docs.docker.com/engine/install/"
        exit 1
    fi

    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo "❌ Docker Compose is not installed on the remote server"
        echo "Please install Docker Compose first"
        exit 1
    fi

    # Stop existing container if running
    echo "🛑 Stopping existing container (if any)..."
    docker stop vibematch-arena-app 2>/dev/null || true
    docker rm vibematch-arena-app 2>/dev/null || true

    # Build the Docker image
    echo "🏗️  Building Docker image..."
    docker build -t vibematch-arena:latest .

    # Run the container
    echo "▶️  Starting container..."
    docker run -d \
        --name vibematch-arena-app \
        --restart unless-stopped \
        -p 5500:5500 \
        -e NODE_ENV=production \
        -e PORT=5500 \
        vibematch-arena:latest

    echo "✅ Container started successfully"

    # Show container status
    echo ""
    echo "📊 Container Status:"
    docker ps --filter "name=vibematch-arena-app"

    echo ""
    echo "📝 Recent logs:"
    docker logs vibematch-arena-app --tail 20
ENDSSH

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🎮 Game Server Info:"
echo "  URL: http://${REMOTE_HOST}:5500"
echo "  Status: docker logs ${CONTAINER_NAME}"
echo ""
echo "📋 Useful commands:"
echo "  View logs:    ssh ${REMOTE_USER}@${REMOTE_HOST} 'docker logs -f ${CONTAINER_NAME}'"
echo "  Restart:      ssh ${REMOTE_USER}@${REMOTE_HOST} 'docker restart ${CONTAINER_NAME}'"
echo "  Stop:         ssh ${REMOTE_USER}@${REMOTE_HOST} 'docker stop ${CONTAINER_NAME}'"
echo "  Shell access: ssh ${REMOTE_USER}@${REMOTE_HOST} 'docker exec -it ${CONTAINER_NAME} sh'"
