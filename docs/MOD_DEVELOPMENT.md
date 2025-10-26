# Mod Development Guide for AI Coding Agents

A comprehensive guide for AI coding agents (like Claude, GPT, etc.) to create mods for Vibematch Arena.

## Target Audience

This guide assumes you are an AI coding agent tasked with creating game mods. It provides:
- Clear API specifications
- Code templates with placeholders
- Common patterns and anti-patterns
- Testing strategies
- Error handling requirements

## Quick Reference

**Essential Files:**
- `public/modSystem.js:207` - Hook system implementation
- `public/game.js:1226` - Client game loop & hook invocation
- `public/mods/*.js` - Example mods for reference
- `docs/API_REFERENCE.md` - Complete API documentation

**Hook Call Sites in game.js:**
- Line 579: `onShoot`
- Line 588: `onKill`
- Line 590: `onHit`
- Line 598: `onPickup`
- Line 871: `onPlayerDraw`
- Line 876: `onRender`

## Mod Structure Template

```javascript
// ============================================
// MOD NAME: <descriptive-name>
// DESCRIPTION: <what-this-mod-does>
// HOOKS USED: <list-of-hooks>
// PERFORMANCE: <low|medium|high> impact
// ============================================

// State variables (module scope)
let stateVariable = initialValue;
const CONFIG = {
  CONSTANT_1: value1,
  CONSTANT_2: value2
};

// Helper functions
function helperFunction(param) {
  // Implementation
}

// Hook registrations
registerHook('hookName', (param1, param2) => {
  try {
    // Hook implementation
  } catch (error) {
    console.error('[ModName] Error in hookName:', error);
  }
});

// More hooks...

console.log('✅ <ModName> loaded successfully');
```

## Development Workflow for AI Agents

### Step 1: Requirements Analysis

When given a mod request, extract:

1. **Functional Requirements:** What should the mod do?
2. **Visual Requirements:** What should be displayed?
3. **Event Requirements:** What events trigger behavior?
4. **Performance Requirements:** How often does code execute?

### Step 2: Hook Selection

Map requirements to hooks:

| Requirement | Use Hook |
|-------------|----------|
| React to combat | `onHit`, `onKill` |
| React to shooting | `onShoot` |
| React to pickups | `onPickup` |
| Draw HUD overlays | `onRender` |
| Draw per-player effects | `onPlayerDraw` |
| Track state over time | `onRender` (use dt parameter) |

### Step 3: State Design

Determine what state to track:

```javascript
// Counter example
let killCount = 0;

// Timed state example
let effect = {
  active: false,
  duration: 0,
  intensity: 0
};

// Collection example
const particles = [];

// Player-specific state
const playerStates = new Map(); // playerId -> state object
```

### Step 4: Implementation

Write hook handlers following patterns below.

### Step 5: Error Handling

Wrap all hooks in try-catch:

```javascript
registerHook('onRender', (ctx, camera, dt) => {
  try {
    // Your code here
  } catch (error) {
    console.error('[YourMod] Render error:', error);
  }
});
```

### Step 6: Testing Checklist

- [ ] Mod loads without errors
- [ ] Functionality works as expected
- [ ] No visual artifacts
- [ ] Performance acceptable (~60 FPS)
- [ ] No memory leaks
- [ ] Handles edge cases (player death, respawn, etc.)

## Common Patterns

### Pattern 1: Simple Counter

Track numeric stat and display it.

```javascript
// State
let counter = 0;

// Event hook
registerHook('onEventName', (param1, param2) => {
  if (/* condition */) {
    counter++;
  }
});

// Render hook
registerHook('onRender', (ctx) => {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`Counter: ${counter}`, 10, 30);
});
```

**Use Cases:** Kill counter, hit counter, death counter, damage dealt

---

### Pattern 2: Timed Effects

Show temporary visual effects that decay over time.

```javascript
// State
let effectIntensity = 0;

// Event trigger
registerHook('onKill', (killerId, victimId) => {
  if (killerId === game.getPlayerId()) {
    effectIntensity = 1.0; // Maximum intensity
  }
});

// Update and render
registerHook('onRender', (ctx, camera, dt) => {
  if (effectIntensity > 0) {
    // Decay effect
    effectIntensity -= dt * 2.0; // Decay rate: 2.0/sec
    if (effectIntensity < 0) effectIntensity = 0;

    // Render effect with current intensity
    ctx.globalAlpha = effectIntensity;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;
  }
});
```

