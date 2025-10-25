// Better HUD v2 Mod
// Enhanced HUD with FPS counter, ping indicator, and ammo warnings
// Uses HUD Layout Manager for proper positioning!

let fps = 60;
let frameCount = 0;
let fpsUpdateTime = Date.now();

// Wait for HUD Layout Manager to be available
setTimeout(() => {
  if (!window.HUDLayoutManager) {
    console.error('❌ HUD Layout Manager not found! Load hud-layout-manager.js first');
    return;
  }

  // Register FPS counter (NE corner, high priority)
  window.HUDLayoutManager.register('fps-counter', {
    position: 'NE',
    priority: 100,
    width: 120,
    height: 45,
    render: (ctx, x, y) => {
      // Calculate FPS
      frameCount++;
      const now = Date.now();
      if (now - fpsUpdateTime > 500) {
        fps = Math.round(frameCount / ((now - fpsUpdateTime) / 1000));
        frameCount = 0;
        fpsUpdateTime = now;
      }

      const state = game.getState();
      const alivePlayers = state.players.filter(p => p.health > 0).length;

      // FPS Counter (right-aligned for NE corner)
      ctx.fillStyle = fps < 30 ? '#ff3366' : fps < 50 ? '#ffaa00' : '#66ff66';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${fps} FPS`, x + 120, y + 16);

      // Player count
      ctx.fillStyle = '#66ccff';
      ctx.fillText(`${alivePlayers} Players`, x + 120, y + 36);
    }
  });

  // Register ammo warnings (N center, high priority)
  window.HUDLayoutManager.register('ammo-warning', {
    position: 'N',
    priority: 90,
    width: 200,
    height: 30,
    render: (ctx, x, y) => {
      const state = game.getState();
      const myPlayer = state.players.find(p => p.id === game.getPlayerId());
      if (!myPlayer) return;

      // Low ammo warning
      if (myPlayer.ammo <= 3 && myPlayer.ammo > 0) {
        const alpha = Math.sin(Date.now() / 100) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 51, 102, ${alpha})`;
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('LOW AMMO!', x + 100, y + 20);
      }

      // Out of ammo warning
      if (myPlayer.ammo === 0) {
        const alpha = Math.sin(Date.now() / 150) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('RELOAD!', x + 100, y + 20);
      }
    }
  });

  console.log('✅ Better HUD v2 loaded (using Layout Manager)');
}, 200);
