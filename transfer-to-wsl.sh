#!/bin/bash

# Helper script to transfer project to WSL
# Run this from macOS to copy the project to your WSL machine

set -e

echo "📦 Transfer Deathmatch Arena to WSL"
echo "===================================="

# Configuration
WSL_IP="100.104.133.109"
WSL_USER="${WSL_USER:-brad}"  # Change if different
WSL_PATH="${WSL_PATH:-~/deathmatch-arena}"

echo ""
echo "Configuration:"
echo "  WSL IP:   $WSL_IP"
echo "  WSL User: $WSL_USER"
echo "  WSL Path: $WSL_PATH"
echo ""
read -p "Continue with these settings? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Use rsync to transfer files
echo ""
echo "🚀 Transferring files..."

rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.DS_Store' \
    --exclude '*.log' \
    ./ ${WSL_USER}@${WSL_IP}:${WSL_PATH}/

echo ""
echo "✅ Transfer complete!"
echo ""
echo "Next steps:"
echo "  1. SSH into WSL: ssh ${WSL_USER}@${WSL_IP}"
echo "  2. Navigate:     cd ${WSL_PATH}"
echo "  3. Deploy:       ./deploy.sh"
