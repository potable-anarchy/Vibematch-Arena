# Vibematch Arena

A fast-paced, top-down multiplayer shooter inspired by Hotline Miami and classic arena shooters like Doom.

## Features

- **Fast-paced multiplayer action** - Top-down shooter with tight controls
- **Multiple weapons** - Pistol, SMG, Shotgun, and Rifle with realistic ballistics
- **Health & Armor system** - Armor absorbs 33% of damage
- **Pickups** - Health, armor, and ammo scattered around the map
- **Real-time multiplayer** - 60 tick server with lag compensation
- **Scoreboard** - Live tracking of kills and deaths
- **Spawn protection** - 600ms invulnerability after respawning

## Tech Stack

- **Server**: Node.js + Express + Socket.io
- **Client**: Vanilla JavaScript ES modules + HTML5 Canvas
- **Deployment**: Docker (Render/Railway compatible)

## Controls

- **WASD** - Movement
- **Mouse** - Aim
- **Left Click** - Shoot
- **R** - Reload

## Running Locally

### Prerequisites
- Node.js 18+ or Docker

### Option 1: Docker (Recommended - Mimics Render Deployment)

```bash
# Development mode (mimics Render deployment)
docker-compose up dev

# Or run in background
docker-compose up dev -d

# View logs
docker-compose logs dev -f

# Stop container
docker-compose down
```

The dev container:
- Runs on port 5500 (http://localhost:5500)
- Uses NODE_ENV=production (same as Render)
- Mounts source files for live development
- Automatically restarts on crashes

### Option 2: Node.js

```bash
# Install dependencies
npm install

# Run server
npm start
```

Then open http://localhost:5500 in your browser.

## Deployment

### Local Production (with Cloudflare Tunnel)

To run the production setup with Cloudflare Tunnel:

```bash
# Set your Cloudflare tunnel token
export TUNNEL_TOKEN=your_cloudflare_tunnel_token

# Run production stack
docker-compose --profile production up

# Or in background
docker-compose --profile production up -d
```

This runs both the game server and cloudflared tunnel for secure public access.

### Render

1. Push code to GitHub
2. Create a new Web Service on Render
3. Connect your repository
4. Render will automatically detect the `render.yaml` and deploy

### Railway

1. Push code to GitHub
2. Create a new project on Railway
3. Connect your repository
4. Railway will automatically detect the Dockerfile and deploy

Or use Railway CLI:

```bash
railway login
railway init
railway up
```

## Game Design

Based on the design document, this game implements:

- **Server-authoritative** architecture for cheat prevention
- **Hitscan weapons** with lag compensation
- **Client-side prediction** for smooth movement
- **Pickup respawn system** with configurable timers
- **Spawn safety** - players spawn away from enemies with brief invulnerability

## Weapons

| Weapon  | Damage | ROF  | Mag | Range | Notes                    |
|---------|--------|------|-----|-------|--------------------------|
| Pistol  | 20     | 6/s  | 12  | 800px | Accurate, infinite ammo  |
| SMG     | 12     | 12/s | 30  | 600px | High fire rate, spray    |
| Shotgun | 8x10   | 0.9/s| 6   | 300px | Multiple pellets, spread |
| Rifle   | 30     | 5/s  | 20  | 1200px| Long range, high damage  |

## Pickups

- **Health Small** (+25 HP, 15s respawn)
- **Health Big** (+50 HP, 25s respawn)
- **Armor Light** (+50 armor, 30s respawn)
- **Armor Heavy** (+100 armor, 45s respawn)
- **Ammo** (+40%, 20s respawn)

## Live-Coding Mod System

The game includes a powerful live-coding mod system that lets you write and reload JavaScript code **while playing**!

### How to Use Mods

1. **Open the mod editor**: Press the **backtick key (`)** during gameplay
2. **Load a pre-made mod**: Select from the dropdown and click "LOAD FILE"
3. **Write custom code**: Edit in the built-in code editor
4. **Hot-reload**: Press **Ctrl+Enter** (Cmd+Enter on Mac) to reload instantly
5. **Keep playing**: Mods run without interrupting gameplay!

### Mod Directory

All mods are stored in `public/mods/`:
- `example-killcounter.js` - Shows kill count
- `example-rainbow-trail.js` - Colorful particle trail
- `example-damage-numbers.js` - Floating damage numbers
- Add your own `.js` files here!

### Disabling Mods

**Option 1**: Add `?mods=false` to the URL
```
http://localhost:5500?mods=false
```

**Option 2**: Rename the `public/mods/` directory to `public/mods.disabled`

**Option 3**: Remove specific mod files you don't want

See `MODS.md` for complete mod API documentation and examples!

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[docs/README.md](docs/README.md)** - Documentation index (start here)
- **[docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)** - Complete setup guide
- **[docs/MOD_DEVELOPMENT.md](docs/MOD_DEVELOPMENT.md)** - Mod creation guide for AI agents
- **[docs/API_REFERENCE.md](docs/API_REFERENCE.md)** - Complete mod system API
- **[docs/GAME_MECHANICS.md](docs/GAME_MECHANICS.md)** - Weapons, combat, pickups
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Production deployment
- **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues

### For AI Coding Agents

- **[agents.md](agents.md)** - Quick reference for AI agents
- **[.claude/instructions.md](.claude/instructions.md)** - Claude-specific instructions

## Future Enhancements

- Additional weapons (rocket launcher, railgun, plasma)
- More maps with different layouts
- Power-ups (Quad Damage, Haste, Shield)
- Team Deathmatch mode
- Custom lobbies and matchmaking
- Cosmetics and player customization
- Server-side mod support

## License

MIT
# Test deployment Sat Oct 25 17:41:38 PDT 2025
# Webhook test 2 Sat Oct 25 17:51:08 PDT 2025
# Final deployment test Sat Oct 25 17:54:47 PDT 2025
# Deployment test - checking connection behavior Sat Oct 25 18:08:20 PDT 2025
