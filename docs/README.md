# Vibematch Arena Documentation

Welcome to the Vibematch Arena documentation. This directory contains comprehensive guides for understanding, deploying, and maintaining the game.

## Documentation Index

### [DEPLOYMENT.md](./DEPLOYMENT.md)
Complete deployment architecture documentation including:
- Infrastructure overview (DigitalOcean droplet, Redis, Nginx, Cloudflare)
- Blue-green deployment strategy
- Redis state management and synchronization
- Graceful shutdown and auto-reconnection
- Configuration files and monitoring
- Scaling plan for future growth

## Quick Links

### For Developers
- [Main README](../README.md) - Project overview and local setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment details

### For Operations
- [DEPLOYMENT.md - Troubleshooting](./DEPLOYMENT.md#monitoring--troubleshooting) - Common issues and solutions
- [DEPLOYMENT.md - Monitoring](./DEPLOYMENT.md#monitoring--troubleshooting) - Health checks and logs

### Architecture Diagrams
- [Deployment Flow](./DEPLOYMENT.md#architecture-flow)
- [Traffic Flow](./DEPLOYMENT.md#traffic-flow)
- [Redis State Management](./DEPLOYMENT.md#redis-state-management)

## Key Features

### Zero-Downtime Deployments
Every push to `main` triggers an automated blue-green deployment with:
- New container spun up alongside old one
- Health checks before traffic switching
- Nginx hot-reload (no dropped connections)
- 30-second connection drain period
- Automatic cleanup of old containers

### State Persistence
Game state (players, bots, kills/deaths) persists across deployments using Redis:
- Continuous sync every 1 second
- Automatic restoration on startup
- 5-minute TTL with automatic renewal

### Graceful Reconnection
Players experience seamless updates:
- Server shutdown notification
- Automatic Socket.io reconnection
- Auto-rejoin with saved player name
- No manual refresh required

## Quick Commands

### Deployment
```bash
# Deployments are automatic on git push
git push origin main

# Manual deployment (if needed)
ssh root@138.68.41.157
sudo /opt/deploy/deploy.sh
```

### Monitoring
```bash
# View active container logs
ssh root@138.68.41.157
docker logs -f vibematch-blue  # or vibematch-green

# Check Redis state
redis-cli GET vibematch:players | jq
redis-cli GET vibematch:bots | jq

# Check which container is active
cat /etc/nginx/sites-available/vibematch | grep "server localhost"
```

### Troubleshooting
```bash
# Container won't start
docker logs vibematch-blue  # Check for errors

# Redis connection issues
docker exec vibematch-blue sh -c "redis-cli -h 172.17.0.1 PING"

# Disk space issues
df -h
docker system prune -af

# Memory issues
free -h
docker stats
```

## Performance

### Current Metrics (DigitalOcean $4/month droplet)
- **SLO Compliance**: 100% (no breaches)
- **Concurrent Players**: 50-100 (tested)
- **Deployment Time**: ~60 seconds (zero downtime)
- **State Sync Frequency**: Every 1 second
- **Connection Drain**: 30 seconds

### Previous Metrics (Render.com free tier)
- **SLO Compliance**: 90-93% (frequent breaches)
- **CPU Throttling**: 0.1 units
- **Deployment**: Manual with downtime

## Cost

**Total**: $4/month
- DigitalOcean Droplet: $4/month
- Cloudflare Tunnel: Free
- Domain: Already owned

## Future Scaling

The current Redis-based architecture supports horizontal scaling:
1. Move Redis to dedicated cluster
2. Deploy multiple game server instances
3. Add load balancer with sticky sessions
4. Estimated capacity: 500-1000 concurrent players with 10 instances

See [DEPLOYMENT.md - Scaling Plan](./DEPLOYMENT.md#scaling-plan) for details.
