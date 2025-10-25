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

### Option 1: Docker (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up --build

# Or with plain Docker
docker build -t vibematch-arena .
docker run -p 3000:3000 vibematch-arena
```

### Option 2: Node.js

```bash
# Install dependencies
npm install

# Run server
npm start
```

Then open http://localhost:3000 in your browser.

## Deployment

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
