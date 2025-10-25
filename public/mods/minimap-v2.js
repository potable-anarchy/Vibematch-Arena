// Minimap v2 Mod
// Shows a minimap with player positions
// Uses HUD Layout Manager!

const MINIMAP_SIZE = 150;

// Wait for HUD Layout Manager
setTimeout(() => {
  if (!window.HUDLayoutManager) {
    console.error("❌ HUD Layout Manager not found!");
    return;
  }

  window.HUDLayoutManager.register("minimap", {
    position: "NW", // Top-left corner
    priority: 50,
    width: MINIMAP_SIZE,
    height: MINIMAP_SIZE,
    render: (ctx, x, y) => {
      const state = game.getState();
      const myPlayer = state.players.find((p) => p.id === game.getPlayerId());
      if (!myPlayer) return;

      const worldWidth = 2000;
      const worldHeight = 2000;

      // Draw minimap background
      ctx.fillStyle = "rgba(10, 10, 20, 0.8)";
      ctx.fillRect(x, y, MINIMAP_SIZE, MINIMAP_SIZE);

      // Draw border
      ctx.strokeStyle = "#66ccff";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, MINIMAP_SIZE, MINIMAP_SIZE);

      // Draw grid
      ctx.strokeStyle = "rgba(102, 204, 255, 0.2)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const gridX = x + (MINIMAP_SIZE / 4) * i;
        const gridY = y + (MINIMAP_SIZE / 4) * i;
        ctx.beginPath();
        ctx.moveTo(gridX, y);
        ctx.lineTo(gridX, y + MINIMAP_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, gridY);
        ctx.lineTo(x + MINIMAP_SIZE, gridY);
        ctx.stroke();
      }

      // Draw pickups
      state.pickups.forEach((pickup) => {
        if (!pickup.active) return;

        const px = x + (pickup.x / worldWidth) * MINIMAP_SIZE;
        const py = y + (pickup.y / worldHeight) * MINIMAP_SIZE;

        const colors = {
          health_small: "#ff9999",
          health_big: "#ff3366",
          armor_light: "#99ddff",
          armor_heavy: "#66ccff",
          ammo: "#ffaa00",
          weapon_smg: "#66ccff",
          weapon_shotgun: "#ff6633",
          weapon_rifle: "#ffaa00",
        };

        ctx.fillStyle = colors[pickup.type] || "#ffffff";
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw players
      state.players.forEach((p) => {
        if (p.health <= 0) return;

        const px = x + (p.x / worldWidth) * MINIMAP_SIZE;
        const py = y + (p.y / worldHeight) * MINIMAP_SIZE;

        const isMe = p.id === game.getPlayerId();

        // Player dot
        ctx.fillStyle = isMe ? "#66ccff" : "#ff9966";
        ctx.beginPath();
        ctx.arc(px, py, isMe ? 4 : 3, 0, Math.PI * 2);
        ctx.fill();

        // Direction indicator for local player
        if (isMe) {
          ctx.strokeStyle = "#66ccff";
          ctx.lineWidth = 2;
          const dirLength = 8;
          const endX = px + Math.cos(p.aimAngle) * dirLength;
          const endY = py + Math.sin(p.aimAngle) * dirLength;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      });

    },
  });

  console.log("✅ Minimap v2 loaded (using Layout Manager)");
}, 200);
