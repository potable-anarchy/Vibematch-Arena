// Kill Counter Mod
// Shows your kill count in the top-left corner

let killCount = 0;

registerHook('onKill', (killerId, victimId) => {
  if (killerId === game.getPlayerId()) {
    killCount++;
  }
});

registerHook('onRender', (ctx) => {
  ctx.fillStyle = '#ff3366';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Kills: ${killCount}`, 10, 100);
});
