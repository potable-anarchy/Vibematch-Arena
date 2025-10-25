// Hit Markers Mod
// Shows crosshair hit confirmation markers

const hitMarkers = [];

registerHook('onHit', (shooterId, targetId, damage) => {
  if (shooterId === game.getPlayerId()) {
    hitMarkers.push({
      time: Date.now(),
      damage: damage,
      life: 0.3
    });
  }
});

registerHook('onRender', (ctx, camera, dt) => {
  const canvas = game.getCanvas();
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Update and draw hit markers
  for (let i = hitMarkers.length - 1; i >= 0; i--) {
    const marker = hitMarkers[i];
    marker.life -= dt;

    if (marker.life <= 0) {
      hitMarkers.splice(i, 1);
      continue;
    }

    const alpha = marker.life / 0.3;
    const size = 15 + (1 - alpha) * 10; // Expands outward

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 3;

    // Draw four corners around crosshair
    const gap = 8;
    const length = 8;

    // Top left
    ctx.beginPath();
    ctx.moveTo(centerX - gap - size, centerY - gap - size);
    ctx.lineTo(centerX - gap - size - length, centerY - gap - size);
    ctx.moveTo(centerX - gap - size, centerY - gap - size);
    ctx.lineTo(centerX - gap - size, centerY - gap - size - length);
    ctx.stroke();

    // Top right
    ctx.beginPath();
    ctx.moveTo(centerX + gap + size, centerY - gap - size);
    ctx.lineTo(centerX + gap + size + length, centerY - gap - size);
    ctx.moveTo(centerX + gap + size, centerY - gap - size);
    ctx.lineTo(centerX + gap + size, centerY - gap - size - length);
    ctx.stroke();

    // Bottom left
    ctx.beginPath();
    ctx.moveTo(centerX - gap - size, centerY + gap + size);
    ctx.lineTo(centerX - gap - size - length, centerY + gap + size);
    ctx.moveTo(centerX - gap - size, centerY + gap + size);
    ctx.lineTo(centerX - gap - size, centerY + gap + size + length);
    ctx.stroke();

    // Bottom right
    ctx.beginPath();
    ctx.moveTo(centerX + gap + size, centerY + gap + size);
    ctx.lineTo(centerX + gap + size + length, centerY + gap + size);
    ctx.moveTo(centerX + gap + size, centerY + gap + size);
    ctx.lineTo(centerX + gap + size, centerY + gap + size + length);
    ctx.stroke();
  }
});

console.log('✅ Hit Markers loaded');