**Use Cases:** Screen flash, kill confirmation, damage overlay

---

### Pattern 3: Particle System

Spawn and update particles for visual effects.

```javascript
// Particle storage
const particles = [];

// Particle spawning
registerHook('onShoot', (data) => {
  if (data.playerId === game.getPlayerId()) {
    // Spawn particles
    for (let i = 0; i < 10; i++) {
      particles.push({
        x: data.x,
        y: data.y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 1.0,
        size: 2 + Math.random() * 3
      });
    }
  }
});

// Particle update and render
registerHook('onRender', (ctx, camera, dt) => {
  const canvas = game.getCanvas();

  // Update and draw particles (iterate backwards for safe removal)
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    // Update
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Remove dead particles
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    // Render
    const screenX = (p.x - camera.x) + canvas.width / 2;
    const screenY = (p.y - camera.y) + canvas.height / 2;

    ctx.globalAlpha = p.life;
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
});
```

**Use Cases:** Muzzle flash, explosion effects, trails, blood splatter

---

### Pattern 4: Player Highlighting

Draw effects on specific players.

```javascript
registerHook('onPlayerDraw', (ctx, player, camera) => {
  const canvas = game.getCanvas();
  const myId = game.getPlayerId();

  // Only draw on enemies
  if (player.id === myId || player.health <= 0) return;

  // Convert world to screen coordinates
  const screenX = (player.x - camera.x) + canvas.width / 2;
  const screenY = (player.y - camera.y) + canvas.height / 2;

  // Draw effect
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(screenX, screenY, 25, 0, Math.PI * 2);
  ctx.stroke();
});
```

**Use Cases:** Enemy highlighting, health bars, range indicators

---

### Pattern 5: HUD Information Display

Display game state information.

```javascript
registerHook('onRender', (ctx) => {
  const state = game.getState();
  const myId = game.getPlayerId();
  const myPlayer = state.players.find(p => p.id === myId);

  if (!myPlayer || myPlayer.health <= 0) return;

  // Display information
  const x = 10;
  let y = 30;
  const lineHeight = 25;

  ctx.fillStyle = '#ffffff';
  ctx.font = '16px monospace';
  ctx.textAlign = 'left';

  ctx.fillText(`Health: ${myPlayer.health}`, x, y);
  y += lineHeight;

  ctx.fillText(`Armor: ${myPlayer.armor}`, x, y);
  y += lineHeight;

  ctx.fillText(`Weapon: ${myPlayer.weapon}`, x, y);
  y += lineHeight;

  ctx.fillText(`Ammo: ${myPlayer.ammo}/${myPlayer.maxAmmo}`, x, y);
});
```

**Use Cases:** Custom HUD, stats display, debug information

---

### Pattern 6: Accumulator with History

Track recent events with time-based cleanup.

```javascript
const MAX_HISTORY = 100;
const recentHits = [];

registerHook('onHit', (shooterId, targetId, damage) => {
  if (shooterId === game.getPlayerId()) {
    recentHits.push({
      targetId,
      damage,
      time: Date.now()
    });

    // Keep only recent history
    if (recentHits.length > MAX_HISTORY) {
      recentHits.shift();
    }
  }
});

// Clean up old entries
registerHook('onRender', (ctx, camera, dt) => {
  const now = Date.now();
  const maxAge = 5000; // 5 seconds

  // Remove entries older than maxAge
  while (recentHits.length > 0 && now - recentHits[0].time > maxAge) {
    recentHits.shift();
  }

  // Calculate stats
  const totalDamage = recentHits.reduce((sum, hit) => sum + hit.damage, 0);
  const dps = recentHits.length > 0 ? totalDamage / 5 : 0;

  // Display
  ctx.fillStyle = '#ffff00';
  ctx.font = '18px monospace';
  ctx.fillText(`DPS: ${dps.toFixed(1)}`, 10, 50);
});
```

**Use Cases:** DPS meter, accuracy tracker, recent kill feed

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Unbounded Growth

```javascript
// BAD: Array grows forever
let allShots = [];
registerHook('onShoot', (data) => {
  allShots.push(data); // Memory leak!
});
```

**Fix:** Use bounded arrays or time-based cleanup.

```javascript
// GOOD: Bounded array
const MAX_SHOTS = 100;
let recentShots = [];
registerHook('onShoot', (data) => {
  recentShots.push(data);
  if (recentShots.length > MAX_SHOTS) {
    recentShots.shift();
  }
});
```

