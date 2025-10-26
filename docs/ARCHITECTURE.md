# Architecture Overview

System architecture and design patterns used in Vibematch Arena.

## Table of Contents

- [High-Level Architecture](#high-level-architecture)
- [Server Architecture](#server-architecture)
- [Client Architecture](#client-architecture)
- [Mod System Architecture](#mod-system-architecture)
- [Network Architecture](#network-architecture)
- [State Management](#state-management)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Game Client                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   game.js    │  │ modSystem.js │  │ modEditor.js │      │
│  │ (1226 lines) │  │  (207 lines) │  │  (389 lines) │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │               │
│         └─────────────────┴──────────────────┘               │
│                           │                                  │
│                           │ Socket.io                        │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            │ WebSocket (60 Hz input, 30 Hz state)
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                           │                                  │
│                           │                                  │
│  ┌────────────────────────▼─────────────────────────┐       │
│  │            Game Server (server.js)                │       │
│  │               1949 lines                          │       │
│  │                                                   │       │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │       │
│  │  │ Game Loop   │  │   Physics   │  │ Bot AI   │ │       │
│  │  │   (60 Hz)   │  │   Engine    │  │  System  │ │       │
│  │  └─────────────┘  └─────────────┘  └──────────┘ │       │
│  │                                                   │       │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │       │
│  │  │   Combat    │  │   Pickup    │  │  Socket  │ │       │
│  │  │   System    │  │   System    │  │ Handlers │ │       │
│  │  └─────────────┘  └─────────────┘  └──────────┘ │       │
│  └───────────────────────┬───────────────────────────┘       │
│                          │                                   │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
                           │ Redis Protocol
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    │   State     │
                    │ Persistence │
                    └─────────────┘
```

## Server Architecture

### File Structure

```
server.js (1949 lines)
├── Lines 1-53: Imports & Setup
│   ├── Express + Socket.io
│   ├── Redis client
│   ├── Mod database
│   └── Performance monitor
│
├── Lines 54-270: Error Handling & Graceful Shutdown
│   ├── Uncaught exception handlers
│   ├── SIGTERM/SIGINT handlers
│   ├── Redis state sync
│   └── Server shutdown sequence
│
├── Lines 271-1345: Game Configuration
│   ├── Game constants (world size, player stats)
│   ├── Weapon definitions (damage, ROF, range)
│   ├── Pickup definitions (health, armor, ammo)
│   └── Bot purchase logic
│
├── Lines 1346-2062: Core Game Systems
│   ├── Player management
│   ├── Bot spawning & management
│   ├── Spawn point selection
│   └── Pickup initialization
│
├── Lines 2063-2800: Combat System
│   ├── Shooting mechanics
│   ├── Projectile creation
│   ├── Hit detection
│   ├── Damage application
│   └── Kill handling
│
├── Lines 2801-3400: Bot AI System
│   ├── Behavior state machine
│   ├── Target selection
│   ├── Pathfinding
│   ├── Combat tactics
│   └── Pickup collection
│
├── Lines 3401-3900: Game Loop (60 Hz)
│   ├── Player movement & physics
│   ├── Bot AI updates
│   ├── Projectile simulation
│   ├── Pickup respawning
│   └── State broadcasting
│
└── Lines 3901-1949: Socket Event Handlers
    ├── Connection/disconnection
    ├── Player join
    ├── Input processing
    ├── Mod purchasing
    └── API endpoints
```

### Core Systems

#### 1. Game Loop

```
Every 16.67ms (60 Hz):
├── Process player inputs
├── Update player positions & velocities
├── Update bot AI
│   ├── Target selection
│   ├── Pathfinding
│   └── Combat logic
├── Simulate projectiles
│   ├── Move projectiles
│   ├── Check collisions
│   └── Apply damage
├── Update pickups
│   ├── Check respawn timers
│   └── Activate pickups
└── Broadcast state (every 33ms = 30 Hz)
```

#### 2. Physics Engine

```javascript
// Collision detection flow
Player Input → Apply Velocity → Check Wall Collisions → Wall Sliding → Final Position
                                                              │
                                                              └→ Prevent wall penetration
```

**Key Features:**
- AABB collision detection
- Wall sliding (glide along walls when hitting at angles)
- No player-player collision (players can overlap)
- Projectile-wall collision

#### 3. Bot AI System

```
Bot State Machine:
┌─────────────┐
│    Idle     │ ← No target visible
└──────┬──────┘
       │ Target spotted
       ▼
┌─────────────┐
│  Engaging   │ → Move to optimal range, shoot
└──────┬──────┘
       │ Low health (<30%)
       ▼
┌─────────────┐
│  Retreating │ → Find health pickup
└──────┬──────┘
       │ Health restored or safe
       └──────────────────┐
                          ▼
                   ┌─────────────┐
                   │  Looting    │ → Collect pickups
                   └─────────────┘
```

**Bot Capabilities:**
- Vision system (raycasting for line-of-sight)
- Sound awareness (hear gunshots, footsteps)
- Tactical positioning (maintain weapon optimal range)
- Cover seeking (when low health)
- Weapon preference (pick up better weapons)

#### 4. Combat System

```
Shoot Request:
├── Validate ammo
├── Create projectile
│   ├── Calculate velocity from angle
│   ├── Apply bloom (inaccuracy)
│   └── Set damage & owner
├── Broadcast shoot event
└── Decrement ammo

Projectile Update (every tick):
├── Move projectile
│   ├── Update position: x += vx * dt, y += vy * dt
│   ├── Track distance traveled
│   └── Check max range
├── Check collisions
│   ├── Player collision → Apply damage
│   ├── Wall collision → Destroy projectile (or penetrate if rifle)
│   └── Out of bounds → Destroy projectile
└── Cleanup dead projectiles
```

#### 5. State Synchronization

```
State Sync Flow:
┌──────────────┐
│ Game State   │ (Server authoritative)
└──────┬───────┘
       │ Every 1 second
       ▼
┌──────────────┐
│    Redis     │ (Persistent storage)
│  TTL: 5 min  │
└──────┬───────┘
       │ On server restart
       ▼
┌──────────────┐
│ Restore State│ (Load from Redis)
└──────────────┘
```

**Stored State:**
- Players (position, health, armor, kills, deaths, weapon, ammo)
- Bots (same as players)
- Metadata (next IDs, round state, timestamps)

---

## Client Architecture

### File Structure

```
public/
├── index.html              # Entry point
├── game.js (1226 lines)    # Main client
│   ├── Socket.io connection
│   ├── Input handling
│   ├── Rendering loop
│   ├── State interpolation
│   └── Mod hook invocations
│
├── modSystem.js (207 lines) # Mod engine
│   ├── Hook registration
│   ├── Mod loading/unloading
│   ├── Hot-reload system
│   └── Error isolation
│
├── modEditor.js (389 lines) # In-game editor
│   ├── UI rendering
│   ├── Code editing
│   ├── File loading
│   └── Keyboard shortcuts
│
└── mods/                   # Mod library
    ├── mods.json           # Mod manifest
    └── *.js                # Individual mods
```

### Client Game Loop

```
requestAnimationFrame loop (~60 FPS):
├── Calculate delta time (dt)
├── Update interpolation
│   └── Smooth player positions
├── Clear canvas
├── Render game world
│   ├── Draw background
│   ├── Draw pickups
│   ├── Draw players
│   │   └── Call onPlayerDraw hooks (per player)
│   ├── Draw projectiles
│   └── Draw particles
├── Render UI
│   ├── Draw HUD (health, ammo, kills)
│   ├── Draw scoreboard
│   └── Draw reconnect overlay (if disconnected)
├── Call onRender hooks
│   └── Mods draw custom overlays
└── Send input to server (60 Hz)
    ├── Movement (WASD)
    ├── Aim angle (mouse)
    ├── Shoot (click)
    └── Reload (R key)
```

### State Management

```javascript
// Client state (received from server)
gameState = {
  players: [...],      // All players
  pickups: [...],      // All pickups
  projectiles: [...]   // Active projectiles
}

// Client-only state
localState = {
  playerId: "",        // Local player ID
  camera: {x, y},      // Camera position
  input: {...},        // Current input state
  assets: {...}        // Loaded images/sounds
}
```

### Input System

```
Keyboard/Mouse Input:
├── WASD → movement vector
├── Mouse position → aim angle
├── Mouse click → shoot flag
├── R key → reload flag
└── Backtick → toggle mod editor

Input Processing:
├── Capture input state
├── Calculate movement vector
├── Calculate aim angle from mouse
├── Package into input object
└── Send to server (60 Hz)

Server validates and applies input.
```

---

## Mod System Architecture

### Mod Lifecycle

```
Mod Loading:
┌────────────────┐
│  User Action   │ (Load file or paste code)
└───────┬────────┘
        ▼
┌────────────────┐
│  loadMod()     │
│  modSystem.js  │
└───────┬────────┘
        │
        ├─→ Create sandbox context
        │   ├── game API
        │   ├── registerHook()
        │   └── console, Math, Date
        │
        ├─→ Execute mod code with Function()
        │   └── Mod registers hooks
        │
        ├─→ Store in mods Map
        │
        └─→ Return success/failure

Hook Execution:
┌────────────────┐
│  Game Event    │ (kill, hit, render, etc.)
└───────┬────────┘
        ▼
┌────────────────┐
│  callHook()    │
│  modSystem.js  │
└───────┬────────┘
        │
        ├─→ For each registered hook:
        │   ├── try { hook.fn(...args) }
        │   └── catch error → log, continue
        │
        └─→ All hooks executed independently
```

### Hook System Design

```javascript
// modSystem.js internal structure
class ModSystem {
  constructor() {
    this.mods = new Map();     // name -> {code, loaded}
    this.hooks = {
      onPlayerDraw: [],        // [{name, fn}, ...]
      onHit: [],
      onKill: [],
      onPickup: [],
      onShoot: [],
      onUpdate: [],
      onRender: []
    };
  }

  loadMod(name, code) {
    // Create isolated context
    const modContext = { game, registerHook, ... };

    // Execute mod code
    const modFunction = new Function("ctx", `with (ctx) { ${code} }`);
    modFunction(modContext);

    // Hooks now registered via registerHook()
  }

  callHook(hookName, ...args) {
    // Execute all registered hooks for this event
    for (const hook of this.hooks[hookName]) {
      try {
        hook.fn(...args);
      } catch (error) {
        console.error(`Error in mod "${hook.name}":`, error);
      }
    }
  }
}
```

### Mod Isolation

**What Mods Can Do:**
- Register hooks to receive events
- Draw on canvas (rendering context)
- Read game state (players, pickups, etc.)
- Access JavaScript APIs (Math, Date, console)

**What Mods Cannot Do:**
- Modify server game state (client-side only)
- Affect other players (local effects only)
- Access sensitive APIs (file system, network)
- Interfere with core game logic

**Error Isolation:**
- Each hook wrapped in try-catch
- Errors logged but don't crash game
- Failed hooks skipped, others continue
- Mod can be unloaded to stop errors

---

## Network Architecture

### Communication Protocol

```
Client ────────────► Server (Socket.io)
       │                  │
       │    Input         │
       │  (60 Hz)         │
       │                  │
       │                  ├─► Game Loop (60 Hz)
       │                  │   ├─► Process input
       │                  │   ├─► Update physics
       │                  │   ├─► Run AI
       │                  │   └─► Simulate combat
       │                  │
       │   State          │
       │  (30 Hz)         │
       │                  │
       ◄────────────────  │
```

### Message Types

#### Client → Server

**input** (60 Hz):
```javascript
{
  move: {x: 0, y: 1},    // WASD normalized vector
  aimAngle: 1.57,        // Mouse angle in radians
  shoot: true,           // Left click
  reload: false          // R key
}
```

**join**:
```javascript
{
  playerName: "Player1"
}
```

**purchaseMod**:
```javascript
{
  modId: "mod_12345"
}
```

#### Server → Client

**init**:
```javascript
{
  playerId: "socket_abc123",
  config: {
    worldWidth: 2000,
    worldHeight: 2000,
    weapons: {...}
  }
}
```

**state** (30 Hz):
```javascript
{
  players: [{id, name, x, y, health, armor, weapon, ...}],
  pickups: [{id, x, y, type, active}],
  projectiles: [{id, x, y, angle, damage}]
}
```

**Events:**
- `shoot` - Player fired weapon
- `hit` - Projectile hit player
- `kill` - Player killed
- `pickupCollected` - Item collected
- `playerJoined` - New player
- `playerLeft` - Player disconnected
- `respawn` - Player respawned

### Lag Compensation

```
Client shoots at time T0:
├── Client sends input with timestamp T0
├── Server receives at time T1 (T1 = T0 + latency)
├── Server rewinds world to T0
│   └── Restore player positions from T0
├── Server traces shot in rewound state
├── Server checks hit detection
├── Server applies damage
├── Server restores world to T1
└── Server broadcasts hit event

This ensures fair hits regardless of latency.
```

### State Interpolation

```
Client receives state snapshots at 30 Hz:

T0: Player at (100, 100)
T1: Player at (110, 105)

Client interpolates positions between snapshots:
├── Render at T0+10ms: lerp(T0, T1, 0.33) → (103, 102)
├── Render at T0+20ms: lerp(T0, T1, 0.66) → (107, 103)
└── Render at T0+30ms: lerp(T0, T1, 1.00) → (110, 105)

Result: Smooth 60 FPS rendering from 30 Hz updates.
```

---

## State Management

### Server State

```javascript
gameState = {
  players: Map<socketId, Player>,
  bots: Map<botId, Bot>,
  projectiles: Array<Projectile>,
  pickups: Array<Pickup>,
  soundEvents: Array<SoundEvent>,
  nextProjectileId: number,
  nextPickupId: number,
  nextBotId: number
}

Player/Bot = {
  id, name, x, y, vx, vy,
  aimAngle, health, armor,
  weapon, ammo, maxAmmo,
  kills, deaths, credits,
  activeMods, reloading, invulnerable
}

Projectile = {
  id, x, y, vx, vy, angle,
  damage, shooterId, weapon,
  distanceTraveled, maxRange
}

Pickup = {
  id, x, y, type, active, respawnAt
}
```

### Redis State Schema

```
Key: vibematch:players
Value: JSON array of player objects
TTL: 300 seconds (5 minutes, auto-renewed)

Key: vibematch:bots
Value: JSON array of bot objects
TTL: 300 seconds

Key: vibematch:metadata
Value: JSON object with game metadata
TTL: 300 seconds

Sync frequency: Every 1 second + on shutdown
```

### Client State

```javascript
// Received from server
gameState = {
  players: [],
  pickups: [],
  projectiles: []
}

// Local only
playerId = ""
camera = {x, y}
assets = {sprites, sounds}
input = {move, aimAngle, shoot, reload}
```

---

## Data Flow

### Complete Request Flow Example: Player Shoots

```
1. Client:
   ├── User clicks mouse
   ├── game.js captures click
   ├── Sets input.shoot = true
   └── Sends input to server (60 Hz)

2. Server:
   ├── Receives input event
   ├── Validates player can shoot
   │   ├── Has ammo?
   │   ├── Not reloading?
   │   └── Not on cooldown?
   ├── Creates projectile
   │   ├── Position: player.x, player.y
   │   ├── Angle: player.aimAngle + bloom
   │   ├── Velocity: weapon.projectileSpeed
   │   └── Damage: weapon.damage
   ├── Decrements ammo
   ├── Broadcasts "shoot" event to all clients
   └── Adds projectile to gameState

3. Game Loop (every tick):
   ├── Updates projectile position
   ├── Checks collisions
   │   ├── Hit player? → Apply damage → Broadcast "hit"
   │   ├── Hit wall? → Destroy projectile
   │   └── Out of range? → Destroy projectile
   └── Broadcasts updated state

4. All Clients:
   ├── Receive "shoot" event
   │   └── Call modSystem.callHook('onShoot', data)
   ├── Receive "hit" event (if hit)
   │   └── Call modSystem.callHook('onHit', data)
   ├── Receive state update
   └── Render projectiles

5. Mods (on hit client):
   ├── onShoot hooks execute
   │   └── Play shoot sound, muzzle flash, etc.
   └── onHit hooks execute
       └── Show hit marker, damage numbers, etc.
```

---

## Technology Stack

### Server

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Real-time:** Socket.io
- **State Persistence:** Redis
- **Database:** SQLite (mod-database.js)
- **Deployment:** Docker

### Client

- **Language:** Vanilla JavaScript (ES6+)
- **Rendering:** HTML5 Canvas 2D API
- **Real-time:** Socket.io Client
- **Module System:** ES6 Modules

### Infrastructure

- **Containerization:** Docker + Docker Compose
- **Web Server:** Nginx (reverse proxy)
- **Tunnel:** Cloudflare Tunnel
- **Deployment Strategy:** Blue-Green
- **State Persistence:** Redis

### Development Tools

- **Package Manager:** npm
- **Crash Prevention:** Process error handlers
- **Performance Monitoring:** Custom performance-monitor.js
- **Logging:** Console with structured format

---

## Design Patterns

### 1. Server-Authoritative Architecture

Server owns all game logic. Clients are "dumb terminals" that render and send input.

**Benefits:**
- Prevents cheating
- Consistent game state
- Simpler client code

### 2. Event-Driven Architecture

Socket.io events drive game state changes.

```javascript
socket.on('input', handleInput);
socket.on('join', handleJoin);
socket.emit('state', gameState);
socket.emit('hit', hitData);
```

### 3. Hook-Based Extension System

Mods extend functionality via hooks without modifying core.

```javascript
// Core game
modSystem.callHook('onKill', killerId, victimId);

// Mods register handlers
registerHook('onKill', (killerId, victimId) => {
  // Custom logic
});
```

### 4. State Machine (Bot AI)

Bots use finite state machine for behavior.

```
States: Idle → Engaging → Retreating → Looting
Transitions based on: health, ammo, target visibility
```

### 5. Object Pool Pattern (Projectiles)

Reuse projectile objects instead of creating/destroying.

```javascript
// Reuse projectile IDs
gameState.nextProjectileId++;

// Clean up old projectiles
projectiles = projectiles.filter(p => p.alive);
```

### 6. Observer Pattern (Socket Events)

Clients observe server state via event emissions.

```javascript
// Server notifies all observers
io.emit('state', gameState);

// Clients react
socket.on('state', (state) => { ... });
```

---

## Performance Considerations

### Server Performance

- **Tick Budget:** 16.67ms (60 Hz)
- **State Broadcast:** 33.33ms (30 Hz) to reduce bandwidth
- **Redis Sync:** 1 second interval (async, non-blocking)
- **AI Updates:** Only for active bots
- **Projectile Cleanup:** Remove out-of-bounds immediately

### Client Performance

- **Render Budget:** 16.67ms (60 FPS)
- **Mod Hooks:** Must be fast (~1-5ms total)
- **State Interpolation:** Reduces perceived lag
- **Canvas Optimization:** Minimize draw calls

### Network Performance

- **Input Rate:** 60 Hz (can be throttled if needed)
- **State Broadcast:** 30 Hz (balanced latency/bandwidth)
- **Event-Based:** Only send events when they occur
- **Compression:** Socket.io handles WebSocket compression

---

## Scaling Considerations

### Current Architecture (Single Server)

- **Capacity:** ~50-100 concurrent players
- **Bottleneck:** Single game loop thread
- **State:** Redis allows horizontal scaling

### Future Multi-Server Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Server 1   │     │  Server 2   │     │  Server 3   │
│  (Room A)   │     │  (Room B)   │     │  (Room C)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Shared    │
                    │    Redis    │
                    └─────────────┘
```

**Benefits:**
- 3 servers = ~150-300 players
- Isolated game rooms
- Independent scaling

---

## Security Considerations

### Server Security

- **Input Validation:** All player inputs validated
- **Rate Limiting:** Prevent spam (shoot, reload)
- **Cheat Detection:** Server checks impossible actions
- **Error Handling:** Uncaught exceptions don't crash server

### Client Security

- **Mod Sandboxing:** Limited API access
- **No File System:** Mods can't access files
- **Error Isolation:** Mod errors don't crash game
- **XSS Prevention:** No eval of user input (except mods)

### Network Security

- **WebSocket Only:** No raw TCP
- **Cloudflare Protection:** DDoS mitigation
- **No Sensitive Data:** No passwords, payment info
- **Firewall:** Only ports 22, 80 exposed

---

## See Also

- [GETTING_STARTED.md](GETTING_STARTED.md) - Setup guide
- [GAME_MECHANICS.md](GAME_MECHANICS.md) - Game rules
- [API_REFERENCE.md](API_REFERENCE.md) - Mod API
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production architecture
- [MOD_DEVELOPMENT.md](MOD_DEVELOPMENT.md) - Mod patterns
