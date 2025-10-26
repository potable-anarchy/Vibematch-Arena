# Claude Agent Instructions for Vibematch Arena

This file provides guidance for AI coding agents (Claude, GPT, etc.) working on the Vibematch Arena project.

## Documentation Structure

The project has comprehensive documentation organized in the `docs/` directory:

```
docs/
├── README.md              # Documentation index (START HERE)
├── GETTING_STARTED.md     # Setup and installation
├── GAME_MECHANICS.md      # Weapons, combat, pickups
├── API_REFERENCE.md       # Complete mod system API
├── MOD_DEVELOPMENT.md     # Mod creation guide for AI agents
├── ARCHITECTURE.md        # System architecture
├── DEPLOYMENT.md          # Production deployment
└── TROUBLESHOOTING.md     # Common issues
```

## Quick Reference for AI Agents

### Before Starting Any Task

1. **Read `docs/README.md`** - Understand the documentation structure
2. **Identify task type** - Determine which docs are relevant
3. **Review relevant docs** - Read applicable documentation before coding

### Task-Specific Documentation

**Creating mods:**
- Primary: `docs/MOD_DEVELOPMENT.md` (optimized for AI agents)
- Reference: `docs/API_REFERENCE.md` (complete API specs)
- Context: `docs/GAME_MECHANICS.md` (game rules)

**Server-side work:**
- Primary: `docs/ARCHITECTURE.md` (server architecture section)
- Reference: `docs/GAME_MECHANICS.md` (game logic specs)
- Deploy: `docs/DEPLOYMENT.md` (production setup)

**Client-side work:**
- Primary: `docs/ARCHITECTURE.md` (client architecture section)
- Reference: `docs/API_REFERENCE.md` (mod system)
- Debug: `docs/TROUBLESHOOTING.md` (client issues)

**Debugging:**
- Primary: `docs/TROUBLESHOOTING.md` (comprehensive solutions)
- Context: Relevant architecture docs based on issue area

**Deployment:**
- Primary: `docs/DEPLOYMENT.md` (complete deployment guide)
- Reference: `docs/ARCHITECTURE.md` (system design)

## Critical Information for AI Agents

### Mod Development

When asked to create a mod:

1. **Read `docs/MOD_DEVELOPMENT.md`** - Contains:
   - Mod structure template
   - Common patterns (counter, particles, HUD, etc.)
   - Anti-patterns to avoid
   - Performance guidelines
   - Testing checklist
   - Complete examples

2. **Reference `docs/API_REFERENCE.md`** - Contains:
   - All available hooks (onHit, onKill, onShoot, onPickup, onPlayerDraw, onRender)
   - Hook parameters and frequencies
   - Game API methods (getState, getPlayerId, getCamera, etc.)
   - Coordinate system conversions
   - Best practices

3. **Use Template from MOD_DEVELOPMENT.md:**

```javascript
// ============================================
// MOD NAME: <descriptive-name>
// DESCRIPTION: <what-this-mod-does>
// HOOKS USED: <list-of-hooks>
// PERFORMANCE: <low|medium|high> impact
// ============================================

// State variables
let state = initialValue;

// Helper functions
function helper() { }

// Hook registrations
registerHook('hookName', (params) => {
  try {
    // Implementation
  } catch (error) {
    console.error('[ModName] Error:', error);
  }
});

console.log('✅ <ModName> loaded');
```

### File Locations

**Server code:**
- `server.js` - Main game server (1949 lines)
  - Lines 1278-1333: Weapon configurations
  - Lines 1336-1345: Pickup configurations
  - Lines 2063-2800: Combat system
  - Lines 2801-3400: Bot AI

**Client code:**
- `public/game.js` - Client game loop (1226 lines)
- `public/modSystem.js` - Mod engine (207 lines)
- `public/modEditor.js` - In-game editor (389 lines)

**Mods:**
- `public/mods/*.js` - Example mods
- `public/mods/mods.json` - Mod manifest

### Hook Call Sites (game.js)

When debugging or understanding mod execution:

- Line 579: `onShoot` - When weapon fired
- Line 588: `onKill` - When player killed
- Line 590: `onHit` - When player hit
- Line 598: `onPickup` - When item collected
- Line 871: `onPlayerDraw` - Per player, per frame
- Line 876: `onRender` - After all rendering

### Common Patterns

**Simple Counter:**
```javascript
let count = 0;
registerHook('onKill', (killerId, victimId) => {
  if (killerId === game.getPlayerId()) count++;
});
registerHook('onRender', (ctx) => {
  ctx.fillText(`Kills: ${count}`, 10, 30);
});
```

**Particle System:**
```javascript
const particles = [];
registerHook('onShoot', (data) => {
  particles.push({x: data.x, y: data.y, life: 1.0});
});
registerHook('onRender', (ctx, camera, dt) => {
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].life -= dt;
    if (particles[i].life <= 0) particles.splice(i, 1);
    // Draw particle
  }
});
```

**World to Screen Coordinates:**
```javascript
const camera = game.getCamera();
const canvas = game.getCanvas();
const screenX = (worldX - camera.x) + canvas.width / 2;
const screenY = (worldY - camera.y) + canvas.height / 2;
```

