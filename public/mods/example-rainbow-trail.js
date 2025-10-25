// Rainbow Trail Mod
// Adds a colorful particle trail behind your player

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
