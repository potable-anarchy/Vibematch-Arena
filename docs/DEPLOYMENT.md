# Vibematch Arena - Deployment Architecture

## Overview

Vibematch Arena uses a zero-downtime blue-green deployment strategy on a DigitalOcean droplet with Redis-based state persistence, Nginx reverse proxy, and Cloudflare tunnel for secure external access.

## Infrastructure

### DigitalOcean Droplet
- **Instance**: $4/month Basic Droplet
- **Specs**: 1 vCPU, 512MB RAM, 2GB Swap, 10GB SSD
- **IP**: 138.68.41.157
- **OS**: Ubuntu 22.04 LTS
- **Domain**: vibematch-arena.brad-dougherty.com

### Services Running
- **Docker**: Container runtime (2 slots: blue/green)
- **Nginx**: Reverse proxy (port 80)
- **Redis**: State persistence (port 6379, bound to 127.0.0.1 and 172.17.0.1)
- **Cloudflared**: Secure tunnel to Cloudflare
- **Webhook Server**: GitHub webhook receiver (port 9000)

## Architecture Flow

```
GitHub Push
    ↓
GitHub Webhook
    ↓
Webhook Server (port 9000)
    ↓
Deploy Script (/opt/deploy/deploy.sh)
    ↓
    ├─→ Git Pull & Docker Build
    ↓
    ├─→ Start New Container (blue or green)
    ↓
    ├─→ Wait for Health Check
    ↓
    ├─→ Update Nginx → New Container
    ↓
    ├─→ Reload Nginx (no downtime)
    ↓
    ├─→ Drain Connections (30s)
    ↓
    ├─→ Stop Old Container
    ↓
    └─→ Cleanup Old Images
```

## Traffic Flow

```
User Request
    ↓
Cloudflare CDN
    ↓
Cloudflare Tunnel (cloudflared)
    ↓
Nginx (port 80)
    ↓
Active Container (blue: 5500 OR green: 5501)
    ↓
Node.js Game Server
    ↓
Redis (state persistence)
```

## Redis State Management

### State Schema

Redis stores three keys with 5-minute TTL:

1. **`vibematch:players`** - Player state
```json
[
  {
    "id": "socket_id",
    "name": "PlayerName",
    "x": 400.0,
    "y": 300.0,
    "health": 100,
    "armor": 0,
    "kills": 5,
    "deaths": 2,
    "weapon": "rifle",
    "ammo": 25,
    "credits": 150,
    "activeMods": ["mod_id_1", "mod_id_2"]
  }
]
```

2. **`vibematch:bots`** - Bot state
```json
[
  {
    "id": "bot_1",
    "name": "PracticeBot",
    "x": 500.0,
    "y": 400.0,
    "health": 100,
    "armor": 50,
    "kills": 7,
    "deaths": 5,
    "weapon": "pistol",
    "ammo": 12,
    "credits": 80,
    "activeMods": ["mod_id_3"]
  }
]
```

3. **`vibematch:metadata`** - Game state metadata
```json
{
  "nextProjectileId": 1523,
  "nextPickupId": 89,
  "nextBotId": 12,
  "warmupEndTime": 1698765432000,
  "countdownStartTime": null,
  "roundActive": true,
  "timestamp": 1698765430000
}
```

### State Synchronization

1. **Continuous Sync**: Every 1 second during game loop
2. **Restoration**: On server startup (waits up to 5s for Redis)
3. **Final Sync**: During graceful shutdown before container stops

### Deployment State Preservation

```
Old Container Running
    ↓
Sync state to Redis (every 1s)
    ↓
New Container Starts
    ↓
Restore state from Redis
    ↓
Nginx switches to new container
    ↓
30-second connection drain period
    ↓
Old container receives SIGTERM
    ↓
Final sync to Redis
    ↓
Old container stops
```

## Graceful Shutdown & Reconnection

### Server-Side (server.js)

1. **SIGTERM/SIGINT Handler**:
   - Sends `serverShutdown` event to all connected clients
   - Performs final Redis state sync
   - Waits 1s for message delivery
   - Closes HTTP server
   - Closes Socket.io server
   - Disconnects Redis
   - Exits gracefully

2. **Shutdown Message**:
```javascript
io.emit("serverShutdown", {
  message: "Server is restarting for an update. You will automatically reconnect in a few seconds...",
  countdown: 5
});
```

### Client-Side (game.js)

1. **Socket.io Reconnection Config**:
```javascript
const socket = io({
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});
```

2. **Reconnection Events**:
   - `disconnect`: Shows reconnect overlay
   - `reconnect_error`: Updates overlay with retry attempt
   - `reconnect`: Hides overlay, auto-rejoins game
   - `serverShutdown`: Shows custom shutdown message

3. **Auto-Rejoin**:
   - Player name saved to `localStorage`
   - On reconnect, automatically rejoins with saved name

## Configuration Files

### Nginx (`/etc/nginx/sites-available/vibematch`)

```nginx
upstream vibematch {
    server localhost:5500;  # Updated by deploy script (blue or green)
}

map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name _;

    # Long timeouts for WebSocket connections
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;

    location / {
        proxy_pass http://vibematch;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        
        # Preserve client info
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # No buffering for real-time game traffic
        proxy_buffering off;
    }
}
```

