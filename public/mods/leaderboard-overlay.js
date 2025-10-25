// Leaderboard Overlay v2 Mod
// Shows top 5 players with better styling (Toggle with TAB key)
// Uses HUD Layout Manager for proper positioning!

let showLeaderboard = false;

// Listen for TAB key
document.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    showLeaderboard = !showLeaderboard;
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

  // Register TAB hint (N center, lower priority than ammo warning)
  window.HUDLayoutManager.register("leaderboard-hint", {
    position: "N",
    priority: 50,
    width: 200,
    height: 20,
    render: (ctx, x, y) => {
      if (showLeaderboard) return; // Don't show hint when leaderboard is open

      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Press TAB for leaderboard", x + 100, y + 15);
    },
  });

  // Register full leaderboard overlay (renders over everything when active)
  registerHook("onRender", (ctx, camera, dt) => {
    if (!showLeaderboard) return;

    const state = game.getState();
    const canvas = game.getCanvas();

    // Sort players by kills
    const sortedPlayers = [...state.players].sort((a, b) => b.kills - a.kills);
    const top5 = sortedPlayers.slice(0, 5);

    // Leaderboard position (center of screen)
    const width = 400;
    const height = 60 + top5.length * 40;
    const x = (canvas.width - width) / 2;
    const y = (canvas.height - height) / 2;

    // Semi-transparent backdrop
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "rgba(10, 10, 20, 0.95)";
    ctx.fillRect(x, y, width, height);

    // Border
    ctx.strokeStyle = "#66ccff";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    // Title
    ctx.fillStyle = "#66ccff";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("LEADERBOARD", x + width / 2, y + 35);

    // Player entries
    top5.forEach((player, i) => {
      const entryY = y + 70 + i * 40;
      const isMe = player.id === game.getPlayerId();

      // Highlight current player
      if (isMe) {
        ctx.fillStyle = "rgba(102, 204, 255, 0.2)";
        ctx.fillRect(x + 5, entryY - 25, width - 10, 35);
      }

      // Rank
      ctx.fillStyle = i === 0 ? "#ffaa00" : "#ffffff";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`#${i + 1}`, x + 15, entryY);

      // Name
      ctx.fillStyle = isMe ? "#66ccff" : "#ffffff";
      ctx.font = isMe ? "bold 18px monospace" : "18px monospace";
      ctx.fillText(player.name, x + 60, entryY);

      // K/D
      ctx.fillStyle = "#ff3366";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`${player.kills}/${player.deaths}`, x + width - 15, entryY);

      // KD Ratio
      const kd =
        player.deaths === 0
          ? player.kills
          : (player.kills / player.deaths).toFixed(2);
      ctx.fillStyle = "#66ff66";
      ctx.font = "14px monospace";
      ctx.fillText(`(${kd})`, x + width - 120, entryY);
    });

    // Footer
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Press TAB to close", x + width / 2, y + height - 10);
  });

  console.log("✅ Leaderboard Overlay v2 loaded - Press TAB to toggle");
}, 200);
