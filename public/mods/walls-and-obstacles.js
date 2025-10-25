// Walls and Obstacles Mod
// Adds walls and obstacles to the map with collision detection

const walls = [
  // Outer perimeter walls
  { x: 0, y: 0, width: 2000, height: 20 },        // Top
  { x: 0, y: 1980, width: 2000, height: 20 },    // Bottom
  { x: 0, y: 0, width: 20, height: 2000 },       // Left
  { x: 1980, y: 0, width: 20, height: 2000 },    // Right

  // Center structure
  { x: 900, y: 900, width: 200, height: 20 },    // Center horizontal
  { x: 990, y: 900, width: 20, height: 200 },    // Center vertical

  // Corner structures (cover spots)
  { x: 200, y: 200, width: 150, height: 20 },    // NW horizontal
  { x: 200, y: 200, width: 20, height: 150 },    // NW vertical

  { x: 1650, y: 200, width: 150, height: 20 },   // NE horizontal
  { x: 1780, y: 200, width: 20, height: 150 },   // NE vertical

  { x: 200, y: 1650, width: 150, height: 20 },   // SW horizontal
  { x: 200, y: 1650, width: 20, height: 150 },   // SW vertical

  { x: 1650, y: 1780, width: 150, height: 20 },  // SE horizontal
  { x: 1780, y: 1650, width: 20, height: 150 },  // SE vertical

  // Mid-map cover
  { x: 500, y: 500, width: 100, height: 20 },
  { x: 1400, y: 500, width: 100, height: 20 },
  { x: 500, y: 1480, width: 100, height: 20 },
  { x: 1400, y: 1480, width: 100, height: 20 },

  // Corridors
  { x: 700, y: 400, width: 20, height: 200 },
  { x: 1280, y: 400, width: 20, height: 200 },
  { x: 700, y: 1400, width: 20, height: 200 },
  { x: 1280, y: 1400, width: 20, height: 200 },
];

// Crates (destructible later?)
const crates = [
  { x: 600, y: 800, size: 40 },
  { x: 1400, y: 800, size: 40 },
  { x: 600, y: 1200, size: 40 },
  { x: 1400, y: 1200, size: 40 },
  { x: 1000, y: 600, size: 40 },
  { x: 1000, y: 1400, size: 40 },
];

registerHook('onRender', (ctx, camera, dt) => {
  const canvas = game.getCanvas();

  // Helper to convert world to screen coords
  function worldToScreen(x, y) {
    return {
      x: (x - camera.x) + canvas.width / 2,
      y: (y - camera.y) + canvas.height / 2
    };
  }

  // Draw walls
  ctx.fillStyle = '#2a2a3e';
  ctx.strokeStyle = '#3a3a5e';
  ctx.lineWidth = 2;

  walls.forEach(wall => {
    const pos = worldToScreen(wall.x, wall.y);

    // Only draw if visible on screen
    if (pos.x + wall.width > 0 && pos.x < canvas.width &&
        pos.y + wall.height > 0 && pos.y < canvas.height) {

      ctx.fillRect(pos.x, pos.y, wall.width, wall.height);
      ctx.strokeRect(pos.x, pos.y, wall.width, wall.height);
    }
  });

  // Draw crates
  ctx.fillStyle = '#8b6f47';
  ctx.strokeStyle = '#5a4a2f';
  ctx.lineWidth = 2;

  crates.forEach(crate => {
    const pos = worldToScreen(crate.x, crate.y);

    if (pos.x + crate.size > 0 && pos.x < canvas.width &&
        pos.y + crate.size > 0 && pos.y < canvas.height) {

      ctx.fillRect(pos.x, pos.y, crate.size, crate.size);
      ctx.strokeRect(pos.x, pos.y, crate.size, crate.size);

      // Crate details
      ctx.strokeStyle = '#4a3a1f';
      ctx.beginPath();
      ctx.moveTo(pos.x + 5, pos.y + 5);
      ctx.lineTo(pos.x + crate.size - 5, pos.y + crate.size - 5);
      ctx.moveTo(pos.x + crate.size - 5, pos.y + 5);
      ctx.lineTo(pos.x + 5, pos.y + crate.size - 5);
      ctx.stroke();
    }
  });
});

console.log('✅ Walls and Obstacles loaded -', walls.length, 'walls,', crates.length, 'crates');
