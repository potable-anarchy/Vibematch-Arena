// HUD Layout Manager Mod
// Manages HUD element positioning with fuzzy directions (N, S, E, W, NE, NW, SE, SW)
// Elements tile next to each other based on priority/weight

const HUDLayoutManager = {
  elements: new Map(),
  padding: 10,

  // Register a HUD element
  register(id, config) {
    // config: { position: 'NE', priority: 1, width: 200, height: 50, render: (ctx, x, y) => {} }
    this.elements.set(id, {
      ...config,
      actualX: 0,
      actualY: 0,
    });
  },

  // Unregister a HUD element
  unregister(id) {
    this.elements.delete(id);
  },

  // Calculate positions for all elements
  calculatePositions(canvas) {
    // Safety check - ensure canvas has valid dimensions
    if (!canvas || !canvas.width || !canvas.height) {
      console.warn(
        "HUD Layout Manager: Canvas not ready, skipping position calculation",
      );
      return;
    }

    // Group elements by position
    const groups = {
      N: [],
      S: [],
      E: [],
      W: [],
      NE: [],
      NW: [],
      SE: [],
      SW: [],
    };

    for (const [id, elem] of this.elements) {
      groups[elem.position].push({ id, ...elem });
    }

    // Sort each group by priority (higher priority = closer to corner/edge)
    for (const pos in groups) {
      groups[pos].sort((a, b) => b.priority - a.priority);
    }

    // Calculate actual positions

    // North (top center)
    let northY = this.padding;
    groups.N.forEach((elem) => {
      elem.actualX = (canvas.width - elem.width) / 2;
      elem.actualY = northY;
      northY += elem.height + this.padding;
      this.elements.get(elem.id).actualX = elem.actualX;
      this.elements.get(elem.id).actualY = elem.actualY;
    });

    // South (bottom center)
    let southY = canvas.height - this.padding;
    groups.S.forEach((elem) => {
      southY -= elem.height;
      elem.actualX = (canvas.width - elem.width) / 2;
      elem.actualY = southY;
      southY -= this.padding;
      this.elements.get(elem.id).actualX = elem.actualX;
      this.elements.get(elem.id).actualY = elem.actualY;
    });

    // East (right center)
    let eastY =
      (canvas.height -
        groups.E.reduce((sum, e) => sum + e.height + this.padding, 0)) /
      2;
    groups.E.forEach((elem) => {
      elem.actualX = canvas.width - elem.width - this.padding;
      elem.actualY = eastY;
      eastY += elem.height + this.padding;
      this.elements.get(elem.id).actualX = elem.actualX;
      this.elements.get(elem.id).actualY = elem.actualY;
    });

    // West (left center)
    let westY =
      (canvas.height -
        groups.W.reduce((sum, e) => sum + e.height + this.padding, 0)) /
      2;
    groups.W.forEach((elem) => {
      elem.actualX = this.padding;
      elem.actualY = westY;
      westY += elem.height + this.padding;
      this.elements.get(elem.id).actualX = elem.actualX;
      this.elements.get(elem.id).actualY = elem.actualY;
    });

    // NE (top right corner)
    let neY = this.padding;
    groups.NE.forEach((elem) => {
      elem.actualX = canvas.width - elem.width - this.padding;
      elem.actualY = neY;
      neY += elem.height + this.padding;
      this.elements.get(elem.id).actualX = elem.actualX;
      this.elements.get(elem.id).actualY = elem.actualY;
    });

    // NW (top left corner)
    let nwY = this.padding;
    groups.NW.forEach((elem) => {
      elem.actualX = this.padding;
      elem.actualY = nwY;
      nwY += elem.height + this.padding;
      this.elements.get(elem.id).actualX = elem.actualX;
      this.elements.get(elem.id).actualY = elem.actualY;
    });

    // SE (bottom right corner)
    let seY = canvas.height - this.padding;
    groups.SE.forEach((elem) => {
      seY -= elem.height;
      elem.actualX = canvas.width - elem.width - this.padding;
      elem.actualY = seY;
      seY -= this.padding;
      this.elements.get(elem.id).actualX = elem.actualX;
      this.elements.get(elem.id).actualY = elem.actualY;
    });

    // SW (bottom left corner)
    let swY = canvas.height - this.padding;
    groups.SW.forEach((elem) => {
      swY -= elem.height;
      elem.actualX = this.padding;
      elem.actualY = swY;
      swY -= this.padding;
      this.elements.get(elem.id).actualX = elem.actualX;
      this.elements.get(elem.id).actualY = elem.actualY;
    });
  },

  // Render all elements
  render(ctx, canvas) {
    this.calculatePositions(canvas);

    // Render in priority order (lower priority first, so higher priority draws on top)
    // Need to include the ID from the Map key
    const sorted = Array.from(this.elements.entries())
      .map(([id, elem]) => ({ id, ...elem }))
      .sort((a, b) => a.priority - b.priority);

    for (const elem of sorted) {
      ctx.save();

      // DEBUG: Draw bounding boxes
      if (window.DEBUG_HUD) {
        // Bounding box
        ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(elem.actualX, elem.actualY, elem.width, elem.height);

        // Semi-transparent fill
        ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
        ctx.fillRect(elem.actualX, elem.actualY, elem.width, elem.height);

        // Label with background
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(elem.actualX, elem.actualY, elem.width, 30);

        ctx.fillStyle = "rgba(255, 255, 0, 1)";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`${elem.id}`, elem.actualX + 2, elem.actualY + 12);
        ctx.font = "10px monospace";
        ctx.fillText(
          `${elem.position} pri:${elem.priority}`,
          elem.actualX + 2,
          elem.actualY + 24,
        );
      }

      if (elem.render) {
        elem.render(ctx, elem.actualX, elem.actualY);
      }
      ctx.restore();
    }
  },

  // Debug helper
  enableDebug() {
    window.DEBUG_HUD = true;
    console.log("🐛 HUD Debug mode enabled - showing bounding boxes");
  },

  disableDebug() {
    window.DEBUG_HUD = false;
    console.log("🐛 HUD Debug mode disabled");
  },
};

// Make it globally available
window.HUDLayoutManager = HUDLayoutManager;

console.log(
  "✅ HUD Layout Manager loaded - Use window.HUDLayoutManager to register elements",
);
console.log(
  '   Example: HUDLayoutManager.register("myHud", { position: "NE", priority: 10, width: 200, height: 50, render: (ctx, x, y) => {...} })',
);

// Register render hook (HUD renders last since this mod loads first in mods.json)
registerHook("onRender", (ctx, camera, dt) => {
  const canvas = game.getCanvas();
  HUDLayoutManager.render(ctx, canvas);
});
console.log("✅ HUD Layout Manager render hook registered");
