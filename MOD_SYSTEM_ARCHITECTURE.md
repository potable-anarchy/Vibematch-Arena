# Vibe-Kanban Mod System Architecture Analysis

## Executive Summary

The game features a **client-side, live-coding mod system** with a simple hook-based architecture. Mods are loaded dynamically using Function constructor with sandboxed context. The system currently has basic error handling but lacks robust error isolation and hot-reload recovery mechanisms.

---

## 1. MOD LOADING & REGISTRATION

### Current Flow

```
User Action (File load / Manual code)
    ↓
modSystem.loadMod(name, code)
    ↓
Function(ctx) Constructor executes code
    ↓
registerHook() callbacks registered to this.hooks
    ↓
Mod stored in this.mods Map
```

### Key Files

**Location**: `/public/modSystem.js`

**Core Methods**:

1. **`loadModFromFile(filename, skipCache)`** (lines 30-49)
   - Fetches mod file from `/mods/{filename}`
   - Adds cache-busting timestamp
   - Calls `loadMod()` with fetched code

2. **`loadMod(name, code)`** (lines 75-113)
   - **Sandboxing**: Uses `new Function()` with `with (ctx) { ... }`
   - **Context**: Provides `game`, `registerHook`, `console`, `Math`, `Date`
   - **Error Handling**: Try-catch with console logging only
   - **Storage**: Stores in `this.mods` Map with timestamp

3. **`unloadMod(name)`** (lines 116-126)
   - Removes all hooks registered by the mod
   - Deletes from mods Map
   - No cleanup of global state modified by mod

4. **`reloadMod(name, code)`** (lines 129-132)
   - Calls `unloadMod()` then `loadMod()`
   - Simple but doesn't handle failed reloads

### Sandboxing Mechanism

```javascript
// Current sandboxing approach
const modFunction = new Function("ctx", `
  with (ctx) {
    ${code}
  }
`);
modFunction(modContext);
```

**Provided Context** (lines 82-92):
```javascript
const modContext = {
  game: this.game,           // Game object with state accessors
  registerHook: (hookName, fn) => {...},
  console: console,          // Full console access
  Math: Math,                // Full Math access
  Date: Date,                // Full Date access
};
```

**Issues**:
- No protection against infinite loops or long-running code
- No timeout mechanism
- Mods can access any global JavaScript APIs
- `with` statement is deprecated and allows subtle bugs

---

## 2. HOOK SYSTEM

### Available Hooks

**Defined in modSystem.js constructor** (lines 6-14):

```javascript
this.hooks = {
  onPlayerDraw: [],   // Per-player rendering
  onHit: [],          // Combat events
  onKill: [],         // Kill events
  onPickup: [],       // Item pickup events
  onShoot: [],        // Weapon fire
  onUpdate: [],       // Frame updates (unused)
  onRender: [],       // Post-render overlay
};
```

### Hook Registration

**Used in mods**: `registerHook(hookName, fn)`

**Example** (from screen-shake.js):
```javascript
registerHook('onHit', (shooterId, targetId, damage) => {
  // Mod code here
});
```

### Hook Invocation

**Method**: `callHook(hookName, ...args)` (lines 135-145)

```javascript
callHook(hookName, ...args) {
  if (!this.hooks[hookName]) return;
  
  for (const hook of this.hooks[hookName]) {
    try {
      hook.fn(...args);
    } catch (error) {
      console.error(`Error in mod "${hook.name}" hook...`, error);
    }
  }
}
```

