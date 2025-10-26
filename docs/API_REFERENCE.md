# Mod System API Reference

Complete API documentation for the Vibematch Arena mod system.

## Table of Contents

- [Overview](#overview)
- [Hook System](#hook-system)
- [Game API](#game-api)
- [Rendering Context](#rendering-context)
- [Event Data Structures](#event-data-structures)
- [Utilities](#utilities)
- [Best Practices](#best-practices)
- [Performance Considerations](#performance-considerations)

## Overview

The mod system provides a hook-based architecture for extending game functionality. Mods run client-side only and can:

- React to game events (hits, kills, pickups, etc.)
- Draw custom overlays and HUD elements
- Access game state (players, pickups, projectiles)
- Manipulate rendering context

**Important:** Mods cannot modify server-side game logic or affect other players.

## Hook System

### registerHook(hookName, callback)

Register a callback function to be invoked when a specific game event occurs.

**Parameters:**
- `hookName` (string) - Name of the hook to register
- `callback` (function) - Function to call when event fires

**Example:**
```javascript
registerHook('onKill', (killerId, victimId) => {
  console.log(`${killerId} killed ${victimId}`);
});
```

### Available Hooks

#### onHit

Called when a player hits another player with a weapon.

**Signature:** `(shooterId, targetId, damage) => void`

**Parameters:**
- `shooterId` (string) - Socket ID of the shooter
- `targetId` (string) - Socket ID of the target
- `damage` (number) - Amount of damage dealt

**Frequency:** Variable (depends on combat)

**Example:**
```javascript
let totalDamage = 0;

registerHook('onHit', (shooterId, targetId, damage) => {
  if (shooterId === game.getPlayerId()) {
    totalDamage += damage;
    console.log(`Total damage dealt: ${totalDamage}`);
  }
});
```

**Source:** game.js:590

---

#### onKill

Called when a player kills another player.

**Signature:** `(killerId, victimId) => void`

**Parameters:**
- `killerId` (string) - Socket ID of the killer
- `victimId` (string) - Socket ID of the victim

**Frequency:** Variable (depends on combat)

**Example:**
```javascript
let killCount = 0;

registerHook('onKill', (killerId, victimId) => {
  if (killerId === game.getPlayerId()) {
    killCount++;
  }
});
```

**Source:** game.js:588

---

#### onShoot

Called when any player fires a weapon.

**Signature:** `(data) => void`

**Parameters:**
- `data` (object) - Shoot event data
  - `playerId` (string) - Socket ID of shooter
  - `x` (number) - World X position of shot
  - `y` (number) - World Y position of shot
  - `angle` (number) - Aim angle in radians
  - `weapon` (string) - Weapon type ('pistol', 'smg', 'shotgun', 'rifle')

**Frequency:** Variable (depends on player input)

**Example:**
```javascript
registerHook('onShoot', (data) => {
  if (data.playerId === game.getPlayerId() && data.weapon === 'shotgun') {
    console.log('You fired a shotgun!');
  }
});
```

**Source:** game.js:579

---

#### onPickup

Called when a player collects a pickup item.

**Signature:** `(playerId, pickup) => void`

**Parameters:**
- `playerId` (string) - Socket ID of player who collected item
- `pickup` (object) - Pickup item data
  - `id` (number) - Unique pickup ID
  - `x` (number) - World X position
  - `y` (number) - World Y position
  - `type` (string) - Pickup type (see Pickup Types below)
  - `active` (boolean) - Whether pickup is currently available

**Pickup Types:**
- `'health_small'` - +25 HP
- `'health_big'` - +50 HP
- `'armor_light'` - +50 armor
- `'armor_heavy'` - +100 armor
- `'ammo'` - +40% ammo

**Frequency:** Variable (~once per minute per player)

**Example:**
```javascript
registerHook('onPickup', (playerId, pickup) => {
  if (playerId === game.getPlayerId()) {
    console.log(`Collected ${pickup.type}`);
  }
});
```

**Source:** game.js:598

---

#### onPlayerDraw

Called every frame for each player, during the player rendering phase.

**Signature:** `(ctx, player, camera) => void`

**Parameters:**
- `ctx` (CanvasRenderingContext2D) - Canvas 2D context
- `player` (object) - Player entity (see Player Object below)
- `camera` (object) - Camera state
  - `x` (number) - Camera world X position
  - `y` (number) - Camera world Y position

**Frequency:** ~60 times per second per player (high frequency!)

**Example:**
```javascript
registerHook('onPlayerDraw', (ctx, player, camera) => {
  // Draw glow around enemies
  if (player.id !== game.getPlayerId() && player.health > 0) {
    const canvas = game.getCanvas();
    const screenX = (player.x - camera.x) + canvas.width / 2;
    const screenY = (player.y - camera.y) + canvas.height / 2;

    ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 25, 0, Math.PI * 2);
    ctx.stroke();
  }
});
```

**Source:** game.js:871

**Warning:** This hook is called frequently. Keep logic lightweight!

---

#### onRender

Called every frame after all game rendering is complete. Use for custom HUD elements and overlays.

**Signature:** `(ctx, camera, dt) => void`

**Parameters:**
- `ctx` (CanvasRenderingContext2D) - Canvas 2D context
- `camera` (object) - Camera state
  - `x` (number) - Camera world X position
  - `y` (number) - Camera world Y position
- `dt` (number) - Delta time in seconds since last frame

**Frequency:** ~60 times per second (high frequency!)

**Example:**
```javascript
registerHook('onRender', (ctx, camera, dt) => {
  // Draw custom HUD
  ctx.fillStyle = 'white';
  ctx.font = '20px monospace';
  ctx.fillText('My Custom HUD', 10, 100);

  // Draw world-space marker
  const canvas = game.getCanvas();
  const markerWorldX = 1000;
  const markerWorldY = 1000;
  const screenX = (markerWorldX - camera.x) + canvas.width / 2;
  const screenY = (markerWorldY - camera.y) + canvas.height / 2;

  ctx.fillStyle = 'yellow';
  ctx.beginPath();
  ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
  ctx.fill();
});
```

**Source:** game.js:876

**Warning:** This hook is called every frame. Optimize rendering code!

---

#### onUpdate

Called every frame for custom game logic updates.

**Signature:** `(dt) => void`

**Parameters:**
- `dt` (number) - Delta time in seconds since last frame

**Frequency:** ~60 times per second (high frequency!)

**Status:** Currently NOT invoked by game.js. Reserved for future use.

**Example:**
```javascript
let timer = 0;

registerHook('onUpdate', (dt) => {
  timer += dt;
  if (timer >= 1.0) {
    console.log('One second elapsed');
    timer = 0;
  }
});
```

**Warning:** This hook is not currently called. Do not rely on it.

---

## Game API

The `game` object provides access to game state and utility methods.

### game.getState()

Returns the current game state snapshot.

**Returns:** Object containing:
```javascript
{
  players: Array<Player>,      // All players (alive and dead)
  pickups: Array<Pickup>,      // All pickup items
  projectiles: Array<Projectile> // Active projectiles
}
```

**Example:**
```javascript
const state = game.getState();
console.log(`${state.players.length} players in game`);
console.log(`${state.pickups.filter(p => p.active).length} active pickups`);
```

---

### game.getPlayerId()

Returns the local player's socket ID.

**Returns:** string - Socket ID of the local player

**Example:**
```javascript
const myId = game.getPlayerId();
const myPlayer = game.getState().players.find(p => p.id === myId);
console.log(`My health: ${myPlayer.health}`);
```

---

### game.getCamera()

Returns the current camera position.

**Returns:** Object
```javascript
{
  x: number,  // Camera world X position
  y: number   // Camera world Y position
}
```

**Example:**
```javascript
const camera = game.getCamera();
console.log(`Camera at (${camera.x}, ${camera.y})`);
```

---

### game.getCanvas()

Returns the HTML5 canvas element.

**Returns:** HTMLCanvasElement

**Example:**
```javascript
const canvas = game.getCanvas();
console.log(`Canvas size: ${canvas.width}x${canvas.height}`);
```

---

### game.getContext()

Returns the 2D rendering context.

**Returns:** CanvasRenderingContext2D

**Example:**
```javascript
const ctx = game.getContext();
ctx.fillStyle = 'red';
ctx.fillRect(10, 10, 50, 50);
```

---

### game.getAssets()

Returns loaded game assets (sprites, sounds, etc.).

**Returns:** Object containing asset maps

**Example:**
```javascript
const assets = game.getAssets();
// Access loaded sprites, sounds, etc.
```

---

## Rendering Context

All rendering hooks receive a CanvasRenderingContext2D object. Key methods:

### Drawing Shapes

```javascript
// Rectangle
ctx.fillStyle = 'red';
ctx.fillRect(x, y, width, height);

// Circle
ctx.fillStyle = 'blue';
ctx.beginPath();
ctx.arc(x, y, radius, 0, Math.PI * 2);
ctx.fill();

// Line
ctx.strokeStyle = 'green';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.stroke();
```

### Drawing Text

```javascript
ctx.fillStyle = 'white';
ctx.font = '20px monospace';
ctx.textAlign = 'left';  // 'left', 'center', 'right'
ctx.textBaseline = 'top';  // 'top', 'middle', 'bottom'
ctx.fillText('Hello World', x, y);
```

### Transformations

```javascript
// Save context state
ctx.save();

// Apply transformations
ctx.translate(x, y);
ctx.rotate(angle);
ctx.scale(scaleX, scaleY);

// Draw with transformations
ctx.fillRect(0, 0, 50, 50);

// Restore context state
ctx.restore();
```

### Transparency

```javascript
ctx.globalAlpha = 0.5;  // 50% transparent
ctx.fillRect(x, y, width, height);
ctx.globalAlpha = 1.0;  // Reset to opaque
```

### Screen vs World Coordinates

Convert world coordinates to screen coordinates:

```javascript
const camera = game.getCamera();
const canvas = game.getCanvas();

const screenX = (worldX - camera.x) + canvas.width / 2;
const screenY = (worldY - camera.y) + canvas.height / 2;
```

---

## Event Data Structures

### Player Object

```javascript
{
  id: string,              // Socket ID
  name: string,            // Player name
  x: number,               // World X position
  y: number,               // World Y position
  vx: number,              // Velocity X (for speedometer)
  vy: number,              // Velocity Y
  aimAngle: number,        // Aim angle in radians
  health: number,          // Current health (0-100)
  maxHealth: number,       // Maximum health (100)
  armor: number,           // Current armor (0-100)
  weapon: string,          // Current weapon type
  ammo: number,            // Current ammo count
  maxAmmo: number,         // Max ammo for weapon
  kills: number,           // Kill count
  deaths: number,          // Death count
  reloading: boolean,      // Is currently reloading
  invulnerable: boolean,   // Spawn protection active
  credits: number,         // In-game currency (for mods)
  activeMods: Array<string> // Active mod IDs
}
```

### Pickup Object

```javascript
{
  id: number,              // Unique pickup ID
  x: number,               // World X position
  y: number,               // World Y position
  type: string,            // Pickup type (see Pickup Types)
  active: boolean,         // Is currently available
  respawnTime: number      // When it will respawn (server tick)
}
```

### Projectile Object

```javascript
{
  id: number,              // Unique projectile ID
  x: number,               // World X position
  y: number,               // World Y position
  vx: number,              // Velocity X
  vy: number,              // Velocity Y
  angle: number,           // Travel angle in radians
  shooterId: string,       // Socket ID of shooter
  weapon: string,          // Weapon type
  damage: number           // Damage on hit
}
```

---

## Utilities

### Available in Mod Context

Mods have access to these global objects:

```javascript
// Game API
game.getState()
game.getPlayerId()
game.getCamera()
game.getCanvas()
game.getContext()
game.getAssets()

// Hook registration
registerHook(hookName, callback)

// JavaScript built-ins
console.log()
Math.PI, Math.sin(), Math.cos(), etc.
Date.now()
```

### Helper Functions

Create your own utility functions within mods:

```javascript
// Distance between two points
function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Angle between two points
function angleBetween(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

// Linear interpolation
function lerp(a, b, t) {
  return a + (b - a) * t;
}
```

---

## Best Practices

### 1. Check Player Existence

Always verify players exist before accessing properties:

```javascript
registerHook('onRender', (ctx) => {
  const state = game.getState();
  const myPlayer = state.players.find(p => p.id === game.getPlayerId());

  if (myPlayer && myPlayer.health > 0) {
    // Safe to use myPlayer
  }
});
```

### 2. Use Try-Catch for Robustness

Wrap risky operations in try-catch:

```javascript
registerHook('onRender', (ctx) => {
  try {
    // Your rendering code
  } catch (error) {
    console.error('Render error:', error);
  }
});
```

### 3. Clean Up Resources

Reset state when appropriate:

```javascript
let particles = [];

registerHook('onKill', (killerId, victimId) => {
  // Add particles
  particles.push({life: 1.0, x: 100, y: 100});
});

registerHook('onRender', (ctx, camera, dt) => {
  // Update and remove dead particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].life -= dt;
    if (particles[i].life <= 0) {
      particles.splice(i, 1);  // Clean up
    }
  }
});
```

### 4. Minimize Allocations in Render Hooks

Avoid creating objects in high-frequency hooks:

```javascript
// BAD: Creates new array every frame
registerHook('onRender', (ctx) => {
  const enemies = game.getState().players.filter(p => p.id !== game.getPlayerId());
});

// GOOD: Reuse state
registerHook('onRender', (ctx) => {
  const state = game.getState();
  const myId = game.getPlayerId();

  for (const player of state.players) {
    if (player.id !== myId) {
      // Process enemy
    }
  }
});
```

### 5. Save and Restore Context State

Always restore context after transformations:

```javascript
registerHook('onRender', (ctx) => {
  ctx.save();

  ctx.translate(100, 100);
  ctx.rotate(Math.PI / 4);
  // ... draw transformed content

  ctx.restore();  // Restore for other mods
});
```

---

## Performance Considerations

### High-Frequency Hooks

These hooks run every frame (~60 FPS):
- `onPlayerDraw` - Called per player per frame
- `onRender` - Called once per frame

**Guidelines:**
- Keep logic simple and fast
- Avoid heavy calculations
- Cache computed values
- Limit drawing operations

### Event-Based Hooks

These hooks only fire on events:
- `onHit` - Only during combat
- `onKill` - Only on kills
- `onShoot` - Only when shooting
- `onPickup` - Only when collecting items

**Guidelines:**
- Can do more complex logic
- Still avoid blocking operations
- Don't modify game state objects

### Memory Management

```javascript
// BAD: Memory leak
let allHits = [];
registerHook('onHit', (shooterId, targetId, damage) => {
  allHits.push({shooterId, targetId, damage});  // Grows forever!
});

// GOOD: Bounded array
const MAX_HITS = 100;
let recentHits = [];
registerHook('onHit', (shooterId, targetId, damage) => {
  recentHits.push({shooterId, targetId, damage});
  if (recentHits.length > MAX_HITS) {
    recentHits.shift();  // Remove oldest
  }
});
```

### Profiling

Monitor mod performance:

```javascript
let totalTime = 0;
let callCount = 0;

registerHook('onRender', (ctx, camera, dt) => {
  const start = performance.now();

  // Your rendering code

  const elapsed = performance.now() - start;
  totalTime += elapsed;
  callCount++;

  if (callCount % 60 === 0) {
    console.log(`Avg render time: ${(totalTime / callCount).toFixed(2)}ms`);
  }
});
```

---

## Error Handling

### Automatic Error Isolation

The mod system automatically catches errors in hooks:

```javascript
registerHook('onRender', (ctx) => {
  throw new Error('This will not crash the game!');
  // Error is logged to console, other mods continue running
});
```

### Debugging

Check browser console (F12) for:
- Mod load errors
- Runtime errors in hooks
- Performance warnings

Example error output:
```
❌ Error in mod "my-mod" hook "onRender": Cannot read property 'x' of undefined
```

---

## Examples

### Complete Mod: FPS Counter

```javascript
let fps = 0;
let frames = 0;
let lastTime = Date.now();

registerHook('onRender', (ctx) => {
  frames++;
  const now = Date.now();

  if (now - lastTime >= 1000) {
    fps = frames;
    frames = 0;
    lastTime = now;
  }

  ctx.fillStyle = '#00ff00';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`FPS: ${fps}`, 10, 30);
});
```

### Complete Mod: Death Counter

```javascript
let deaths = 0;

registerHook('onKill', (killerId, victimId) => {
  if (victimId === game.getPlayerId()) {
    deaths++;
  }
});

registerHook('onRender', (ctx) => {
  ctx.fillStyle = '#ff0000';
  ctx.font = '18px monospace';
  ctx.fillText(`Deaths: ${deaths}`, 10, 50);
});
```

### Complete Mod: Player Distance Indicator

```javascript
registerHook('onRender', (ctx, camera) => {
  const state = game.getState();
  const myId = game.getPlayerId();
  const myPlayer = state.players.find(p => p.id === myId);

  if (!myPlayer || myPlayer.health <= 0) return;

  const canvas = game.getCanvas();

  for (const player of state.players) {
    if (player.id === myId || player.health <= 0) continue;

    const dx = player.x - myPlayer.x;
    const dy = player.y - myPlayer.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const screenX = (player.x - camera.x) + canvas.width / 2;
    const screenY = (player.y - camera.y) + canvas.height / 2;

    ctx.fillStyle = 'white';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(dist)}px`, screenX, screenY - 30);
  }
});
```

---

## See Also

- [MOD_DEVELOPMENT.md](MOD_DEVELOPMENT.md) - Mod development tutorial for AI agents
- [MODS.md](../MODS.md) - Original mod system documentation
- [QUICK_REFERENCE.md](../QUICK_REFERENCE.md) - Internal technical reference
- [MOD_SYSTEM_ARCHITECTURE.md](../MOD_SYSTEM_ARCHITECTURE.md) - Deep dive into architecture
