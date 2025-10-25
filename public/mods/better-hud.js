// Better HUD Mod
// Enhanced HUD with FPS counter, ping indicator, and ammo warnings

let lastFrameTime = Date.now();
let fps = 60;
let frameCount = 0;
let fpsUpdateTime = Date.now();

registerHook('onRender', (ctx, camera, dt) => {
  // Calculate FPS
  frameCount++;
  const now = Date.now();
  if (now - fpsUpdateTime > 500) {
    fps = Math.round(frameCount / ((now - fpsUpdateTime) / 1000));
    frameCount = 0;
    fpsUpdateTime = now;
  }

  const state = game.getState();
  const myPlayer = state.players.find(p => p.id === game.getPlayerId());

  if (!myPlayer) return;

  // FPS Counter (top right)
  ctx.fillStyle = fps < 30 ? '#ff3366' : fps < 50 ? '#ffaa00' : '#66ff66';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${fps} FPS`, game.getCanvas().width - 10, 30);

  // Player count
  const alivePlayers = state.players.filter(p => p.health > 0).length;
  ctx.fillStyle = '#66ccff';
  ctx.fillText(`${alivePlayers} Players`, game.getCanvas().width - 10, 50);

  // Low ammo warning
  if (myPlayer.ammo <= 3 && myPlayer.ammo > 0) {
    const alpha = Math.sin(Date.now() / 100) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255, 51, 102, ${alpha})`;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LOW AMMO!', game.getCanvas().width / 2, 80);
  }

  // Out of ammo warning
  if (myPlayer.ammo === 0) {
    const alpha = Math.sin(Date.now() / 150) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('RELOAD!', game.getCanvas().width / 2, 80);
  }

  // Speed indicator (debug)
  const speed = Math.sqrt((myPlayer.vx || 0) ** 2 + (myPlayer.vy || 0) ** 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Speed: ${Math.round(speed)}`, 10, game.getCanvas().height - 10);
});

console.log('✅ Better HUD loaded');
