# Vibe-Kanban Mod System - Quick Reference

## Critical File Locations

### Core Mod System Files
- **modSystem.js**: `/public/modSystem.js` (207 lines)
  - `loadMod(name, code)` - Load and execute mod code
  - `callHook(hookName, ...args)` - Invoke registered hooks
  - `reloadMod(name, code)` - Reload mod with new code

- **modEditor.js**: `/public/modEditor.js` (389 lines)
  - UI for in-game mod editing
  - Load/reload/unload functionality
  - Backtick (`) to open, Ctrl+Enter to reload

- **game.js**: `/public/game.js` (1,226 lines)
  - Main client loop
  - Calls mod hooks at events
  - Lines 579, 588, 590, 598, 871, 876 are hook call sites

### Game Logic
- **server.js**: `/server.js` (1,949 lines)
  - Server-side physics, AI, combat
  - Strong crash prevention (lines 10-45)
  - Game loop with error handling (lines 1068-1938)

- **mods.json**: `/public/mods/mods.json`
  - Lists available mods with enabled/disabled status
  - Used for auto-load on startup

## Available Hooks

```javascript
// Defined in modSystem.js constructor
this.hooks = {
  onPlayerDraw: [],   // (ctx, player, camera) - per-player rendering
  onHit: [],          // (shooterId, targetId, damage) - hit event
  onKill: [],         // (killerId, victimId) - kill event
  onPickup: [],       // (playerId, pickup) - pickup collected
  onShoot: [],        // (data) - weapon fired {playerId, x, y, angle, weapon}
  onUpdate: [],       // (dt) - frame update (NOT CURRENTLY CALLED)
  onRender: [],       // (ctx, camera, dt) - post-render overlay
};
```

## Hook Invocation Code

```javascript
// From game.js line 579
modSystem.callHook("onShoot", data);

// From game.js line 588
modSystem.callHook("onKill", data.shooterId, data.targetId);

// From game.js line 590
modSystem.callHook("onHit", data.shooterId, data.targetId, data.damage);

// From game.js line 598
modSystem.callHook("onPickup", data.playerId, pickup);

// From game.js line 871
modSystem.callHook("onPlayerDraw", ctx, p, camera);

// From game.js line 876
modSystem.callHook("onRender", ctx, camera, dt);
```

## Error Handling in modSystem.js

### Loading Error Handling (lines 75-113)
```javascript
loadMod(name, code) {
  if (!this.modsEnabled) {
    return { success: false, message: "Mods are disabled" };
  }

  try {
    const modContext = {
      game: this.game,
      registerHook: (hookName, fn) => {
        if (this.hooks[hookName]) {
          this.hooks[hookName].push({ name, fn });
        }
      },
      console: console,
      Math: Math,
      Date: Date,
    };

    const modFunction = new Function("ctx", `
      with (ctx) {
        ${code}
      }
    `);

    modFunction(modContext);

    this.mods.set(name, { code, loaded: Date.now() });
    console.log(`✅ Mod loaded: ${name}`);
    return { success: true, message: `Mod "${name}" loaded successfully` };
  } catch (error) {
    console.error(`❌ Error loading mod "${name}":`, error);
    return { success: false, message: error.message };
  }
}
```

### Hook Execution Error Handling (lines 135-145)
```javascript
callHook(hookName, ...args) {
  if (!this.hooks[hookName]) return;

  for (const hook of this.hooks[hookName]) {
    try {
      hook.fn(...args);
    } catch (error) {
      console.error(`Error in mod "${hook.name}" hook "${hookName}":`, error);
    }
  }
}
```

### Hot-Reload Error Handling (lines 156-195)
```javascript
async enableHotReload(pollInterval = 2000) {
  if (!this.modsEnabled) return;

  console.log("🔥 Hot-reload enabled - mods will auto-update on file changes");

  this.fileHashes = new Map();

  setInterval(async () => {
    try {
      const response = await fetch(`/mods/mods.json?t=${Date.now()}`);
      if (!response.ok) return;

      const data = await response.json();
      const enabledMods = data.mods.filter((mod) => mod.enabled);

      for (const mod of enabledMods) {
        const fileResponse = await fetch(`/mods/${mod.file}?t=${Date.now()}`);
        if (!fileResponse.ok) continue;

        const code = await fileResponse.text();
        const hash = this.simpleHash(code);
        const modName = mod.file.replace(".js", "");

        const prevHash = this.fileHashes.get(modName);
        if (prevHash && prevHash !== hash) {
          console.log(`🔄 Hot-reloading: ${mod.name} (file changed)`);
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

## Server Crash Prevention (server.js lines 10-45)

```javascript
// Catch uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ UNCAUGHT EXCEPTION:", error);
  console.error("Stack:", error.stack);
  // Don't exit - keep server alive
});

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ UNHANDLED REJECTION at:", promise);
  console.error("Reason:", reason);
  // Don't exit - keep server alive
});

// Handle termination signals gracefully
process.on("SIGTERM", () => {
  console.log("⚠️  SIGTERM received, attempting graceful shutdown...");
  // Don't actually shutdown - keep alive
});

process.on("SIGINT", () => {
  console.log("⚠️  SIGINT received, attempting graceful shutdown...");
  // Don't actually shutdown - keep alive
});

// Log memory usage periodically
setInterval(() => {
  const usage = process.memoryUsage();
  console.log(
    `📊 Memory: RSS=${(usage.rss / 1024 / 1024).toFixed(2)}MB, Heap=${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
  );
}, 60000); // Every 60 seconds
```

## Game Loop Error Handling (server.js lines 1068-1938)

```javascript
function gameLoop() {
  try {
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;

    // All game logic here (~800 lines of code)
    // ...physics...
    // ...bot AI...
    // ...combat...
    // ...pickups...
    // ...state broadcast...

  } catch (error) {
    console.error("❌ Error in game loop:", error);
    console.error("Stack:", error.stack);
    // Don't crash - continue next tick
  }
}

setInterval(gameLoop, TICK_INTERVAL);
```

## Socket.io Event Handlers (server.js lines 877-995)

All wrapped in try-catch:

```javascript
socket.on("join", (playerName) => {
  try {
    // Create player, send init
  } catch (error) {
    console.error("❌ Error in join handler:", error);
  }
});

socket.on("input", (input) => {
  try {
    // Update player state
  } catch (error) {
    console.error("❌ Error in input handler:", error);
  }
});

socket.on("spectate", () => {
  try {
    // Switch to spectator
  } catch (error) {
    console.error("❌ Error in spectate handler:", error);
  }
});

socket.on("disconnect", () => {
  try {
    // Remove player
  } catch (error) {
    console.error("❌ Error in disconnect handler:", error);
  }
});
```

## Hot-Reload Status

**DISABLED in game.js line 135**:
```javascript
// modSystem.enableHotReload(2000); // Disabled - causing CORS issues
```

**Why**: CORS issues in deployment environments prevent file change polling.

## Example Mod Structure

```javascript
// Simple mod example
let modState = 0;

// Register event handler
registerHook('onHit', (shooterId, targetId, damage) => {
  if (shooterId === game.getPlayerId()) {
    modState += damage;
    console.log('Total damage dealt:', modState);
  }
});

// Register render hook
registerHook('onRender', (ctx) => {
  ctx.fillStyle = '#ff3366';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Damage: ${modState}`, 10, 100);
});
```

## Game State Object (passed to mods)

```javascript
// Provided via game.getState()
{
  players: [
    {
      id: "socket_id",
      name: "PlayerName",
      x: 1000,
      y: 1000,
      aimAngle: 1.57,
      health: 100,
      armor: 50,
      weapon: "pistol",
      ammo: 12,
      kills: 5,
      deaths: 2,
      reloading: false,
      invulnerable: false
    },
    // ... more players
  ],
  pickups: [
    {
      id: 0,
      x: 500,
      y: 500,
      type: "health_small",
      active: true
    },
    // ... more pickups
  ],
  projectiles: [
    {
      id: 0,
      x: 1000,
      y: 1000,
      angle: 1.57
    },
    // ... more projectiles
  ]
}
```

## Key Vulnerabilities

1. **Infinite Loops**: Mod code can freeze game
2. **Memory Leaks**: No limit on mod variable allocation
3. **State Corruption**: Mods can modify game objects
4. **Hook Order Dependencies**: No guarantee of execution order
5. **Reload State Loss**: Mod variables lost on reload
6. **Global Access**: Full access to window/document APIs

## Improvement Opportunities

**High Priority (Tier 1)**:
- [ ] Mod state snapshots before reload
- [ ] Execution timeout protection
- [ ] Disabled mods list
- [ ] Hook ordering support

**Medium Priority (Tier 2)**:
- [ ] Mod execution profiling
- [ ] Better error reporting with stack traces
- [ ] Context isolation (modAPI wrapper)
- [ ] Reload diff detection

**Nice-to-Have (Tier 3)**:
- [ ] Web Worker isolation
- [ ] Dependency system
- [ ] Persistent state via localStorage
- [ ] Server-side mod validation

