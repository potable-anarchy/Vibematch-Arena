// Killstreak Announcer v2 Mod
// Announces killstreaks with visual and audio feedback
// Uses HUD Layout Manager for streak counter!

let currentStreak = 0;
let announcements = [];

const KILLSTREAK_NAMES = {
  3: "KILLING SPREE",
  5: "RAMPAGE",
  7: "DOMINATING",
  10: "UNSTOPPABLE",
  15: "GODLIKE",
};

registerHook("onKill", (killerId, victimId) => {
  if (killerId === game.getPlayerId()) {
    currentStreak++;

    // Check for killstreak milestone
    if (KILLSTREAK_NAMES[currentStreak]) {
      announcements.push({
        text: KILLSTREAK_NAMES[currentStreak],
        streak: currentStreak,
        life: 3.0,
        maxLife: 3.0,
      });
    }
  } else if (victimId === game.getPlayerId()) {
    // Reset streak on death
    currentStreak = 0;
  }
});

// Wait for HUD Layout Manager to be available
setTimeout(() => {
  if (!window.HUDLayoutManager) {
    console.error(
      "❌ HUD Layout Manager not found! Load hud-layout-manager.js first",
    );
    return;
  }

  // Register streak counter (NW corner, medium priority)
  window.HUDLayoutManager.register("killstreak-counter", {
    position: "NW",
    priority: 60,
    width: 120,
    height: 20,
    render: (ctx, x, y) => {
      if (currentStreak < 2) return; // Only show when streak >= 2

      ctx.fillStyle = "rgba(255, 51, 102, 0.8)";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`Streak: ${currentStreak}`, x, y + 15);
    },
  });

  console.log("✅ Killstreak Announcer v2 loaded (using Layout Manager)");
}, 200);

// Announcement popups (center screen, not part of HUD layout)
registerHook("onRender", (ctx, camera, dt) => {
  const canvas = game.getCanvas();

  // Update and draw announcements
  for (let i = announcements.length - 1; i >= 0; i--) {
    const ann = announcements[i];
    ann.life -= dt;

    if (ann.life <= 0) {
      announcements.splice(i, 1);
      continue;
    }

    const alpha = Math.min(1, ann.life / 0.5); // Fade in/out
    const scale = 1 + (1 - ann.life / ann.maxLife) * 0.3; // Grow over time

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 3); // Centered vertically at 1/3 from top
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = `rgba(255, 51, 102, ${alpha * 0.3})`;
    ctx.fillRect(-200, -30, 400, 60);

    // Border
    ctx.strokeStyle = `rgba(255, 51, 102, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(-200, -30, 400, 60);

    // Text
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Shadow
    ctx.shadowColor = `rgba(255, 51, 102, ${alpha * 0.8})`;
    ctx.shadowBlur = 10;

    ctx.fillText(ann.text, 0, 0);

    // Streak number
    ctx.font = "bold 18px monospace";
    ctx.fillStyle = `rgba(255, 204, 0, ${alpha})`;
    ctx.fillText(`${ann.streak} KILLS`, 0, 25);

    ctx.restore();
  }
});
