#!/bin/bash

# Deployment script for Vibematch-Arena on WSL with Cloudflare Tunnel

set -e

echo "🎮 Vibematch-Arena - Deployment Script"
echo "========================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Creating .env from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  Please edit .env and add your TUNNEL_TOKEN"
    echo "   Get your token from: https://one.dash.cloudflare.com/"
    echo "   Then run this script again."
    exit 1
fi

# Check if TUNNEL_TOKEN is set
source .env
if [ -z "$TUNNEL_TOKEN" ] || [ "$TUNNEL_TOKEN" = "your_tunnel_token_here" ]; then
    echo "❌ TUNNEL_TOKEN not set in .env file!"
    echo "   Get your token from: https://one.dash.cloudflare.com/"
    exit 1
fi

echo "✅ Environment configured"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "   Start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Build and deploy
echo "🔨 Building and deploying containers..."
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Show status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "📋 Recent Logs:"
docker-compose logs --tail=20

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Access your game:"
echo "   Local:  http://100.104.133.109:5500"
echo "   Public: https://vibematch-arena.brad-dougherty.com"
echo ""
echo "📝 Useful commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop:         docker-compose down"
echo "   Restart:      docker-compose restart"
echo "   Rebuild:      docker-compose up -d --build"