**Current Error Handling**: 
- Try-catch per hook invocation
- Logs error to console
- **Continues execution** (doesn't crash game)
- But mod state may be corrupted

### Hook Call Sites

**game.js** calls hooks at:
- Line 579: `onShoot` when player fires
- Line 588: `onKill` when someone dies
- Line 590: `onHit` when someone takes damage
- Line 598: `onPickup` when item collected
- Line 871: `onPlayerDraw` per player per frame
- Line 876: `onRender` after all rendering

---

## 3. SERVER-SIDE CODE ORGANIZATION

**File**: `/server.js` (59,813 bytes, ~1,949 lines)

### Architecture Overview

```
Server Architecture:
├── Crash Prevention (lines 10-45)
├── Express + Socket.io Setup (lines 47-57)
├── Game State Management (lines 68-78)
├── Game Configuration (lines 80-254)
├── Game Logic (lines 285-1938)
│   ├── Physics & Collision (lines 323-524)
│   ├── Bot AI (lines 256-689)
│   ├── Game Loop (lines 1062-1938)
│   └── Socket Event Handlers (lines 877-995)
└── Server Initialization (lines 1940-1948)
```

### Key Features

**Crash Prevention** (lines 10-45):
```javascript
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
  // Don't exit - keep server alive
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
  // Don't exit - keep server alive
});
```

**Game Loop Protection** (lines 1068-1938):
```javascript
function gameLoop() {
  try {
    // Game logic here
  } catch (error) {
    console.error('❌ Error in game loop:', error);
    // Don't crash - continue next tick
  }
}
setInterval(gameLoop, TICK_INTERVAL);
```

### Socket Event Handlers

**Connection Events** (lines 878-995):
- `connection`: Player joins
- `join`: Create player, send init
- `input`: Update player movement/aim
- `spectate`: Switch to spectator mode
- `disconnect`: Remove player
- `error`: Log socket errors

**All handlers wrapped in try-catch** to prevent crashes.

### Game State Structure

```javascript
const gameState = {
  players: new Map(),      // Player ID → Player object
  bots: new Map(),         // Bot ID → Bot object
  projectiles: [],         // Array of active bullets
  pickups: [],             // Array of health/ammo items
  nextProjectileId: 0,
  nextPickupId: 0,
  nextBotId: 0,
  soundEvents: [],         // Sound events for bot hearing
};
```

### Server Responsibilities

1. **Player/Bot Management**: Create, update, delete
2. **Physics Simulation**: Collision, movement, wall sliding
3. **Combat System**: Projectiles, damage, kills
4. **AI System**: Bot pathfinding, decision-making
5. **Pickup System**: Items on ground, collection, respawn
6. **State Broadcast**: Send state to all clients every 30ms

**No server-side mod system** - mods are client-only.

---

## 4. MOD EDITOR IMPLEMENTATION

**File**: `/public/modEditor.js` (389 lines)

### UI Components

**Main Elements**:
- Floating editor window (fixed position, draggable)
- Mod name input field
- Code textarea with monospace font
- File browser dropdown (loads from `/mods/mods.json`)
- Three action buttons: LOAD, RELOAD, UNLOAD
- Status display line

### Key Methods

**`createUI()`** (lines 10-236)
- Creates floating window with header, editor, controls
- Sets up event listeners
- Makes window draggable
- Loads available mods from manifest

**`loadCurrentMod()`** (lines 285-300)
- Gets name from input, code from textarea
- Calls `modSystem.loadMod()`
- Shows status message

**`reloadCurrentMod()`** (lines 302-317)
- Same as load, but calls `reloadMod()`

**`unloadCurrentMod()`** (lines 319-329)
- Removes mod and clears hooks

**Keyboard Shortcuts**:
- Backtick (`) - Toggle editor visibility
- Ctrl/Cmd + Enter - Reload current mod

### Manifest Loading

**`loadAvailableMods()`** (lines 336-353)
```javascript
fetch("/mods/mods.json")
  .then(response => response.json())
  .then(data => {
    // Populate dropdown with mod files
    data.mods.forEach(mod => {
      // Create option element
    });
  });
```

**Expected Format** (from `/public/mods/mods.json`):
```json
{
  "mods": [
    {
      "name": "Walls and Obstacles",
      "file": "walls-and-obstacles.js",
      "description": "Adds walls...",
      "enabled": true
    },
    ...
  ]
}
```

---

## 5. ERROR HANDLING ANALYSIS

### Current Error Handling

**In modSystem.js**:

1. **loadMod()** (lines 75-113):
   ```javascript
   try {
     const modFunction = new Function("ctx", `with (ctx) { ${code} }`);
     modFunction(modContext);
     this.mods.set(name, { code, loaded: Date.now() });
     console.log(`✅ Mod loaded: ${name}`);
     return { success: true, message: `...` };
   } catch (error) {
     console.error(`❌ Error loading mod "${name}":`, error);
     return { success: false, message: error.message };
   }
   ```

2. **callHook()** (lines 135-145):
   ```javascript
   for (const hook of this.hooks[hookName]) {
     try {
       hook.fn(...args);
     } catch (error) {
       console.error(`Error in mod "${hook.name}" hook...`, error);
     }
   }
   ```

3. **Hot-reload polling** (lines 156-195):
   ```javascript
   try {
     // Fetch and check for changes
   } catch (error) {
     // Silently ignore polling errors
   }
   ```

### Gaps in Error Handling

1. **No isolation**: One mod's error can affect others
2. **No state rollback**: Failed reload leaves mod in partial state
3. **No timeout protection**: Infinite loops can freeze game
4. **No debug info**: Users don't know which mod caused error
5. **No disabled mods list**: Failed mods keep running hooks
6. **No recovery**: Can't easily fix a broken mod
7. **No performance monitoring**: Slow mods aren't detected
8. **Hook failures cascade**: Later hooks not called if one fails

### Failure Scenarios

| Scenario | Current Behavior | Impact |
|----------|-----------------|--------|
| Syntax error in mod | Caught, logged, mod not loaded | None - prevents load |
| Runtime error in hook | Caught, logged, hook skipped | Partial feature loss |
| Hook modifies global state (e.g., `game.x = null`) | Not caught | Cascading failures |
| Infinite loop in hook | Not caught, game freezes | **Game freeze** |
| Memory leak (large arrays) | Not caught | **Memory leak** |
| Multiple mod reloads in quick succession | Not prevented | **State corruption** |

---

## 6. HOT-RELOAD MECHANISM

**Implemented in**: modSystem.js, lines 156-195

### Current Implementation

```javascript
async enableHotReload(pollInterval = 2000) {
  // Store file hashes for change detection
  this.fileHashes = new Map();
  
  setInterval(async () => {
    try {
      // Fetch mods.json
      const response = await fetch(`/mods/mods.json?t=${Date.now()}`);
      const data = await response.json();
      const enabledMods = data.mods.filter(mod => mod.enabled);
      
      for (const mod of enabledMods) {
        // Fetch mod file with cache-buster
        const fileResponse = await fetch(`/mods/${mod.file}?t=${Date.now()}`);
        const code = await fileResponse.text();
        const hash = this.simpleHash(code);
        
        // Compare hashes
        const prevHash = this.fileHashes.get(modName);
        if (prevHash && prevHash !== hash) {
          // File changed - reload it
          this.reloadMod(modName, code);
        }
        
        this.fileHashes.set(modName, hash);
      }
    } catch (error) {
      // Silently ignore polling errors
    }
  }, pollInterval);
}
```

**Status**: Disabled in game.js (line 135):
```javascript
// modSystem.enableHotReload(2000); // Disabled - causing CORS issues
```

### Limitations

1. **CORS Issues**: Cross-origin requests fail in some deployments
2. **Polling-based**: Wasteful, not event-driven
3. **No state preservation**: Reload loses mod variables
4. **No version control**: Can't roll back failed reload
5. **Hash collision risk**: Simple hash function may collide
6. **No delta detection**: Reloads entire mod even if small change

---

## 7. CLIENT-SERVER COMMUNICATION

### Socket Events (Client → Server)

**On game.js**:

1. **`join`** (line 261): Player joins with name
2. **`input`** (line 622): Every 16ms - movement, aim, shoot, reload
3. **`spectate`** (line 445): Switch to spectator mode

**On server**:
```javascript
socket.on("join", (playerName) => {
  // Validate, create player, send "init"
});

socket.on("input", (input) => {
  // Update player velocity, aim, shoot
});

socket.on("disconnect", () => {
  // Remove player
});
```

### Socket Events (Server → Client)

**Broadcast Events**:

1. **`init`** - Player initialization with config
2. **`state`** - Game state (players, projectiles, pickups) every 30ms
3. **`shoot`** - Weapon fired notification
4. **`hit`** - Projectile hit player
5. **`pickupCollected`** - Item collected
6. **`wallImpact`** - Projectile hit wall
7. **`respawn`** - Player respawned
8. **`playerJoined`** - New player joined
9. **`playerLeft`** - Player disconnected
10. **`playerCount`** - Total active players
11. **`serverFull`** - Max players reached

### Data Flow for Combat

```
Client (game.js)
  ↓ emit "input" with shoot=true every 16ms
Server (server.js)
  ↓ handleShoot() → creates projectile
  ↓ game loop updates projectiles
  ↓ checks collisions
  ↓ on hit: damagePlayer() + emit "hit"
Client (game.js)
  ↓ receives "hit" event
  ↓ calls modSystem.callHook("onHit", ...)
  ↓ mods react (sound, screen shake, etc)
```

**NOTE**: Mods receive events AFTER server processes them - no mod-influenced server behavior.

---

## 8. REAL-WORLD MOD EXAMPLES

### Example 1: Sound Effects (sound-effects.js)

**Complexity**: High
**Hooks Used**: onShoot, onHit, onKill

**Key Features**:
- Uses Web Audio API for sound generation/playback
- Distance-based volume falloff
- Shot cooldown (prevents spam)
- Async preloading of sounds

**Error Risks**:
- Audio context resume failures
- Failed sound preload silently ignored
- No error handling in playWithVolume()

### Example 2: Screen Shake (screen-shake.js)

**Complexity**: Medium
**Hooks Used**: onHit, onKill, onShoot, onRender

**Key Features**:
- Accumulates shake intensity
- Applies decay each frame
- Modifies canvas transform in onRender

**Error Risks**:
- If onRender fails, game still functions
- Intensity accumulation never resets on mod reload

### Example 3: Better HUD v2 (better-hud-v2.js)

**Complexity**: High (file not shown but referenced)
**Hooks Used**: onRender

**Features**: FPS counter, ammo warnings, speed indicator

---

## 9. MANIFEST SYSTEM

**File**: `/public/mods/mods.json`

**Format**:
```json
{
  "mods": [
    {
      "name": "Display Name",
      "file": "filename.js",
      "description": "What it does",
      "enabled": true/false
    }
  ]
}
```

**Usage**:
- Auto-loaded on game start if `enabled: true`
- Listed in mod editor dropdown
- No ordering enforcement (loaded in order)
- Hot-reload checks this to determine which mods to monitor

**Issues**:
- No versioning
- No dependencies
- No load order specification
- Manual sync with actual files required

---

## 10. ARCHITECTURE STRENGTHS & WEAKNESSES

### Strengths

1. **Simple & Accessible**: Easy for non-developers to create mods
2. **Hot-reloadable**: Instant feedback during development
3. **Flexible Hooks**: Cover most game events
4. **Per-hook Error Isolation**: One hook failure doesn't stop others
5. **Server Stability**: Strong crash prevention on server
6. **Clean Separation**: Mods don't interfere with core game

### Weaknesses

1. **Minimal Sandboxing**: Mods can modify globals, cause memory leaks
2. **No Timeout Protection**: Infinite loops freeze game
3. **No State Isolation**: Hooks see actual game objects, can corrupt them
4. **Poor Reload Recovery**: No rollback, no before/after snapshots
5. **Limited Debugging**: No mod execution profiling or stack traces
6. **No Dependency System**: Mods can't depend on other mods
7. **No Version Control**: Can't track mod changes or roll back
8. **Server-unaware**: Server has no knowledge of client mods
9. **Hook Ordering**: No control over hook execution order
10. **No Context Passing**: modContext doesn't include enough utility functions

---

## RECOMMENDATIONS FOR ROBUST HOT-RELOAD

### Tier 1: High Impact, Low Effort

1. **Mod State Snapshots**
   - Save `this.hooks` state before reload
   - Restore on failed reload
   
2. **Disabled Mods List**
   - Track mods that failed to load
   - Don't try to reload them
   - Show warning in editor

3. **Execution Timeout**
   - Wrap hook execution with setTimeout
   - Terminate hooks that take >100ms
   
4. **Hook Ordering**
   - Support `priority` in hook registration
   - Execute critical mods first

### Tier 2: Medium Impact, Medium Effort

5. **Mod Profiling**
   - Time each hook execution
   - Warn on slow hooks (>10ms)
   - Show stats in editor

6. **Context Isolation**
   - Provide `modAPI` object instead of global game
   - Prevent access to window/document
   - Whitelist safe functions

7. **Reload Diff**
   - Show what changed between versions
   - Allow selective hook reloading

8. **Stack Traces**
   - Improve error reporting
   - Include mod name and line numbers
   - Syntax highlighting for errors

### Tier 3: High Impact, High Effort

9. **Web Worker Isolation**
   - Run mods in separate worker threads
   - Prevents UI blocking on errors
   - Better error isolation

10. **Dependency System**
    - Allow mods to declare dependencies
    - Auto-load dependencies
    - Version compatibility checking

11. **Server-side Validation**
    - Validate mods before allowing load
    - Prevent cheating/hacks
    - Rate-limit mod operations

12. **Persistent State**
    - Save mod state to localStorage
    - Restore on reload
    - Optional JSON serialization

---

## REFERENCE DOCUMENTATION

### File Locations

| Component | Location | Size | Lines |
|-----------|----------|------|-------|
| modSystem.js | /public/modSystem.js | ~8KB | 207 |
| modEditor.js | /public/modEditor.js | ~13KB | 389 |
| game.js | /public/game.js | ~50KB | 1,226 |
| server.js | /server.js | ~59KB | 1,949 |
| mods.json | /public/mods/mods.json | ~2.5KB | 88 |

### Hook Call Frequency

| Hook | Called | Frequency |
|------|--------|-----------|
| onRender | Every frame | ~60x/sec |
| onPlayerDraw | Per player per frame | ~600x/sec (10 players) |
| onShoot | Per shot | Variable (player input) |
| onHit | Per hit | Variable (combat) |
| onKill | Per kill | Variable (combat) |
| onPickup | Per pickup | Variable (~once/min) |
| onUpdate | Never | 0x/sec |

### Game Constants

```javascript
TICK_RATE: 60                // Server ticks per second
WORLD_WIDTH: 2000
WORLD_HEIGHT: 2000
PLAYER_RADIUS: 20
PLAYER_SPEED: 250 px/sec
PLAYER_MAX_HEALTH: 100
STATE_BROADCAST_INTERVAL: 1000/30ms  // 30 updates/sec to clients
INTERPOLATION_TIME: 100ms   // Client-side position smoothing
```

### Default Enabled Mods

1. HUD Layout Manager (core system)
2. Walls and Obstacles
3. Weapon Pickups
4. Screen Shake
5. Hit Markers
6. Sound Effects
7. Killstreak Announcer
8. Leaderboard Overlay
9. Better HUD v2
10. Minimap v2

---

## SUMMARY

The mod system is **intentionally simple** to keep the barrier to entry low. It trades safety for accessibility. For a production system handling untrusted code, significant hardening would be required. However, for a game where all mods are written by trusted players in a game session, the current approach is reasonable and effective.

The main risk vectors are:
1. Infinite loops (can freeze game)
2. Memory leaks (can crash browser)
3. Hook order dependencies (can cause subtle bugs)
4. Reload state corruption (can require page refresh)

These are addressed in the Tier 1 recommendations which would significantly improve robustness without major refactoring.