---

### ❌ Anti-Pattern 2: Heavy Computation in Render

```javascript
// BAD: Complex calculation every frame
registerHook('onRender', (ctx) => {
  const enemies = game.getState().players
    .filter(p => p.id !== game.getPlayerId())
    .map(p => ({...p, distance: calculateDistance(p)}))
    .sort((a, b) => a.distance - b.distance);
  // ... render
});
```

**Fix:** Cache computations or throttle updates.

```javascript
// GOOD: Throttled updates
let cachedEnemies = [];
let lastUpdate = 0;
const UPDATE_INTERVAL = 0.1; // 100ms

registerHook('onRender', (ctx, camera, dt) => {
  lastUpdate += dt;
  if (lastUpdate >= UPDATE_INTERVAL) {
    cachedEnemies = game.getState().players
      .filter(p => p.id !== game.getPlayerId());
    lastUpdate = 0;
  }
  // ... render using cachedEnemies
});
```

---

### ❌ Anti-Pattern 3: Missing Null Checks

```javascript
// BAD: Assumes player exists
registerHook('onRender', (ctx) => {
  const myPlayer = game.getState().players.find(p => p.id === game.getPlayerId());
  ctx.fillText(`HP: ${myPlayer.health}`, 10, 30); // Crash if dead!
});
```

**Fix:** Always check existence.

```javascript
// GOOD: Defensive checks
registerHook('onRender', (ctx) => {
  const myPlayer = game.getState().players.find(p => p.id === game.getPlayerId());
  if (!myPlayer || myPlayer.health <= 0) return;

  ctx.fillText(`HP: ${myPlayer.health}`, 10, 30);
});
```

---

### ❌ Anti-Pattern 4: Modifying Game State

```javascript
// BAD: Modifying server state (won't work)
registerHook('onHit', (shooterId, targetId, damage) => {
  const target = game.getState().players.find(p => p.id === targetId);
  target.health = 0; // Won't affect server!
});
```

**Fix:** Understand client-side limitation.

```javascript
// GOOD: Only read state for visualization
registerHook('onHit', (shooterId, targetId, damage) => {
  // Use data for client-side effects only
  if (shooterId === game.getPlayerId()) {
    // Show hit marker
  }
});
```

---

### ❌ Anti-Pattern 5: Forgotten Context Restore

```javascript
// BAD: Permanent context changes
registerHook('onRender', (ctx) => {
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, 0, 100, 100);
  // Other mods will be 50% transparent!
});
```

**Fix:** Always save/restore or reset.

```javascript
// GOOD: Restore context
registerHook('onRender', (ctx) => {
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, 0, 100, 100);
  ctx.restore();
});

// OR: Manual reset
registerHook('onRender', (ctx) => {
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, 0, 100, 100);
  ctx.globalAlpha = 1.0; // Reset
});
```

---

## Coordinate Systems

### World Coordinates

- Origin: (0, 0) is top-left of game world
- Range: 0 to 2000 (both X and Y)
- Used by: Player positions, pickup positions

### Screen Coordinates

- Origin: (0, 0) is top-left of canvas
- Range: 0 to canvas.width/height
- Used by: Rendering, HUD elements

### Conversion Formula

```javascript
// World to screen
const camera = game.getCamera();
const canvas = game.getCanvas();
const screenX = (worldX - camera.x) + canvas.width / 2;
const screenY = (worldY - camera.y) + canvas.height / 2;

// Screen to world (if needed)
const worldX = screenX - canvas.width / 2 + camera.x;
const worldY = screenY - canvas.height / 2 + camera.y;
```

### Example: Drawing at World Position

```javascript
registerHook('onRender', (ctx, camera) => {
  const canvas = game.getCanvas();

  // World position of marker
  const markerWorldX = 1000;
  const markerWorldY = 1000;

  // Convert to screen
  const screenX = (markerWorldX - camera.x) + canvas.width / 2;
  const screenY = (markerWorldY - camera.y) + canvas.height / 2;

  // Draw at screen position
  ctx.fillStyle = 'yellow';
  ctx.beginPath();
  ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
  ctx.fill();
});
```

## Performance Guidelines

### Hook Performance Budget

