# Vibematch Arena Documentation

Welcome to the Vibematch Arena documentation. This directory contains comprehensive guides for understanding, developing, deploying, and maintaining the game.

## Documentation Structure

```
docs/
├── README.md (this file)          # Documentation index
├── GETTING_STARTED.md             # Setup and installation guide
├── GAME_MECHANICS.md              # Weapons, combat, pickups
├── API_REFERENCE.md               # Complete mod system API
├── MOD_DEVELOPMENT.md             # Mod creation guide for AI agents
├── ARCHITECTURE.md                # System architecture overview
├── DEPLOYMENT.md                  # Production deployment guide
└── TROUBLESHOOTING.md             # Common issues and solutions
```

## Quick Navigation

### New to Vibematch Arena?

Start here:
1. [GETTING_STARTED.md](./GETTING_STARTED.md) - Install and run the game
2. [GAME_MECHANICS.md](./GAME_MECHANICS.md) - Learn how to play

### Want to Create Mods?

1. [MOD_DEVELOPMENT.md](./MOD_DEVELOPMENT.md) - Complete mod tutorial for AI agents
2. [API_REFERENCE.md](./API_REFERENCE.md) - Full API documentation
3. [../MODS.md](../MODS.md) - Original mod system guide

### Need to Deploy or Debug?

