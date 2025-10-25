# Live-Coding Mod System

The game includes a built-in live-coding mod system that lets you write and reload JavaScript code **while the game is running** without interrupting gameplay!

## How to Use

1. **Open the mod editor**: Press the **backtick key (`)** during gameplay
2. **Write your mod code** in the editor
3. **Load/Reload**: Click "LOAD MOD" or press **Ctrl+Enter** (Cmd+Enter on Mac)
4. **The mod runs immediately** without restarting the game!

## Available Hooks

Your mods can register hooks for various game events:

### `onHit(shooterId, targetId, damage)`
Called when a player hits another player.

```javascript
registerHook('onHit', (shooterId, targetId, damage) => {
  console.log(`Player ${shooterId} hit ${targetId} for ${damage} damage!`);
});
```

### `onKill(killerId, victimId)`
Called when a player kills another player.

```javascript
registerHook('onKill', (killerId, victimId) => {
  console.log(`💀 ${killerId} killed ${victimId}`);
});
```

### `onShoot(data)`
Called when any player shoots. Data includes: `playerId`, `x`, `y`, `angle`, `weapon`.

```javascript
registerHook('onShoot', (data) => {
  console.log(`${data.playerId} fired ${data.weapon}`);
});
```

### `onPickup(playerId, pickup)`
Called when a player collects a pickup.

```javascript
registerHook('onPickup', (playerId, pickup) => {
  console.log(`${playerId} collected ${pickup.type}`);
});
```

### `onPlayerDraw(ctx, player, camera)`
Called every frame for each player. Use this to draw custom effects on players.

```javascript
registerHook('onPlayerDraw', (ctx, player, camera) => {
  // Draw a custom aura around the player
  const screenX = (player.x - camera.x) + game.getCanvas().width / 2;
  const screenY = (player.y - camera.y) + game.getCanvas().height / 2;
  
  ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(screenX, screenY, 40, 0, Math.PI * 2);
  ctx.stroke();
});
```

### `onRender(ctx, camera, dt)`
Called every frame after everything is drawn. Use this for custom overlays or HUD elements.

```javascript
registerHook('onRender', (ctx, camera, dt) => {
  ctx.fillStyle = 'white';
  ctx.font = '20px monospace';
  ctx.fillText('My Custom Mod!', 10, 100);
});
```

### `onUpdate(dt)`
Called every frame for custom game logic.

```javascript
registerHook('onUpdate', (dt) => {
  // Your custom update logic here
});
```

## Accessing Game State

The `game` object provides access to game state:

```javascript
// Get current game state (players, pickups)
const state = game.getState();

// Get your player ID
const myId = game.getPlayerId();

// Get camera position
const camera = game.getCamera();

// Get canvas and rendering context
const canvas = game.getCanvas();
const ctx = game.getContext();

// Get loaded assets
const assets = game.getAssets();
```

## Example Mods

### 1. Kill Counter
Shows a kill count in the corner:

```javascript
let killCount = 0;

registerHook('onKill', (killerId, victimId) => {
  if (killerId === game.getPlayerId()) {
    killCount++;
  }
});

registerHook('onRender', (ctx) => {
  ctx.fillStyle = '#ff3366';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(`Kills: ${killCount}`, 10, 100);
});
```

### 2. Rainbow Trail
Adds a colorful trail behind your player:

```javascript
const trail = [];

registerHook('onRender', (ctx, camera, dt) => {
  const state = game.getState();
  const myPlayer = state.players.find(p => p.id === game.getPlayerId());
  
  if (myPlayer && myPlayer.health > 0) {
    trail.push({ x: myPlayer.x, y: myPlayer.y, life: 1.0 });
  }
  
  // Draw and update trail
  for (let i = trail.length - 1; i >= 0; i--) {
    const t = trail[i];
    t.life -= dt;
    
    if (t.life <= 0) {
      trail.splice(i, 1);
      continue;
    }
    
    const screenX = (t.x - camera.x) + game.getCanvas().width / 2;
    const screenY = (t.y - camera.y) + game.getCanvas().height / 2;
    
    const hue = (Date.now() / 10 + i * 10) % 360;
    ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${t.life * 0.5})`;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 5, 0, Math.PI * 2);
    ctx.fill();
  }
});
```

### 3. Hit Marker Sound
Plays a sound on every hit (you'll need to provide the sound):

```javascript
registerHook('onHit', (shooterId, targetId, damage) => {
  if (shooterId === game.getPlayerId()) {
    // Play hit sound
    const audio = new Audio('/path/to/hitsound.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }
});
```

### 4. Player Highlight
Highlights all enemy players with red glow:

```javascript
registerHook('onPlayerDraw', (ctx, player, camera) => {
  if (player.id !== game.getPlayerId() && player.health > 0) {
    const screenX = (player.x - camera.x) + game.getCanvas().width / 2;
    const screenY = (player.y - camera.y) + game.getCanvas().height / 2;
    
    ctx.shadowColor = 'red';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
});
```

### 5. Damage Numbers
Shows floating damage numbers when you hit someone:

```javascript
const damageNumbers = [];

registerHook('onHit', (shooterId, targetId, damage) => {
  if (shooterId === game.getPlayerId()) {
    const target = game.getState().players.find(p => p.id === targetId);
    if (target) {
      damageNumbers.push({
        x: target.x,
        y: target.y,
        damage: damage,
        life: 1.0
      });
    }
  }
});

registerHook('onRender', (ctx, camera, dt) => {
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    const dmg = damageNumbers[i];
    dmg.life -= dt;
    dmg.y -= 50 * dt; // Float upward
    
    if (dmg.life <= 0) {
      damageNumbers.splice(i, 1);
      continue;
    }
    
    const screenX = (dmg.x - camera.x) + game.getCanvas().width / 2;
    const screenY = (dmg.y - camera.y) + game.getCanvas().height / 2;
    
    ctx.fillStyle = `rgba(255, 255, 0, ${dmg.life})`;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`-${dmg.damage}`, screenX, screenY);
  }
});
```

### 6. Speedometer
Shows your current speed:

```javascript
registerHook('onRender', (ctx) => {
  const state = game.getState();
  const myPlayer = state.players.find(p => p.id === game.getPlayerId());
  
  if (myPlayer) {
    const speed = Math.sqrt(myPlayer.vx * myPlayer.vx + myPlayer.vy * myPlayer.vy);
    ctx.fillStyle = '#66ccff';
    ctx.font = '16px monospace';
    ctx.fillText(`Speed: ${speed.toFixed(0)}`, 10, 120);
  }
});
```

## Tips

- **Use Ctrl+Enter** to quickly reload your mod while testing
- Mods persist until you unload them or refresh the page
- You can have multiple mods loaded at once
- Check the browser console (F12) for errors
- Mods run client-side only - they don't affect other players
- Performance matters! Avoid heavy calculations in `onRender` hooks

## Advanced: Custom Particles

```javascript
const customParticles = [];

registerHook('onShoot', (data) => {
  if (data.playerId === game.getPlayerId()) {
    // Spawn sparkles when you shoot
    for (let i = 0; i < 10; i++) {
      customParticles.push({
        x: data.x,
        y: data.y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 0.5,
        maxLife: 0.5,
        size: 2 + Math.random() * 3
      });
    }
  }
});

registerHook('onRender', (ctx, camera, dt) => {
  for (let i = customParticles.length - 1; i >= 0; i--) {
    const p = customParticles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    
    if (p.life <= 0) {
      customParticles.splice(i, 1);
      continue;
    }
    
    const screenX = (p.x - camera.x) + game.getCanvas().width / 2;
    const screenY = (p.y - camera.y) + game.getCanvas().height / 2;
    
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = `rgba(255, 200, 0, ${alpha})`;
    ctx.beginPath();
    ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
});
```

Have fun modding! Press **`** to open the editor and start coding!
