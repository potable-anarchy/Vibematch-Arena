#!/bin/bash

# Setup script for GitHub webhook auto-deployment
# Run this on the remote server: bash setup-webhook.sh

set -e

echo "🎮 Vibematch-Arena Webhook Setup"
echo "=================================="

# Configuration
PROJECT_DIR="$HOME/vibematch-arena"
WEBHOOK_PORT="9000"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-$(openssl rand -hex 32)}"

echo "📁 Project directory: $PROJECT_DIR"
echo "📡 Webhook port: $WEBHOOK_PORT"
echo "🔐 Webhook secret: $WEBHOOK_SECRET"
echo ""

# Create project directory if it doesn't exist
if [ ! -d "$PROJECT_DIR" ]; then
    echo "📁 Creating project directory..."
    mkdir -p "$PROJECT_DIR"
fi

# Navigate to project directory
cd "$PROJECT_DIR"

# Clone or pull repository
if [ ! -d ".git" ]; then
    echo "📥 Cloning repository..."
    git clone https://github.com/potable-anarchy/Vibematch-Arena.git .
else
    echo "📥 Pulling latest code..."
    git pull origin main
fi

# Install webhook handler dependencies
echo "📦 Installing webhook handler dependencies..."
cp webhook-handler.js webhook-handler-live.js
cp webhook-package.json package-webhook.json
npm install --prefix . express

# Create systemd service file
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/vibematch-webhook.service > /dev/null <<EOF
[Unit]
Description=Vibematch-Arena GitHub Webhook Handler
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
Environment="WEBHOOK_PORT=$WEBHOOK_PORT"
Environment="WEBHOOK_SECRET=$WEBHOOK_SECRET"
Environment="PROJECT_DIR=$PROJECT_DIR"
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node $PROJECT_DIR/webhook-handler.js
Restart=always
RestartSec=10

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=vibematch-webhook

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
echo "🔄 Reloading systemd..."
sudo systemctl daemon-reload

echo "▶️  Starting webhook service..."
sudo systemctl enable vibematch-webhook
sudo systemctl restart vibematch-webhook

# Wait a moment for service to start
sleep 2

# Check service status
echo ""
echo "📊 Service Status:"
sudo systemctl status vibematch-webhook --no-pager -l

echo ""
echo "✅ Webhook setup complete!"
echo ""
echo "=================================="
echo "📋 Configuration Summary"
echo "=================================="
echo "Webhook URL: http://$(hostname -I | awk '{print $1}'):$WEBHOOK_PORT/webhook"
echo "Health Check: http://$(hostname -I | awk '{print $1}'):$WEBHOOK_PORT/health"
echo "Manual Deploy: curl -X POST http://$(hostname -I | awk '{print $1}'):$WEBHOOK_PORT/deploy?secret=$WEBHOOK_SECRET"
echo ""
echo "🔐 GitHub Webhook Secret:"
echo "$WEBHOOK_SECRET"
echo ""
echo "💡 Add this webhook to GitHub:"
echo "   1. Go to: https://github.com/potable-anarchy/Vibematch-Arena/settings/hooks"
echo "   2. Click 'Add webhook'"
echo "   3. Payload URL: http://YOUR_SERVER_IP:$WEBHOOK_PORT/webhook"
echo "   4. Content type: application/json"
echo "   5. Secret: (use the secret above)"
echo "   6. Events: Just the push event"
echo "   7. Active: ✓"
echo ""
echo "📝 Useful commands:"
echo "   View logs: sudo journalctl -u vibematch-webhook -f"
echo "   Restart:   sudo systemctl restart vibematch-webhook"
echo "   Stop:      sudo systemctl stop vibematch-webhook"
echo "   Status:    sudo systemctl status vibematch-webhook"
echo ""
