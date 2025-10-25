// Screen Shake Mod
// Adds camera shake on hits and kills for more impact

let shakeIntensity = 0;
let shakeDecay = 0.9;

registerHook('onHit', (shooterId, targetId, damage) => {
  if (targetId === game.getPlayerId()) {
    // Getting hit - shake based on damage
    shakeIntensity = Math.min(shakeIntensity + damage * 0.3, 15);
  } else if (shooterId === game.getPlayerId()) {
    // Hitting someone - light shake
    shakeIntensity = Math.min(shakeIntensity + 2, 10);
  }
});

registerHook('onKill', (killerId, victimId) => {
  if (victimId === game.getPlayerId()) {
    // Death shake
    shakeIntensity = 20;
  } else if (killerId === game.getPlayerId()) {
    // Kill confirmed shake
    shakeIntensity = Math.min(shakeIntensity + 8, 15);
  }
});

registerHook('onShoot', (data) => {
  if (data.playerId === game.getPlayerId()) {
    // Weapon kick
    const kickAmounts = {
      pistol: 0.5,
      smg: 0.3,
      shotgun: 3.0,
      rifle: 1.5
    };
    shakeIntensity = Math.min(shakeIntensity + (kickAmounts[data.weapon] || 0.5), 8);
  }
});

registerHook('onRender', (ctx, camera, dt) => {
  if (shakeIntensity > 0.1) {
    // Save canvas state before applying shake
    ctx.save();

    // Apply shake to camera
    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;

    ctx.translate(shakeX, shakeY);

    // Decay shake
    shakeIntensity *= shakeDecay;

    // Restore canvas state after shake is applied
    ctx.restore();
  }
});

console.log('✅ Screen Shake loaded');