1. [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
2. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues
3. [ARCHITECTURE.md](./ARCHITECTURE.md) - System design

---

## Complete Documentation Index

### [GETTING_STARTED.md](./GETTING_STARTED.md)

**For:** New developers and players

**Contents:**
- Quick overview of the game
- Prerequisites (Docker or Node.js)
- Local development setup
- Project structure explanation
- Running and playing the game
- Working with mods
- Deployment options
- Common issues and solutions

**When to use:** First time setting up the project or helping someone get started.

---

### [GAME_MECHANICS.md](./GAME_MECHANICS.md)

**For:** Players, game designers, and mod developers

**Contents:**
- Core game systems (server-authoritative, tick rate)
- Complete weapon stats and tactics
  - Pistol, SMG, Shotgun, Rifle
  - Damage, fire rate, range, bloom
  - Time-to-kill calculations
- Pickup system
  - Health, armor, ammo, weapon pickups
  - Respawn times and strategic value
- Combat system
  - Damage calculation
  - Projectile mechanics
  - Hit detection
- Health & armor mechanics
  - Effective health pool calculations
  - Damage mitigation formulas
- Movement and collision
- Spawn system and protection
- Scoring and credits
- AI bot behavior
- Strategy tips

**When to use:** Understanding game balance, creating combat-related mods, or learning gameplay.

---

### [API_REFERENCE.md](./API_REFERENCE.md)

**For:** Mod developers and AI coding agents

**Contents:**
- Complete hook system documentation
  - onHit, onKill, onShoot, onPickup, onPlayerDraw, onRender, onUpdate
  - Parameters, return values, frequency
  - Examples for each hook
- Game API methods
  - game.getState(), game.getPlayerId(), game.getCamera(), etc.
- Canvas rendering context
  - Drawing shapes, text, transformations
  - Screen vs world coordinates
- Event data structures
  - Player, Pickup, Projectile objects
- Utilities and helpers
- Best practices
- Performance considerations
- Error handling
- Complete working examples

**When to use:** Writing mods, understanding the mod API, or debugging mod code.

---

### [MOD_DEVELOPMENT.md](./MOD_DEVELOPMENT.md)

**For:** AI coding agents (Claude, GPT, etc.)

**Contents:**
- Mod structure template
- Development workflow for AI agents
- Common patterns
  - Simple counter
  - Timed effects
  - Particle systems
  - Player highlighting
  - HUD displays
  - Accumulators with history
- Anti-patterns to avoid
- Coordinate system conversions
- Performance guidelines and budgets
- Testing strategies
- Debugging checklists
- Complete example mods
- AI agent checklists

**When to use:** AI agents tasked with creating game mods. Optimized for automated code generation.

---

### [ARCHITECTURE.md](./ARCHITECTURE.md)

**For:** Developers understanding or modifying the codebase

**Contents:**
- High-level architecture diagram
- Server architecture
  - File structure breakdown
  - Core systems (game loop, physics, AI, combat)
  - State management
- Client architecture
  - Game loop
  - Input system
  - Rendering pipeline
- Mod system architecture
  - Lifecycle
  - Hook system design
  - Isolation and security
- Network architecture
  - Communication protocol
  - Message types
  - Lag compensation
  - State interpolation
- Data flow examples
- Technology stack
- Design patterns used
- Performance considerations
- Scaling strategies
- Security considerations

**When to use:** Contributing to the codebase, debugging complex issues, or planning features.

---

### [DEPLOYMENT.md](./DEPLOYMENT.md)

**For:** DevOps engineers and system administrators

**Contents:**
- Infrastructure overview
  - DigitalOcean droplet specs
  - Redis, Nginx, Cloudflare setup
- Blue-green deployment strategy
  - Architecture flow
  - Traffic flow
  - Health checks
- Redis state management
  - State schema
  - Synchronization
  - Deployment state preservation
- Graceful shutdown & reconnection
  - Server-side handlers
  - Client-side auto-reconnect
- Configuration files
  - Nginx, Cloudflare, Redis
  - Environment variables
- Deployment script details
- Performance metrics
- Monitoring & troubleshooting
- Scaling plan for growth
- Security setup
- Cost breakdown

**When to use:** Deploying to production, setting up infrastructure, or troubleshooting deployments.

---

### [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

**For:** Everyone encountering issues

**Contents:**
- Server issues
  - Won't start, crashes, connection problems
- Client issues
  - Won't load, low FPS, input lag, visual glitches
- Mod system issues
  - Won't load, causes freeze, errors after reload
- Docker issues
  - Container problems, build failures, disk space
- Deployment issues
  - Blue-green failures, Redis state, Cloudflare tunnel
- Performance issues
  - High CPU, memory leaks, bandwidth
- Network issues
  - High latency, disconnections, firewall
- Quick diagnostics script
- Common error messages
- Debug mode instructions
- Performance profiling
- Recovery procedures

**When to use:** Something isn't working. Check here first before diving into code.

---

## Additional Resources

### In Project Root

- [../README.md](../README.md) - Project overview, quick start, and feature list
- [../MODS.md](../MODS.md) - Original mod system documentation
- [../QUICK-START.md](../QUICK-START.md) - Quick deployment guide
- [../QUICK_REFERENCE.md](../QUICK_REFERENCE.md) - Internal technical reference
- [../design.md](../design.md) - Original game design document
- [../MOD_SYSTEM_ARCHITECTURE.md](../MOD_SYSTEM_ARCHITECTURE.md) - Deep technical analysis

### Technical Summaries

- [../BACKFIRE-IMPLEMENTATION-SUMMARY.md](../BACKFIRE-IMPLEMENTATION-SUMMARY.md)
- [../CS_SOUND_IMPLEMENTATION.md](../CS_SOUND_IMPLEMENTATION.md)
- [../MOD-BACKFIRE-SYSTEM.md](../MOD-BACKFIRE-SYSTEM.md)
- [../MOD-ERROR-HANDLING-STRATEGY.md](../MOD-ERROR-HANDLING-STRATEGY.md)
- [../PERFORMANCE_MONITORING.md](../PERFORMANCE_MONITORING.md)
- [../PERSISTENT-MODS.md](../PERSISTENT-MODS.md)
- [../MUTATOR_SAFETY_GUIDE.md](../MUTATOR_SAFETY_GUIDE.md)
- [../SOUND_ASSETS_GUIDE.md](../SOUND_ASSETS_GUIDE.md)

---

## Quick Reference by Role

### I'm a Player

1. [GETTING_STARTED.md](./GETTING_STARTED.md) - How to install and run
2. [GAME_MECHANICS.md](./GAME_MECHANICS.md) - How to play effectively
3. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - If something breaks

### I'm a Mod Developer (Human)

1. [API_REFERENCE.md](./API_REFERENCE.md) - Complete API docs
2. [MOD_DEVELOPMENT.md](./MOD_DEVELOPMENT.md) - Patterns and examples
3. [GAME_MECHANICS.md](./GAME_MECHANICS.md) - Game rules and balance
4. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#mod-system-issues) - Mod debugging

### I'm an AI Coding Agent

1. [MOD_DEVELOPMENT.md](./MOD_DEVELOPMENT.md) - Optimized for AI agents
2. [API_REFERENCE.md](./API_REFERENCE.md) - Complete API specification
3. [GAME_MECHANICS.md](./GAME_MECHANICS.md) - Game state and rules

### I'm a Backend Developer

1. [ARCHITECTURE.md](./ARCHITECTURE.md#server-architecture) - Server design
2. [GAME_MECHANICS.md](./GAME_MECHANICS.md) - Game logic specs
3. [DEPLOYMENT.md](./DEPLOYMENT.md) - Production setup
4. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#server-issues) - Server debugging

### I'm a Frontend Developer

1. [ARCHITECTURE.md](./ARCHITECTURE.md#client-architecture) - Client design
2. [API_REFERENCE.md](./API_REFERENCE.md) - Mod system hooks
3. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#client-issues) - Client debugging

### I'm a DevOps Engineer

1. [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
2. [ARCHITECTURE.md](./ARCHITECTURE.md#network-architecture) - System design
3. [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#deployment-issues) - Deploy issues
4. [GETTING_STARTED.md](./GETTING_STARTED.md#deployment-options) - Quick deploy

---

## Documentation Standards

All documentation follows these principles:

- **Clear structure** with table of contents
- **Role-based** recommendations
- **Code examples** for technical concepts
- **Diagrams** for architecture
- **Troubleshooting** sections where relevant
- **Cross-references** to related docs

---

## Key Features Documented

### Zero-Downtime Deployments

Every push to `main` triggers automated blue-green deployment:
- New container spun up alongside old one
- Health checks before traffic switching
- Nginx hot-reload (no dropped connections)
- 30-second connection drain period
- Automatic cleanup of old containers

See: [DEPLOYMENT.md - Blue-Green Strategy](./DEPLOYMENT.md#architecture-flow)

### State Persistence

Game state persists across deployments using Redis:
- Continuous sync every 1 second
- Automatic restoration on startup
- 5-minute TTL with automatic renewal

See: [DEPLOYMENT.md - Redis State Management](./DEPLOYMENT.md#redis-state-management)

### Graceful Reconnection

Players experience seamless updates:
- Server shutdown notification
- Automatic Socket.io reconnection
- Auto-rejoin with saved player name
- No manual refresh required

See: [DEPLOYMENT.md - Graceful Shutdown](./DEPLOYMENT.md#graceful-shutdown--reconnection)

### Live-Coding Mod System

Hot-reloadable mods with extensive API:
- Press ` to open editor
- Write JavaScript code
- Ctrl+Enter to reload instantly
- No game restart needed

See: [MOD_DEVELOPMENT.md](./MOD_DEVELOPMENT.md)

---

## Quick Commands

### Local Development

```bash
# Using Docker (recommended)
docker-compose up dev

# Using Node.js
npm start

# Access game
open http://localhost:5500
```

### Production Deployment

```bash
# Automatic on push
git push origin main

# Manual deployment
ssh root@138.68.41.157
sudo /opt/deploy/deploy.sh
```

### Monitoring

```bash
# View logs
docker logs -f vibematch-blue

# Check Redis state
redis-cli GET vibematch:players | jq

# Health check
curl http://localhost:5500/health
```

---

## Performance Metrics

### Current Production (DigitalOcean $4/month)
- **SLO Compliance**: 100%
- **Concurrent Players**: 50-100 tested
- **Deployment Time**: ~60 seconds
- **Zero Downtime**: Yes

### Cost
- **Total**: $4/month
- DigitalOcean Droplet: $4/month
- Cloudflare Tunnel: Free
- Domain: Already owned

---

## Future Scaling

The Redis-based architecture supports horizontal scaling:

1. Move Redis to dedicated cluster
2. Deploy multiple game server instances
3. Add load balancer with sticky sessions
4. **Estimated capacity**: 500-1000 concurrent players with 10 instances

See: [DEPLOYMENT.md - Scaling Plan](./DEPLOYMENT.md#scaling-plan)

---

## Contributing to Documentation

When adding features:

1. **Update relevant docs** in this directory
2. **Add examples** for new APIs
3. **Update architecture diagrams** if structure changes
4. **Cross-reference** related documentation
5. **Test instructions** by following them fresh

---

## Getting Help

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) first
2. Review relevant documentation above
3. Check browser console (F12) for client errors
4. Check server logs for backend errors
5. Review recent changes in git history

---

## License

MIT License - See LICENSE file for details