| Hook | Frequency | Budget | Notes |
|------|-----------|--------|-------|
| onRender | 60 FPS | 5ms | Most critical |
| onPlayerDraw | 60 FPS × players | 1ms | Called per player |
| onUpdate | 60 FPS | 2ms | Not currently invoked |
| onHit | Variable | 10ms | Low frequency |
| onKill | Variable | 10ms | Low frequency |
| onShoot | Variable | 5ms | Medium frequency |
| onPickup | Variable | 10ms | Low frequency |

### Optimization Techniques

#### 1. Throttling

```javascript
let lastUpdate = 0;
const UPDATE_RATE = 0.1; // 100ms between updates

registerHook('onRender', (ctx, camera, dt) => {
  lastUpdate += dt;

  if (lastUpdate >= UPDATE_RATE) {
    // Do expensive work
    lastUpdate = 0;
  }

  // Do cheap rendering every frame
});
```

#### 2. Caching

```javascript
let cachedValue = null;
let cacheValid = false;

registerHook('onKill', (killerId, victimId) => {
  cacheValid = false; // Invalidate on events
});

registerHook('onRender', (ctx) => {
  if (!cacheValid) {
    cachedValue = expensiveCalculation();
    cacheValid = true;
  }

  // Use cachedValue
});
```

#### 3. Object Pooling

```javascript
// Particle pool
const particlePool = [];
const activeParticles = [];

function getParticle() {
  return particlePool.pop() || {x: 0, y: 0, vx: 0, vy: 0, life: 0};
}

function recycleParticle(particle) {
  particlePool.push(particle);
}

registerHook('onShoot', (data) => {
  const p = getParticle();
  p.x = data.x;
  p.y = data.y;
  p.life = 1.0;
  activeParticles.push(p);
});

registerHook('onRender', (ctx, camera, dt) => {
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i];
    p.life -= dt;

    if (p.life <= 0) {
      recycleParticle(p);
      activeParticles.splice(i, 1);
    }
  }
});
```

## Testing Strategy for AI Agents

### Unit Testing Approach

Since mods run in the game context, create test scenarios:

```javascript
// Test 1: Mod loads without errors
console.log('Test 1: Load mod');
// Expected: No errors in console

// Test 2: Hook registration
console.log('Test 2: Kill hook registered');
let testKills = 0;
registerHook('onKill', (killerId, victimId) => {
  testKills++;
  console.log(`Kill count: ${testKills}`);
});
// Expected: Counter increments on kills

// Test 3: Rendering
registerHook('onRender', (ctx) => {
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, 10, 10);
});
// Expected: Red square in top-left corner
```

### Integration Testing

1. **Load the mod** - Press ` to open editor, paste code, Ctrl+Enter
2. **Trigger events** - Play the game and perform actions
3. **Observe behavior** - Check visual output and console logs
4. **Check performance** - Watch for frame drops (press F12, Performance tab)
5. **Test edge cases:**
   - Die and respawn
   - Switch weapons
   - Collect pickups
   - Multiple rapid events

### Debugging Checklist

- [ ] Console shows mod loaded message
- [ ] No errors in console (F12 → Console tab)
- [ ] Visual elements appear correctly
- [ ] No performance drops (maintain 60 FPS)
- [ ] State updates correctly
- [ ] Works after player death/respawn
- [ ] No visual artifacts
- [ ] Context state restored properly

## Example Mods for Reference

### Example 1: Kill Counter with Stats

```javascript
// ============================================
// MOD: Kill Counter with Stats
// DESCRIPTION: Tracks kills, deaths, K/D ratio
// HOOKS: onKill, onRender
// PERFORMANCE: Low impact
// ============================================

let kills = 0;
let deaths = 0;

registerHook('onKill', (killerId, victimId) => {
  const myId = game.getPlayerId();

  if (killerId === myId) {
    kills++;
  }

  if (victimId === myId) {
    deaths++;
  }
});

registerHook('onRender', (ctx) => {
  const kd = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'left';

  let y = 30;
  ctx.fillText(`Kills: ${kills}`, 10, y);
  y += 25;
  ctx.fillText(`Deaths: ${deaths}`, 10, y);
  y += 25;
  ctx.fillText(`K/D: ${kd}`, 10, y);

  ctx.restore();
});

console.log('✅ Kill Counter loaded');
```

### Example 2: Hit Marker with Sound

```javascript
// ============================================
// MOD: Hit Marker
// DESCRIPTION: Visual and audio feedback on hits
// HOOKS: onHit, onRender
// PERFORMANCE: Low impact
// ============================================

const hitMarkers = [];

