# AI Agent Guide - Vibematch Arena

Quick reference for AI coding agents working on this project.

## 🚀 Start Here

**Before doing ANY task, read: [`docs/README.md`](docs/README.md)**

This is your documentation index. It tells you where to find everything.

## 📚 Documentation Structure

```
docs/
├── README.md              # 👈 START HERE - Documentation index
├── GETTING_STARTED.md     # Setup and installation
├── GAME_MECHANICS.md      # Weapons, combat, pickups
├── API_REFERENCE.md       # Complete mod system API
├── MOD_DEVELOPMENT.md     # 🤖 Mod guide FOR AI AGENTS (you!)
├── ARCHITECTURE.md        # System architecture
├── DEPLOYMENT.md          # Production deployment
└── TROUBLESHOOTING.md     # Common issues
```

## 🎯 Quick Task Routing

### Creating a Mod?
1. Read [`docs/MOD_DEVELOPMENT.md`](docs/MOD_DEVELOPMENT.md) - **Optimized for AI agents**
2. Reference [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) - Complete API
3. Context [`docs/GAME_MECHANICS.md`](docs/GAME_MECHANICS.md) - Game rules

### Server Work?
1. Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - Server architecture (lines 1-500)
2. Reference `server.js:1278-3400` - Game logic
3. Deploy [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

### Client Work?
1. Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - Client architecture (lines 501-800)
2. Reference `public/game.js` - Client loop
3. Debug [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)

### Debugging?
1. Read [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) - **Check here first**
2. Context - Relevant architecture docs

### Deployment?
1. Read [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) - Complete guide
2. Reference [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) - System design

## 🤖 MOD_DEVELOPMENT.md - Your Best Friend

This doc is **specifically written for AI agents**. It contains:

✅ **Mod structure template** - Copy-paste ready
✅ **Common patterns** - Counter, particles, HUD, highlighting, etc.
✅ **Anti-patterns** - What NOT to do
✅ **Performance budgets** - Stay within limits
✅ **Testing checklist** - Verify your code
✅ **Complete examples** - Working mods you can adapt

**Example from MOD_DEVELOPMENT.md:**

```javascript
// ============================================
// MOD NAME: Kill Counter
// DESCRIPTION: Tracks kills
// HOOKS USED: onKill, onRender
// PERFORMANCE: Low impact
// ============================================

let kills = 0;

registerHook('onKill', (killerId, victimId) => {
  if (killerId === game.getPlayerId()) {
    kills++;
  }
});

registerHook('onRender', (ctx) => {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(`Kills: ${kills}`, 10, 30);
});

console.log('✅ Kill Counter loaded');
```

## 📖 Available Hooks (from API_REFERENCE.md)

| Hook | Frequency | Use For |
|------|-----------|---------|
| `onHit` | Variable | When player hits another |
| `onKill` | Variable | When player kills another |
| `onShoot` | Variable | When weapon fired |
| `onPickup` | Variable | When item collected |
| `onPlayerDraw` | 60 FPS × players | Per-player effects |
| `onRender` | 60 FPS | HUD overlays |
| `onUpdate` | NOT CALLED | Reserved |

## 🎮 Game Mechanics Quick Ref

**Weapons:**
- Pistol: 20 dmg, 6 rps, 800px range
- SMG: 12 dmg, 12 rps, 600px range
- Shotgun: 8×10 dmg, 1.8 rps, 550px range
- Rifle: 35 dmg, 3 rps, 1200px range

**World:**
- Size: 2000×2000 pixels
- Tick rate: 60 Hz
- Player radius: 20px

**Coordinates:**
```javascript
// World to screen conversion
const camera = game.getCamera();
const canvas = game.getCanvas();
const screenX = (worldX - camera.x) + canvas.width / 2;
const screenY = (worldY - camera.y) + canvas.height / 2;
```

## ⚡ Performance Rules

| Hook | Budget | Notes |
|------|--------|-------|
| `onRender` | 5ms | Runs 60 FPS |
| `onPlayerDraw` | 1ms | Runs 60 FPS × players |
| Event hooks | 10ms | Low frequency |

**Optimization:**
- ✅ Cache calculations
- ✅ Throttle updates
- ✅ Limit array sizes
- ✅ Use try-catch
- ❌ No unbounded arrays
- ❌ No missing null checks

## ❌ Common Anti-Patterns

**DON'T DO THIS:**

```javascript
// ❌ Unbounded growth
let allShots = [];
registerHook('onShoot', (data) => {
  allShots.push(data); // Memory leak!
});

// ❌ Missing null check
const player = game.getState().players.find(p => p.id === id);
ctx.fillText(player.health, 10, 30); // Crash if dead!

// ❌ Not restoring context
ctx.globalAlpha = 0.5;
ctx.fillRect(0, 0, 100, 100);
// Other mods now 50% transparent!
```

**DO THIS:**

```javascript
// ✅ Bounded array
const MAX = 100;
let shots = [];
registerHook('onShoot', (data) => {
  shots.push(data);
  if (shots.length > MAX) shots.shift();
});

// ✅ Null check
const player = game.getState().players.find(p => p.id === id);
if (player && player.health > 0) {
  ctx.fillText(player.health, 10, 30);
}

// ✅ Restore context
ctx.save();
ctx.globalAlpha = 0.5;
ctx.fillRect(0, 0, 100, 100);
ctx.restore();
```

## 📂 File Locations

**Server:**
- `server.js:1278-1333` - Weapon configs
- `server.js:1336-1345` - Pickup configs
- `server.js:2063-2800` - Combat system
- `server.js:2801-3400` - Bot AI

**Client:**
- `public/game.js:579` - `onShoot` hook call
- `public/game.js:588` - `onKill` hook call
- `public/game.js:590` - `onHit` hook call
- `public/game.js:598` - `onPickup` hook call
- `public/game.js:871` - `onPlayerDraw` hook call
- `public/game.js:876` - `onRender` hook call

**Mods:**
- `public/modSystem.js` - Mod engine (207 lines)
- `public/modEditor.js` - In-game editor (389 lines)
- `public/mods/*.js` - Example mods
- `public/mods/mods.json` - Mod manifest

## 🔧 Workflow

### User: "Create a mod that shows damage dealt"

**Step 1: Read Documentation**
```
✅ Read docs/MOD_DEVELOPMENT.md (find "Accumulator" pattern)
✅ Read docs/API_REFERENCE.md (verify onHit hook)
```

**Step 2: Plan**
```
- Use onHit hook (event-based, low frequency)
- Track total damage in variable
- Display in onRender hook
- Reset on player death
```

**Step 3: Implement**
```javascript
// ============================================
// MOD: Damage Counter
// DESCRIPTION: Shows total damage dealt
// HOOKS: onHit, onKill, onRender
// PERFORMANCE: Low impact
// ============================================

let totalDamage = 0;

registerHook('onHit', (shooterId, targetId, damage) => {
  if (shooterId === game.getPlayerId()) {
    totalDamage += damage;
  }
});

registerHook('onKill', (killerId, victimId) => {
  // Reset on death
  if (victimId === game.getPlayerId()) {
    totalDamage = 0;
  }
});

registerHook('onRender', (ctx) => {
  try {
    ctx.save();
    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`Damage: ${totalDamage}`, 10, 60);
    ctx.restore();
  } catch (error) {
    console.error('[Damage Counter] Error:', error);
  }
});

console.log('✅ Damage Counter loaded');
```

**Step 4: Verify**
```
✅ Uses template from MOD_DEVELOPMENT.md
✅ Wrapped in try-catch
✅ Context saved/restored
✅ Low performance impact
✅ Success message logged
```

## 📝 Checklist for Every Mod

- [ ] Header comment with name, description, hooks, performance
- [ ] All hooks wrapped in try-catch
- [ ] Player existence checked before accessing
- [ ] Context saved/restored if modified
- [ ] No unbounded array growth
- [ ] Heavy computations cached or throttled
- [ ] Screen coordinates converted from world
- [ ] Success message logged at end

## 🆘 Troubleshooting

**Mod won't load?**
- Check syntax errors in browser console (F12)
- Verify hook names spelled correctly
- Check file exists in `public/mods/`

**Mod causes freeze?**
- Remove infinite loops
- Throttle expensive operations
- Limit array sizes

**Hooks not firing?**
- Verify hook name (check API_REFERENCE.md)
- Add console.log to verify event occurs
- Check mod loaded successfully

**Full guide:** [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)

## 🎓 Learning Path

1. **First time?** → Read [`docs/README.md`](docs/README.md)
2. **Making mods?** → Read [`docs/MOD_DEVELOPMENT.md`](docs/MOD_DEVELOPMENT.md)
3. **Need API details?** → Read [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md)
4. **Understanding game?** → Read [`docs/GAME_MECHANICS.md`](docs/GAME_MECHANICS.md)
5. **Deep dive?** → Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
6. **Deploying?** → Read [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
7. **Stuck?** → Read [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)

## 💡 Pro Tips

1. **Always read docs first** - They're comprehensive and save time
2. **Use templates** - They're tested and work
3. **Copy patterns** - MOD_DEVELOPMENT.md has proven patterns
4. **Check examples** - Look at `public/mods/*.js` for inspiration
5. **Test incrementally** - Build and test small pieces
6. **Add error handling** - Always use try-catch in hooks
7. **Mind performance** - Stay within budgets

## 📦 Example Mods to Learn From

- `public/mods/better-hud-v2.js` - HUD overlay pattern
- `public/mods/screen-shake.js` - Timed effects pattern
- `public/mods/hit-markers.js` - Event-based visual feedback
- `public/mods/minimap-v2.js` - World-to-screen coordinates
- `public/mods/sound-effects.js` - Audio integration

## 🔗 Additional Resources

**In project root:**
- `MODS.md` - Original mod documentation
- `design.md` - Game design document
- `MOD_SYSTEM_ARCHITECTURE.md` - Deep technical analysis

**For Claude Code agents specifically:**
- `.claude/instructions.md` - Detailed Claude-specific guidance

## ✨ Summary

**The documentation is your superpower:**

✅ Comprehensive guides for every task
✅ Templates ready to use
✅ Examples you can adapt
✅ Performance guidelines
✅ Troubleshooting solutions

**Just follow this simple process:**

1. Read `docs/README.md` to find the right doc
2. Read the relevant doc for your task
3. Use templates and patterns
4. Test and verify
5. Ship it! 🚀

**Happy coding! The docs have your back.**
