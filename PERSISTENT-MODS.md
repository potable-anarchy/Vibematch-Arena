# Mod System Documentation

## Three Types of Mods

The game supports three distinct types of mods, each with different capabilities and use cases:

### 1. CLIENT MODS (Browser-Side, Visual/UI)
- **Runs:** In the player's browser only
- **Duration:** Continuous (loads with page, runs forever)
- **Stored:** As files in `public/mods/` directory
- **Use for:** Visual effects, UI modifications, sounds, cosmetic changes

### 2. SERVER MODS (One-Time Server Actions)
- **Runs:** On the game server
- **Duration:** Executes ONCE when activated
- **Stored:** Not stored, executes and completes
- **Use for:** Instant teleportation, one-time heals, spawn items, trigger events

### 3. PERSISTENT MODS (Continuous Server Effects) ⚡
- **Runs:** On the game server
- **Duration:** Every game tick (60 times/second) until expiration
- **Stored:** In database (`active_mods` table) with expiration time
- **Use for:** God mode, auto-heal, buffs, continuous gameplay effects

---

## Quick Decision Guide

**"I want to change how things look/sound"** → **CLIENT MOD**
- Examples: Rainbow gun, custom crosshair, screen shake, hit sounds

**"I want something to happen once, right now"** → **SERVER MOD**  
- Examples: Teleport once, instant heal, spawn item, reset score

**"I want an ongoing effect over time"** → **PERSISTENT MOD**
- Examples: God mode, auto-heal, speed buff, regeneration

---

## Use Case Examples by Type

### CLIENT MOD Use Cases:
- Custom reticle colors and styles
- Hit marker sounds and visual feedback
- Kill feed animations and styling
- Screen flash effects on damage
- Custom UI overlays and HUD elements
- Particle effects and trails
- Camera shake and screen effects
- Background music and ambient sounds
- Custom death/respawn animations

**Key Limitation:** Cannot affect actual gameplay - server is authoritative. Can't give yourself god mode, extra damage, or cheat via client mods.

### SERVER MOD Use Cases:
- `/teleport spawn` - Instant teleport to location
- `/heal` - Instant heal to full health
- `/giveweapon awp` - Spawn specific weapon once
- `/killbots` - Kill all bots instantly
- Reset player score or stats
- Trigger one-time game events
- Spawn items or powerups at location
- Execute admin commands
- One-time configuration changes

**Key Limitation:** Only runs once. After execution, it's done. No continuous effects.

### PERSISTENT MOD Use Cases:
- God mode (continuous invulnerability)
- Health regeneration (heal X HP per second)
- Speed boost (increased movement speed over time)
- Damage over time effects
- Auto-aim assistance (continuous targeting help)
- Follow mechanics (make entity track player)
- Area effects (damage/heal zones that tick)
- Stat buffs (double damage, extra armor)
- Time-based challenges (survive for 60 seconds)
- Persistent visual trails with server validation

**Key Characteristics:**
- Max duration: 5 minutes (300,000ms)
- Executes 60 times per second
- Automatically expires and cleans up
- Removed when player disconnects

---

# Persistent Mod System (Details)

## Overview

The persistent mod system allows players to create live gameplay mods that execute every game tick (60 times per second) until they expire. This enables powerful runtime modifications like god mode, regeneration, buffs, and more.

## How It Works

1. **Client activates a mod** via socket event with JavaScript code
2. **Server stores it** in the `active_mods` database table with an expiration time
3. **Game loop executes** the mod code every tick (60Hz) via `executeActiveMods()`
4. **Mod automatically expires** after the specified duration
5. **Cleanup runs** every 10 seconds to remove expired mods from the database

## Database Schema

### `active_mods` Table
```sql
CREATE TABLE active_mods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,           -- Socket ID of player who created mod
  code TEXT NOT NULL,                -- JavaScript code to execute
  created_at INTEGER NOT NULL,       -- Timestamp when mod was created
  expires_at INTEGER NOT NULL,       -- Timestamp when mod expires
  name TEXT,                         -- Optional mod name
  description TEXT                   -- Optional description
);
```

## Socket API

### Activating a Persistent Mod

**Event:** `activatePersistentMod`