registerHook('onHit', (shooterId, targetId, damage) => {
  if (shooterId === game.getPlayerId()) {
    hitMarkers.push({
      time: Date.now(),
      damage: damage
    });

    // Play sound (if available)
    try {
      const audio = new Audio('/assets/sounds/hit.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {
      // Sound not available
    }
  }
});

registerHook('onRender', (ctx) => {
  const now = Date.now();
  const canvas = game.getCanvas();
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Remove old markers (older than 200ms)
  while (hitMarkers.length > 0 && now - hitMarkers[0].time > 200) {
    hitMarkers.shift();
  }

  // Draw active markers
  for (const marker of hitMarkers) {
    const age = now - marker.time;
    const alpha = 1.0 - (age / 200); // Fade out

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;

    const size = 15 + (age / 200) * 10; // Expand

    // Draw X
    ctx.beginPath();
    ctx.moveTo(centerX - size, centerY - size);
    ctx.lineTo(centerX + size, centerY + size);
    ctx.moveTo(centerX + size, centerY - size);
    ctx.lineTo(centerX - size, centerY + size);
    ctx.stroke();

    ctx.restore();
  }
});

console.log('✅ Hit Marker loaded');
```

### Example 3: Enemy Distance Warning

```javascript
// ============================================
// MOD: Proximity Warning
// DESCRIPTION: Warns when enemies are close
// HOOKS: onRender
// PERFORMANCE: Medium impact
// ============================================

const WARNING_DISTANCE = 200;
const CRITICAL_DISTANCE = 100;

registerHook('onRender', (ctx, camera) => {
  const state = game.getState();
  const myId = game.getPlayerId();
  const myPlayer = state.players.find(p => p.id === myId);

  if (!myPlayer || myPlayer.health <= 0) return;

  let closestDistance = Infinity;
  let enemyCount = 0;

  // Find closest enemy
  for (const player of state.players) {
    if (player.id === myId || player.health <= 0) continue;

    const dx = player.x - myPlayer.x;
    const dy = player.y - myPlayer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < WARNING_DISTANCE) {
      enemyCount++;
      if (distance < closestDistance) {
        closestDistance = distance;
      }
    }
  }

  // Draw warning
  if (closestDistance < WARNING_DISTANCE) {
    const canvas = game.getCanvas();
    const isCritical = closestDistance < CRITICAL_DISTANCE;

    ctx.save();

    // Warning color
    if (isCritical) {
      ctx.fillStyle = '#ff0000';
    } else {
      ctx.fillStyle = '#ffaa00';
    }

    // Draw warning
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ ENEMY NEARBY', canvas.width / 2, 50);

    // Draw count and distance
    ctx.font = '16px monospace';
    ctx.fillText(
      `${enemyCount} enemies within ${Math.round(closestDistance)}px`,
      canvas.width / 2,
      75
    );

    ctx.restore();
  }
});

console.log('✅ Proximity Warning loaded');
```

## AI Agent Checklist

When creating a mod, ensure:

- [ ] Header comment with mod name, description, hooks, performance
- [ ] All state variables initialized
- [ ] All hooks wrapped in try-catch
- [ ] Player existence checked before accessing
- [ ] Context saved/restored if modified
- [ ] No unbounded array growth
- [ ] Heavy computations cached or throttled
- [ ] Screen coordinates converted from world coordinates
- [ ] Success message logged at end
- [ ] Code formatted and commented

## See Also

- [API_REFERENCE.md](API_REFERENCE.md) - Complete API documentation
- [GAME_MECHANICS.md](GAME_MECHANICS.md) - Game rules and mechanics
- [MODS.md](../MODS.md) - Original mod system documentation
- `public/mods/` - Example mod implementations

## Quick Start for AI Agents

**Task:** "Create a mod that shows FPS in the top-right corner"

**Solution:**

```javascript
// ============================================
// MOD: FPS Counter
// DESCRIPTION: Shows frames per second in top-right
// HOOKS: onRender
// PERFORMANCE: Low impact
// ============================================

let fps = 0;
let frameCount = 0;
let lastTime = Date.now();

registerHook('onRender', (ctx) => {
  try {
    // Count frames
    frameCount++;
    const now = Date.now();

    // Update FPS every second
    if (now - lastTime >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastTime = now;
    }

    // Draw FPS
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

**Verification:**
1. Load mod in editor
2. Check top-right corner for FPS display
3. Verify number updates every second
4. Confirm no console errors
