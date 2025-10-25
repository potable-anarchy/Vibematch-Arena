// Damage Numbers Mod
// Shows floating damage numbers when you hit someone

const damageNumbers = [];

registerHook('onHit', (shooterId, targetId, damage) => {
  if (shooterId === game.getPlayerId()) {
    const target = game.getState().players.find(p => p.id === targetId);
    if (target) {
      damageNumbers.push({
        x: target.x,
        y: target.y,
        damage: damage,
        life: 1.5
      });
    }
  }
});

registerHook('onRender', (ctx, camera, dt) => {
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    const dmg = damageNumbers[i];
    dmg.life -= dt;
    dmg.y -= 80 * dt; // Float upward

    if (dmg.life <= 0) {
      damageNumbers.splice(i, 1);
      continue;
    }

    const screenX = (dmg.x - camera.x) + game.getCanvas().width / 2;
    const screenY = (dmg.y - camera.y) + game.getCanvas().height / 2;

    ctx.fillStyle = `rgba(255, 255, 0, ${dmg.life})`;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(`-${Math.ceil(dmg.damage)}`, screenX, screenY);
    ctx.fillText(`-${Math.ceil(dmg.damage)}`, screenX, screenY);
  }
});