**Data:**
```javascript
{
  code: "api.setHealth(api.getMyPlayer().id, 100);",
  durationMs: 60000,                 // Duration in milliseconds (max: 300000 = 5 min)
  name: "God Mode",                  // Optional
  description: "Invulnerability"     // Optional
}
```

**Response:** `persistentModResult`
```javascript
// Success
{
  success: true,
  modId: 123,
  duration: 60000,
  message: "Persistent mod activated for 60 seconds"
}

// Error
{
  error: "Error message",
  stack: "Error stack trace"
}
```

## Mod API

The following API is available to persistent mod code:

### Player Access
- `api.getMyPlayer()` - Get the player who activated this mod
- `api.getPlayer(playerId)` - Get any player or bot by ID

### Player Manipulation
- `api.setHealth(playerId, health)` - Set player health (0-100)
- `api.setArmor(playerId, armor)` - Set player armor (0-100)
- `api.setInvulnerable(playerId, boolean)` - Make player invulnerable
- `api.teleport(playerId, x, y)` - Teleport player to coordinates

### Utility
- `api.now` - Current timestamp (ms)
- `api.dt` - Delta time since last tick (seconds)

## Example Mods

### God Mode (60 seconds)
```javascript
const player = api.getMyPlayer();
if (player && player.health > 0) {
  api.setInvulnerable(player.id, true);
  api.setHealth(player.id, 100);
  api.setArmor(player.id, 100);
}
```

### Auto-Heal
```javascript
const player = api.getMyPlayer();
if (player && player.health > 0 && player.health < 100) {
  // Heal 10 HP per second
  api.setHealth(player.id, player.health + (10 * api.dt));
}
```

### Teleport Dash (Move 500 pixels forward)
```javascript
const player = api.getMyPlayer();
if (player) {
  const angle = player.aimAngle || 0;
  const distance = 500;
  const newX = player.x + Math.cos(angle) * distance;
  const newY = player.y + Math.sin(angle) * distance;
  api.teleport(player.id, newX, newY);
}
```

## Usage from Client

```javascript
// Activate god mode for 1 minute
socket.emit("activatePersistentMod", {
  code: `
    const player = api.getMyPlayer();
    if (player && player.health > 0) {
      api.setInvulnerable(player.id, true);
      api.setHealth(player.id, 100);
      api.setArmor(player.id, 100);
    }
  `,
  durationMs: 60000,
  name: "God Mode",
  description: "Invulnerability for 60 seconds"
});

// Listen for result
socket.on("persistentModResult", (result) => {
  if (result.success) {
    console.log("Mod activated:", result.message);
  } else {
    console.error("Mod failed:", result.error);
  }
});
```

## Limitations

- **Max Duration:** 5 minutes (300,000 ms)
- **Default Duration:** 60 seconds if not specified
- **Execution Rate:** 60 times per second (once per game tick)
- **Performance:** Keep mod code lightweight to avoid lag
- **Scope:** Only server-side gameplay modifications (damage, health, position, etc.)

## Implementation Details

### Game Loop Integration
```javascript
function gameLoop() {
  const now = Date.now();
  
  // ... game logic ...
  
  // Execute all active mods every tick
  executeActiveMods(now);
  
  // ... rest of game loop ...
}
```

### Mod Execution
```javascript
function executeActiveMods(now) {
  const activeMods = getActiveMods(); // Only gets non-expired mods
  
  for (const mod of activeMods) {
    const modAPI = { /* API object */ };
    const modFunction = new Function("api", mod.code);
    modFunction(modAPI);
  }
}
```

### Automatic Cleanup
```javascript
// Runs every 10 seconds
setInterval(() => {
  cleanupExpiredMods(); // Removes expired mods from database
}, 10000);
```

## Security Considerations

- Mods run in a sandboxed `Function` context
- No access to `require()`, `import`, or global scope
- No file system or network access
- Only predefined API functions available
- Duration is capped at 5 minutes
- Player can only affect their own character (via `getMyPlayer()`)

## Future Enhancements

- [ ] Mod marketplace for sharing persistent mods
- [ ] Rate limiting to prevent spam
- [ ] Mod categories (buff, debuff, utility, etc.)
- [ ] Admin controls to disable/enable specific mods
- [ ] Mod analytics and usage tracking
- [ ] Client UI for browsing and activating saved mods
