// Credits HUD
// Displays player's current credits with notifications for earnings

let lastCredits = 0;
let creditNotifications = [];

// Wait for HUD Layout Manager to be available
setTimeout(() => {
  if (!window.HUDLayoutManager) {
    console.error(
      "❌ HUD Layout Manager not found! Load hud-layout-manager.js first",
    );
    return;
  }

  // Register credits display (NE corner, high priority)
  window.HUDLayoutManager.register("credits-display", {
    position: "NE",
    priority: 90,
    width: 150,
    height: 25,
    render: (ctx, x, y) => {
      const state = game.getState();
      const myId = game.getPlayerId();
      const player = state.players.find((p) => p.id === myId);

      if (!player) return;

      const credits = player.credits || 0;

      // Check for credit increase
      if (credits > lastCredits) {
        const earned = credits - lastCredits;
        creditNotifications.push({
          text: `+${earned}`,
          life: 2.0,
          maxLife: 2.0,
        });
      }
      lastCredits = credits;

      // Background
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(x, y, 150, 25);

      // Border
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 150, 25);

      // Icon (coin symbol)
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "left";
      ctx.fillText("$", x + 8, y + 18);

      // Credits text
      ctx.fillStyle = "#ffd700";
      ctx.font = "bold 16px monospace";
      ctx.fillText(`${credits} CR`, x + 25, y + 18);

      // Shop hint
      ctx.fillStyle = "#888888";
      ctx.font = "10px monospace";
      ctx.fillText("Press B", x + 90, y + 18);
    },
  });

  console.log("✅ Credits HUD loaded");
}, 200);

// Credit notifications (floating +credits text)
registerHook("onRender", (ctx, camera, dt) => {
  const canvas = game.getCanvas();

  // Update and draw credit notifications
  for (let i = creditNotifications.length - 1; i >= 0; i--) {
    const notif = creditNotifications[i];
    notif.life -= dt;

    if (notif.life <= 0) {
      creditNotifications.splice(i, 1);
      continue;
    }

    const alpha = Math.min(1, notif.life / 0.5);
    const yOffset = (notif.maxLife - notif.life) * 30; // Float upward

    ctx.save();

    // Position in top-right near credits display
    const x = canvas.width - 80;
    const y = 80 + yOffset;

    // Shadow
    ctx.shadowColor = "rgba(255, 215, 0, 0.8)";
    ctx.shadowBlur = 10;

    // Text
    ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "right";
    ctx.fillText(notif.text, x, y);

    ctx.restore();
  }
});

// Track kills for credit notifications
registerHook("onKill", (killerId, victimId) => {
  if (killerId === game.getPlayerId()) {
    // Credit notification will be triggered automatically by credit increase
  }
});
