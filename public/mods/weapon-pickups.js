// Weapon Pickups v2 Mod
// Adds weapon pickups scattered around the map
// Uses HUD Layout Manager for pickup counter!

const weaponPickups = [
  // SMGs
  { x: 400, y: 400, weapon: "smg", respawn: 15000 },
  { x: 1600, y: 400, weapon: "smg", respawn: 15000 },
  { x: 400, y: 1600, weapon: "smg", respawn: 15000 },
  { x: 1600, y: 1600, weapon: "smg", respawn: 15000 },

  // Shotguns
  { x: 300, y: 1000, weapon: "shotgun", respawn: 20000 },
  { x: 1700, y: 1000, weapon: "shotgun", respawn: 20000 },

  // Rifles
  { x: 1000, y: 300, weapon: "rifle", respawn: 25000 },
  { x: 1000, y: 1700, weapon: "rifle", respawn: 25000 },

  // Center power weapon
  { x: 1000, y: 1000, weapon: "rifle", respawn: 30000 },
];

// Track pickup state
weaponPickups.forEach((pickup) => {
  pickup.active = true;
  pickup.collectedAt = null;
});

const PICKUP_RADIUS = 30;
const COLLECT_DISTANCE = 50;

registerHook("onRender", (ctx, camera, dt) => {
  const canvas = game.getCanvas();
  const state = game.getState();
  const myPlayer = state.players.find((p) => p.id === game.getPlayerId());

  function worldToScreen(x, y) {
    return {
      x: x - camera.x + canvas.width / 2,
      y: y - camera.y + canvas.height / 2,
    };
  }

  const now = Date.now();

  weaponPickups.forEach((pickup) => {
    // Check respawn
    if (
      !pickup.active &&
      pickup.collectedAt &&
      now - pickup.collectedAt > pickup.respawn
    ) {
      pickup.active = true;
      pickup.collectedAt = null;
    }

    // Check collection
    if (pickup.active && myPlayer && myPlayer.health > 0) {
      const dx = myPlayer.x - pickup.x;
      const dy = myPlayer.y - pickup.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < COLLECT_DISTANCE) {
        // Would collect weapon here (need server-side implementation)
        // For now just show proximity indicator
      }
    }

    if (!pickup.active) return;

    const pos = worldToScreen(pickup.x, pickup.y);

    // Only draw if visible
    if (
      pos.x + PICKUP_RADIUS > 0 &&
      pos.x - PICKUP_RADIUS < canvas.width &&
      pos.y + PICKUP_RADIUS > 0 &&
      pos.y - PICKUP_RADIUS < canvas.height
    ) {
      // Pulsing effect
      const pulse = Math.sin(Date.now() / 300) * 0.15 + 0.85;
      const size = PICKUP_RADIUS * pulse;

      // Weapon colors
      const colors = {
        pistol: "#cccccc",
        smg: "#66ccff",
        shotgun: "#ff6633",
        rifle: "#ffaa00",
      };

      const color = colors[pickup.weapon] || "#ffffff";

      // Glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;

      // Background circle
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size + 5, 0, Math.PI * 2);
      ctx.fill();

      // Weapon icon circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Weapon symbol
      ctx.fillStyle = "#000";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const symbols = {
        pistol: "P",
        smg: "S",
        shotgun: "SG",
        rifle: "R",
      };

      ctx.fillText(symbols[pickup.weapon] || "?", pos.x, pos.y);

      // Weapon name label
      ctx.fillStyle = color;
      ctx.font = "bold 12px monospace";
      ctx.fillText(pickup.weapon.toUpperCase(), pos.x, pos.y + size + 15);

      // Check distance to player
      if (myPlayer && myPlayer.health > 0) {
        const dx = myPlayer.x - pickup.x;
        const dy = myPlayer.y - pickup.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < COLLECT_DISTANCE) {
          // Collection prompt
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.font = "bold 10px monospace";
          ctx.fillText("Press E", pos.x, pos.y + size + 28);
        }
      }
    }
  });
});

// Register weapon pickup counter with HUD Layout Manager
setTimeout(() => {
  if (!window.HUDLayoutManager) {
    console.error(
      "❌ HUD Layout Manager not found! Load hud-layout-manager.js first",
    );
    return;
  }

  window.HUDLayoutManager.register("weapon-pickup-counter", {
    position: "SW",
    priority: 20,
    width: 180,
    height: 18,
    render: (ctx, x, y) => {
      const activeWeapons = weaponPickups.filter((w) => w.active).length;
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "12px monospace";
      ctx.textAlign = "left";
      ctx.fillText(
        `Weapons: ${activeWeapons}/${weaponPickups.length}`,
        x,
        y + 12,
      );
    },
  });

  console.log(
    "✅ Weapon Pickups v2 loaded -",
    weaponPickups.length,
    "weapons on map (using Layout Manager)",
  );
}, 200);