### Performance Guidelines

**Hook Performance Budget:**
- `onRender` - 5ms (runs 60 FPS)
- `onPlayerDraw` - 1ms per player (runs 60 FPS × player count)
- `onHit/onKill/onShoot/onPickup` - 10ms (event-based, low frequency)

**Optimization Tips:**
- Cache expensive calculations
- Throttle updates (not every frame)
- Limit array sizes (no unbounded growth)
- Use object pooling for particles
- Always wrap in try-catch

### Anti-Patterns to Avoid

❌ **Unbounded arrays:**
```javascript
let allShots = [];
registerHook('onShoot', (data) => {
  allShots.push(data); // Memory leak!
});
```

✅ **Bounded arrays:**
```javascript
const MAX = 100;
let recentShots = [];
registerHook('onShoot', (data) => {
  recentShots.push(data);
  if (recentShots.length > MAX) recentShots.shift();
});
```

❌ **Missing null checks:**
```javascript
const player = game.getState().players.find(p => p.id === id);
ctx.fillText(player.health, 10, 30); // Crash if dead!
```

✅ **Defensive programming:**
```javascript
const player = game.getState().players.find(p => p.id === id);
if (player && player.health > 0) {
  ctx.fillText(player.health, 10, 30);
}
```

## Workflow for AI Agents

### 1. Understand Request
- What is the user asking for?
- What type of task? (mod, server, client, deployment, debug)

### 2. Read Documentation
- Navigate to `docs/README.md`
- Identify relevant documentation
- Read applicable docs before coding

### 3. Plan Implementation
- Use patterns from `docs/MOD_DEVELOPMENT.md`
- Consider performance impact
- Identify potential issues

### 4. Implement
- Follow templates
- Add error handling
- Use defensive coding

### 5. Verify
- Check against API_REFERENCE.md
- Ensure performance acceptable
- Review anti-patterns list

## Example: User Asks "Create a mod that shows FPS"

### Step 1: Read Documentation
- `docs/MOD_DEVELOPMENT.md` - Check "Simple Counter" pattern
- `docs/API_REFERENCE.md` - Verify `onRender` hook

### Step 2: Plan
- Use `onRender` hook (runs every frame)
- Track frame count
- Update FPS every second
- Display in top-right corner

### Step 3: Implement
```javascript
// ============================================
// MOD: FPS Counter
// DESCRIPTION: Shows frames per second
// HOOKS: onRender
// PERFORMANCE: Low impact
// ============================================

let fps = 0;
let frameCount = 0;
let lastTime = Date.now();

registerHook('onRender', (ctx) => {
  try {
    frameCount++;
    const now = Date.now();

    if (now - lastTime >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastTime = now;
    }

    const canvas = game.getCanvas();
    ctx.save();
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`FPS: ${fps}`, canvas.width - 10, 30);
    ctx.restore();
  } catch (error) {
    console.error('[FPS Counter] Error:', error);
  }
});

console.log('✅ FPS Counter loaded');
```

### Step 4: Verify
- ✅ Uses template from MOD_DEVELOPMENT.md
- ✅ Wrapped in try-catch
- ✅ Context saved/restored
- ✅ Low performance impact
- ✅ Success message logged

## Key Game Mechanics Reference

### Weapons
- **Pistol**: 20 dmg, 6 rps, 800px range (infinite ammo)
- **SMG**: 12 dmg, 12 rps, 600px range
- **Shotgun**: 8×10 dmg, 1.8 rps, 550px range
- **Rifle**: 35 dmg, 3 rps, 1200px range

### Health & Armor
- Max health: 100
- Max armor: 100
- Armor absorbs 33% of damage
- EHP = Health + (Armor × 3.03)

### Pickups
- Health small: +25 HP (15s respawn)
- Health big: +50 HP (25s respawn)
- Armor light: +50 armor (30s respawn)
- Armor heavy: +100 armor (45s respawn)
- Ammo: +40% (20s respawn)

### World
- Size: 2000×2000 pixels
- Tick rate: 60 Hz
- State broadcast: 30 Hz
- Spawn protection: 600ms

## Getting Help

If documentation doesn't answer your question:

1. Check `docs/TROUBLESHOOTING.md` for common issues
2. Review `docs/ARCHITECTURE.md` for system design
3. Look at example mods in `public/mods/`
4. Check browser console (F12) for errors
5. Read server logs for backend issues

## Documentation Maintenance

When adding features that affect AI agents:

1. Update `docs/MOD_DEVELOPMENT.md` with new patterns
2. Update `docs/API_REFERENCE.md` with new APIs
3. Update this file if workflow changes
4. Add examples to documentation

## Summary

✅ **Always read `docs/README.md` first** - It's your roadmap
✅ **Use `docs/MOD_DEVELOPMENT.md`** - Optimized for AI agents
✅ **Reference `docs/API_REFERENCE.md`** - Complete API specs
✅ **Follow templates** - They work and are tested
✅ **Check performance** - Stay within budgets
✅ **Add error handling** - Always use try-catch
✅ **Test your code** - Verify it works

The documentation is comprehensive and well-structured. Use it!