### Cloudflare Tunnel (`/etc/cloudflared/config.yml`)

```yaml
tunnel: c45892cc-4e58-4746-84de-14767ca01c87
credentials-file: /root/.cloudflared/c45892cc-4e58-4746-84de-14767ca01c87.json

ingress:
  - hostname: webhook.brad-dougherty.com
    service: http://localhost:9000
  - hostname: vibematch-arena.brad-dougherty.com
    service: http://localhost:80  # Points to Nginx
  - service: http_status:404
```

### Redis (`/etc/redis/redis.conf`)

Key settings:
```conf
bind 127.0.0.1 172.17.0.1  # Localhost + Docker bridge
protected-mode no           # Allow Docker containers
```

### Environment Variables (`/opt/vibematch-arena/.env`)

```bash
NODE_ENV=production
PORT=5500
REDIS_URL=redis://172.17.0.1:6379
GEMINI_API_KEY=AIzaSyDlC_8F1i2ax-9gSc0dJXxecLBf-q3ENoE
```

## Deployment Script

Location: `/opt/deploy/deploy.sh`

Key features:
- Detects current container (blue/green)
- Builds new container with opposite color
- Health checks new container
- Updates Nginx config atomically
- Reloads Nginx without dropping connections
- 30-second connection drain period
- Automatic cleanup of old images and build cache

## Performance Metrics

### Before (Render.com)
- **SLO Compliance**: 90-93% (target: 95%)
- **CPU**: 0.1 CPU units (throttled)
- **Cost**: Free tier
- **Issues**: Frequent SLO breaches, performance degradation

### After (DigitalOcean)
- **SLO Compliance**: 100% (no breaches)
- **CPU**: 1 vCPU (dedicated)
- **Cost**: $4/month
- **Deployment**: Zero downtime with blue-green

## Monitoring & Troubleshooting

### Check Active Container

```bash
docker ps
# Look for vibematch-blue or vibematch-green
```

### Check Nginx Config

```bash
cat /etc/nginx/sites-available/vibematch | grep "server localhost"
```

### Check Redis State

```bash
# Check if state exists
redis-cli EXISTS vibematch:players vibematch:bots vibematch:metadata

# View player state
redis-cli GET vibematch:players | jq

# View bot state
redis-cli GET vibematch:bots | jq

# Check TTL
redis-cli TTL vibematch:players
```

### View Container Logs

```bash
# Active container
docker logs -f vibematch-blue
# or
docker logs -f vibematch-green

# Look for:
# ✅ Redis connected
# ✅ Redis ready
# ✅ Restored X players from Redis
# ✅ Restored X bots from Redis
```

### Test Redis Connection from Container

```bash
docker exec vibematch-blue sh -c "redis-cli -h 172.17.0.1 PING"
```

### Manual Deployment

```bash
sudo /opt/deploy/deploy.sh
```

### Disk Space Issues

```bash
# Check disk usage
df -h

# Clean Docker images
docker system prune -af

# Clean deployment directories
rm -rf /opt/vibematch-deploy-*
```

### Memory Issues

```bash
# Check memory
free -h

# Check swap
swapon --show

# View container memory usage
docker stats
```

## Scaling Plan

### Current Architecture
- Single server
- Single game instance per deployment
- Redis on same machine

### Future Multi-Server Architecture

```
Load Balancer (Cloudflare)
    ↓
    ├─→ Server 1 (Game Instance 1) ──┐
    ├─→ Server 2 (Game Instance 2) ──┼─→ Shared Redis Cluster
    └─→ Server 3 (Game Instance 3) ──┘
```

When ready to scale:
1. Move Redis to dedicated server or managed service
2. Add load balancer with sticky sessions
3. Deploy multiple game server instances
4. Each instance syncs to shared Redis
5. Players distributed across instances

### Estimated Scaling Capacity
- **Current**: ~50-100 concurrent players (single instance)
- **3 Instances**: ~150-300 concurrent players
- **10 Instances**: ~500-1000 concurrent players

## Security

### Firewall (UFW)
- Only ports 22 (SSH) and 80 (Nginx) exposed
- Cloudflare tunnel provides secure access (no direct port exposure)

### Docker Network
- Containers use bridge network (172.17.0.0/16)
- Redis bound to localhost + Docker bridge only

### Cloudflare Protection
- DDoS protection
- SSL/TLS termination
- Geographic distribution

## Cost Breakdown

- **DigitalOcean Droplet**: $4/month
- **Cloudflare Tunnel**: Free
- **Domain**: Already owned
- **Total**: $4/month

## Recent Changes

### Latest Implementation (Oct 25, 2024)
1. Redis state persistence for game continuity
2. Graceful shutdown with player notification
3. Client-side auto-reconnection
4. Bot purchasing from AI-generated mod database
5. Connection draining during deployments
6. Automatic Docker cleanup to prevent disk issues

### Migration History
1. Initial deployment on Render.com (free tier)
2. Performance issues identified (SLO 90-93%)
3. Migrated to DigitalOcean $4 droplet
4. Implemented blue-green deployment
5. Added Redis state management
6. Implemented graceful shutdown and reconnection
