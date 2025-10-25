#!/bin/bash

echo "🎮 Deathmatch Arena - Starting Server"
echo ""

if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "Using Docker Compose..."
    docker-compose up --build
elif command -v docker &> /dev/null; then
    echo "Using Docker..."
    docker build -t deathmatch-arena .
    docker run -p 3000:3000 deathmatch-arena
elif command -v node &> /dev/null; then
    echo "Using Node.js..."
    npm install
    npm start
else
    echo "❌ Error: Please install Node.js or Docker"
    exit 1
fi
