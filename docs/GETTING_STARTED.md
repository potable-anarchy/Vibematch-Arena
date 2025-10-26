# Getting Started with Vibematch Arena

A comprehensive guide to set up, run, and develop for Vibematch Arena.

## Table of Contents

- [Quick Overview](#quick-overview)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Understanding the Project Structure](#understanding-the-project-structure)
- [Running the Game](#running-the-game)
- [Playing the Game](#playing-the-game)
- [Working with Mods](#working-with-mods)
- [Deployment Options](#deployment-options)
- [Next Steps](#next-steps)

## Quick Overview

Vibematch Arena is a fast-paced, top-down multiplayer shooter inspired by Hotline Miami and classic arena shooters like Doom. Key features:

- **Real-time multiplayer** with 60-tick server and lag compensation
- **Live-coding mod system** for instant gameplay customization
- **Multiple weapons** (Pistol, SMG, Shotgun, Rifle) with realistic ballistics
- **Health & Armor system** with pickups scattered around the map
- **AI bots** for solo practice and testing

## Prerequisites

Choose one of these development environments:

### Option 1: Docker (Recommended)
- Docker Desktop installed
- Docker Compose installed
- 2GB free disk space

### Option 2: Node.js
- Node.js 18 or higher
- npm (comes with Node.js)
- 500MB free disk space

## Local Development Setup

### Option 1: Using Docker (Mimics Production)

Docker provides the most consistent development environment:

```bash
# Clone the repository
git clone <your-repo-url>
cd vibematch-arena

# Copy environment file
cp .env.example .env

# Start development container
docker-compose up dev

# Or run in background
docker-compose up dev -d

# View logs
docker-compose logs dev -f
```

The dev container:
- Runs on port 5500 (http://localhost:5500)
- Uses NODE_ENV=production (same as deployment)
- Mounts source files for live development
- Automatically restarts on crashes

**Stopping:**
```bash
docker-compose down
```

### Option 2: Using Node.js

For direct Node.js development:

```bash
# Clone the repository
git clone <your-repo-url>
cd vibematch-arena

# Install dependencies
npm install

# Run server
npm start
```

Server will start on http://localhost:5500

## Understanding the Project Structure

```
vibematch-arena/
├── server.js                 # Main game server (authoritative)
├── public/                   # Client-side code
│   ├── index.html           # Game entry point
│   ├── game.js              # Client game loop & rendering
│   ├── modSystem.js         # Mod loading & hook system
│   ├── modEditor.js         # In-game mod editor UI
│   ├── mods/                # Available mods
│   │   ├── mods.json        # Mod manifest
│   │   └── *.js             # Individual mod files
│   └── assets/              # Sprites, sounds, etc.
├── docs/                    # Documentation
├── package.json             # Node.js dependencies
├── Dockerfile               # Production container
└── docker-compose.yml       # Dev & prod configurations
```

### Key Components

**Server (server.js:1949 lines)**
- Authoritative game state
- Physics simulation
- AI bot logic
- Combat resolution
- Pickup management
- Socket.io event handling

**Client (game.js:1226 lines)**
- Game rendering (HTML5 Canvas)
- Input handling
- Client-side prediction
- Mod hook invocation
- UI overlays

**Mod System**
- `modSystem.js:207` - Hook registration & execution
- `modEditor.js:389` - In-game code editor
- `public/mods/` - Mod library

## Running the Game

### Starting the Server

**Docker:**
```bash
docker-compose up dev
```

**Node.js:**
```bash
npm start
```

You should see:
```
Server listening on *:5500
Game server running on port 5500
```

### Accessing the Game

Open your browser to:
```
http://localhost:5500
```

### Joining a Game

1. Enter your player name
2. Click "Join Game"
3. You'll spawn in the arena with a pistol

## Playing the Game

### Controls

- **WASD** - Movement
- **Mouse** - Aim
- **Left Click** - Shoot
- **R** - Reload
- **\`** (Backtick) - Open mod editor

### Weapons

| Weapon  | Damage | Fire Rate | Magazine | Range | Notes |
|---------|--------|-----------|----------|-------|-------|
| Pistol  | 20     | 6/sec     | 12       | 800px | Accurate, infinite ammo |
| SMG     | 12     | 12/sec    | 30       | 600px | High fire rate, spray |
| Shotgun | 8×10   | 0.9/sec   | 6        | 300px | Multiple pellets, spread |
| Rifle   | 30     | 5/sec     | 20       | 1200px| Long range, high damage |

### Pickups

Scattered around the map:

- **Health Small** (+25 HP, respawns in 15s)
- **Health Big** (+50 HP, respawns in 25s)
- **Armor Light** (+50 armor, respawns in 30s)
- **Armor Heavy** (+100 armor, respawns in 45s)
- **Ammo** (+40%, respawns in 20s)

### Health & Armor System

- **Base Health:** 100
- **Armor:** Absorbs 33% of damage before health
- **Spawn Protection:** 600ms invulnerability after respawning

## Working with Mods

### Opening the Mod Editor

Press **\`** (backtick key) during gameplay to open the mod editor.

### Loading a Pre-made Mod

1. Open mod editor (\` key)
2. Click the dropdown menu
3. Select a mod (e.g., "Hit Markers")
4. Click "LOAD FILE"

### Quick Reload

After editing mod code, press **Ctrl+Enter** (Cmd+Enter on Mac) to hot-reload instantly.

### Available Mods

See `public/mods/` directory for examples:
- `hit-markers.js` - Visual hit indicators
- `screen-shake.js` - Camera shake on hits
- `sound-effects.js` - Weapon and combat sounds
- `better-hud-v2.js` - Enhanced HUD with stats
- `minimap-v2.js` - Mini-map overlay
- Many more!

### Creating Your First Mod

See [MOD_DEVELOPMENT.md](MOD_DEVELOPMENT.md) for a complete guide to writing mods.

Quick example:
```javascript
// Simple kill counter
let kills = 0;

registerHook('onKill', (killerId, victimId) => {
  if (killerId === game.getPlayerId()) {
    kills++;
  }
});

registerHook('onRender', (ctx) => {
  ctx.fillStyle = '#ff3366';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(`Kills: ${kills}`, 10, 100);
});
```

Paste this into the mod editor and press Ctrl+Enter!

## Deployment Options

### Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment guide covering:
- DigitalOcean droplet setup
- Blue-green deployment strategy
- Redis state persistence
- Cloudflare tunnel configuration
- Zero-downtime updates

### Quick Cloud Deploy

**Render:**
1. Push to GitHub
2. Connect repo to Render
3. Auto-detected via `render.yaml`

**Railway:**
1. Push to GitHub
2. Connect repo to Railway
3. Auto-detected via `railway.json`

### Local Production with Cloudflare Tunnel

For testing production setup locally:

```bash
# Set your Cloudflare tunnel token
export TUNNEL_TOKEN=your_token_here

# Start production stack
docker-compose --profile production up -d

# View logs
docker-compose logs -f
```

## Next Steps

### For Players
- Practice with bots (they spawn automatically)
- Experiment with different weapons
- Learn the map layout and pickup locations
- Try loading different mods to customize your experience

### For Developers
- Read [GAME_MECHANICS.md](GAME_MECHANICS.md) to understand combat system
- Read [MOD_DEVELOPMENT.md](MOD_DEVELOPMENT.md) to write custom mods
- Read [API_REFERENCE.md](API_REFERENCE.md) for complete mod API
- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) if you encounter issues

### For Deployers
- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- Configure environment variables in `.env`
- Set up monitoring and health checks
- Configure Cloudflare for DDoS protection

## Common Issues

### Port Already in Use

```bash
# Find process using port 5500
lsof -i :5500

# Kill the process
kill -9 <PID>
```

### Docker Issues

```bash
# Clean up containers
docker-compose down

# Rebuild from scratch
docker-compose build --no-cache

# Clean all Docker resources
docker system prune -af
```

### Mods Not Loading

1. Check browser console (F12) for errors
2. Verify mod files exist in `public/mods/`
3. Check `public/mods/mods.json` for correct entries
4. Ensure mod syntax is valid JavaScript

### Connection Issues

1. Check server is running: `docker-compose ps` or `ps aux | grep node`
2. Verify port 5500 is accessible: `curl http://localhost:5500`
3. Check browser console for WebSocket errors
4. Disable browser extensions that might block WebSockets

## Getting Help

- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Review existing documentation in `docs/`
- Check browser console (F12) for client errors
- Check server logs for server errors
- Review the design document: [design.md](../design.md)

## Contributing

When adding new features:

1. Test locally first
2. Update relevant documentation
3. Add examples if creating new APIs
4. Test with mods enabled/disabled
5. Verify multiplayer functionality

## Performance Tips

### Development
- Use Docker for consistent environment
- Keep browser console open to catch errors
- Test with multiple browser tabs for multiplayer
- Monitor server logs for performance issues

### Production
- Use Redis for state persistence
- Enable compression in Nginx
- Monitor memory usage
- Set up log rotation
- Configure health checks

## License

MIT License - See LICENSE file for details
