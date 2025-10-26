// Level Editor Module
export class LevelEditor {
  constructor() {
    this.canvas = document.getElementById("editorCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.isActive = false;

    // Camera
    this.camera = { x: 1000, y: 1000 };
    this.zoom = 1;

    // Current tool
    this.currentTool = "wall";
    this.pickupType = "health_small";

    // Level data
    this.levelData = {
      name: "Untitled Level",
      width: 2000,
      height: 2000,
      walls: [],
      crates: [],
      spawnPoints: [],
      pickups: [],
      waypoints: [],
    };

    // Drawing state
    this.isDrawing = false;
    this.dragStart = null;
    this.selectedObject = null;

    // Input state
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;

    this.setupEventListeners();
    this.setupUI();
  }

  setupEventListeners() {
    // Canvas events
    this.canvas.addEventListener("mousedown", (e) => this.onMouseDown(e));
    this.canvas.addEventListener("mousemove", (e) => this.onMouseMove(e));
    this.canvas.addEventListener("mouseup", (e) => this.onMouseUp(e));
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("wheel", (e) => this.onWheel(e));

    // Keyboard events
    window.addEventListener("keydown", (e) => {
      if (this.isActive) {
        this.keys[e.key.toLowerCase()] = true;
      }
    });
    window.addEventListener("keyup", (e) => {
      if (this.isActive) {
        this.keys[e.key.toLowerCase()] = false;
      }
    });
  }

  setupUI() {
    // Tool buttons
    const toolButtons = document.querySelectorAll(".tool-btn");
    toolButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        toolButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentTool = btn.dataset.tool;
      });
    });

    // Pickup type selector
    const pickupSelect = document.getElementById("pickupTypeSelect");
    pickupSelect.addEventListener("change", () => {
      this.pickupType = pickupSelect.value;
    });

    // Map size inputs
    const widthInput = document.getElementById("mapWidthInput");
    const heightInput = document.getElementById("mapHeightInput");
    widthInput.addEventListener("change", () => {
      this.levelData.width = parseInt(widthInput.value);
    });
    heightInput.addEventListener("change", () => {
      this.levelData.height = parseInt(heightInput.value);
    });

    // Level name input
    const nameInput = document.getElementById("levelNameInput");
    nameInput.addEventListener("change", () => {
      this.levelData.name = nameInput.value;
    });

    // Action buttons
    document
      .getElementById("saveLevelButton")
      .addEventListener("click", () => this.saveLevel());
    document
      .getElementById("loadLevelButton")
      .addEventListener("click", () => this.showLoadDialog());
    document
      .getElementById("newLevelButton")
      .addEventListener("click", () => this.newLevel());
    document
      .getElementById("exitEditorButton")
      .addEventListener("click", () => this.exit());
  }

  open() {
    this.isActive = true;
    document.getElementById("levelEditor").style.display = "flex";
    document.getElementById("game").style.display = "none";
    document.getElementById("gameMenu").style.display = "none";

    // Resize canvas
    this.resizeCanvas();

    // Load saved levels list
    this.loadLevelsList();

    // Start render loop
    this.renderLoop();
  }

  exit() {
    this.isActive = false;
    document.getElementById("levelEditor").style.display = "none";
    document.getElementById("game").style.display = "block";
  }

  resizeCanvas() {
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }

  // World to screen coordinate conversion
  worldToScreenX(worldX) {
    return (worldX - this.camera.x) * this.zoom + this.canvas.width / 2;
  }

  worldToScreenY(worldY) {
    return (worldY - this.camera.y) * this.zoom + this.canvas.height / 2;
  }

  // Screen to world coordinate conversion
  screenToWorldX(screenX) {
    return (screenX - this.canvas.width / 2) / this.zoom + this.camera.x;
  }

  screenToWorldY(screenY) {
    return (screenY - this.canvas.height / 2) / this.zoom + this.camera.y;
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;

    const worldX = this.screenToWorldX(this.mouseX);
    const worldY = this.screenToWorldY(this.mouseY);

    if (e.button === 2) {
      // Right click - delete
      this.deleteObjectAt(worldX, worldY);
      return;
    }

    if (this.currentTool === "wall") {
      this.isDrawing = true;
      this.dragStart = { x: worldX, y: worldY };
    } else if (this.currentTool === "delete") {
      this.deleteObjectAt(worldX, worldY);
    } else {
      this.placeObject(worldX, worldY);
    }
  }

  onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  }

  onMouseUp(e) {
    if (this.currentTool === "wall" && this.isDrawing && this.dragStart) {
      const worldX = this.screenToWorldX(this.mouseX);
      const worldY = this.screenToWorldY(this.mouseY);

      const x = Math.min(this.dragStart.x, worldX);
      const y = Math.min(this.dragStart.y, worldY);
      const width = Math.abs(worldX - this.dragStart.x);
      const height = Math.abs(worldY - this.dragStart.y);

      if (width > 5 && height > 5) {
        this.levelData.walls.push({
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
        });
      }
    }

    this.isDrawing = false;
    this.dragStart = null;
  }

  onWheel(e) {
    e.preventDefault();
    const zoomSpeed = 0.1;
    const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    this.zoom = Math.max(0.2, Math.min(2, this.zoom + delta));
  }

  placeObject(worldX, worldY) {
    const x = Math.round(worldX);
    const y = Math.round(worldY);

    switch (this.currentTool) {
      case "crate":
        this.levelData.crates.push({ x, y, size: 40 });
        break;
      case "spawn":
        this.levelData.spawnPoints.push({ x, y });
        break;
      case "pickup":
        this.levelData.pickups.push({ x, y, type: this.pickupType });
        break;
      case "waypoint":
        this.levelData.waypoints.push({ x, y, priority: 5, name: "Waypoint" });
        break;
    }
  }

  deleteObjectAt(worldX, worldY) {
    const threshold = 30 / this.zoom;

    // Check walls
    for (let i = this.levelData.walls.length - 1; i >= 0; i--) {
      const wall = this.levelData.walls[i];
      if (
        worldX >= wall.x &&
        worldX <= wall.x + wall.width &&
        worldY >= wall.y &&
        worldY <= wall.y + wall.height
      ) {
        this.levelData.walls.splice(i, 1);
        return;
      }
    }

    // Check crates
    for (let i = this.levelData.crates.length - 1; i >= 0; i--) {
      const crate = this.levelData.crates[i];
      const dx = worldX - crate.x;
      const dy = worldY - crate.y;
      if (Math.sqrt(dx * dx + dy * dy) < crate.size / 2 + threshold) {
        this.levelData.crates.splice(i, 1);
        return;
      }
    }

    // Check spawn points
    for (let i = this.levelData.spawnPoints.length - 1; i >= 0; i--) {
      const spawn = this.levelData.spawnPoints[i];
      const dx = worldX - spawn.x;
      const dy = worldY - spawn.y;
      if (Math.sqrt(dx * dx + dy * dy) < threshold) {
        this.levelData.spawnPoints.splice(i, 1);
        return;
      }
    }

    // Check pickups
    for (let i = this.levelData.pickups.length - 1; i >= 0; i--) {
      const pickup = this.levelData.pickups[i];
      const dx = worldX - pickup.x;
      const dy = worldY - pickup.y;
      if (Math.sqrt(dx * dx + dy * dy) < threshold) {
        this.levelData.pickups.splice(i, 1);
        return;
      }
    }

    // Check waypoints
    for (let i = this.levelData.waypoints.length - 1; i >= 0; i--) {
      const waypoint = this.levelData.waypoints[i];
      const dx = worldX - waypoint.x;
      const dy = worldY - waypoint.y;
      if (Math.sqrt(dx * dx + dy * dy) < threshold) {
        this.levelData.waypoints.splice(i, 1);
        return;
      }
    }
  }

  updateCamera() {
    const speed = 10 / this.zoom;

    if (this.keys["w"] || this.keys["arrowup"]) this.camera.y -= speed;
    if (this.keys["s"] || this.keys["arrowdown"]) this.camera.y += speed;
    if (this.keys["a"] || this.keys["arrowleft"]) this.camera.x -= speed;
    if (this.keys["d"] || this.keys["arrowright"]) this.camera.x += speed;

    // Clamp camera to level bounds
    const margin = 500;
    this.camera.x = Math.max(
      -margin,
      Math.min(this.levelData.width + margin, this.camera.x)
    );
    this.camera.y = Math.max(
      -margin,
      Math.min(this.levelData.height + margin, this.camera.y)
    );
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    this.drawGrid();

    // Draw level bounds
    this.drawLevelBounds();

    // Draw walls
    this.ctx.fillStyle = "#66ccff";
    this.ctx.strokeStyle = "#99ddff";
    this.ctx.lineWidth = 2;
    this.levelData.walls.forEach((wall) => {
      const x = this.worldToScreenX(wall.x);
      const y = this.worldToScreenY(wall.y);
      const w = wall.width * this.zoom;
      const h = wall.height * this.zoom;
      this.ctx.fillRect(x, y, w, h);
      this.ctx.strokeRect(x, y, w, h);
    });

    // Draw crates
    this.ctx.fillStyle = "#ffaa00";
    this.ctx.strokeStyle = "#ffcc66";
    this.levelData.crates.forEach((crate) => {
      const x = this.worldToScreenX(crate.x);
      const y = this.worldToScreenY(crate.y);
      const size = crate.size * this.zoom;
      this.ctx.fillRect(x - size / 2, y - size / 2, size, size);
      this.ctx.strokeRect(x - size / 2, y - size / 2, size, size);
    });

    // Draw spawn points
    this.ctx.fillStyle = "#00ff00";
    this.ctx.strokeStyle = "#66ff66";
    this.levelData.spawnPoints.forEach((spawn) => {
      const x = this.worldToScreenX(spawn.x);
      const y = this.worldToScreenY(spawn.y);
      const radius = 20 * this.zoom;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // Draw cross
      this.ctx.strokeStyle = "#000";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x - radius / 2, y);
      this.ctx.lineTo(x + radius / 2, y);
      this.ctx.moveTo(x, y - radius / 2);
      this.ctx.lineTo(x, y + radius / 2);
      this.ctx.stroke();
    });

    // Draw pickups
    this.levelData.pickups.forEach((pickup) => {
      const x = this.worldToScreenX(pickup.x);
      const y = this.worldToScreenY(pickup.y);
      const radius = 15 * this.zoom;

      const colors = {
        health_small: "#ff6699",
        health_big: "#ff3366",
        armor_light: "#99ddff",
        armor_heavy: "#66ccff",
      };

      this.ctx.fillStyle = colors[pickup.type] || "#ffffff";
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw symbol
      this.ctx.fillStyle = "#000";
      this.ctx.font = `bold ${12 * this.zoom}px monospace`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      const symbols = {
        health_small: "+",
        health_big: "++",
        armor_light: "A",
        armor_heavy: "A+",
      };
      this.ctx.fillText(symbols[pickup.type] || "?", x, y);
    });

    // Draw waypoints
    this.ctx.fillStyle = "#ff00ff";
    this.ctx.strokeStyle = "#ff66ff";
    this.levelData.waypoints.forEach((waypoint) => {
      const x = this.worldToScreenX(waypoint.x);
      const y = this.worldToScreenY(waypoint.y);
      const radius = 15 * this.zoom;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      // Draw flag
      this.ctx.fillStyle = "#fff";
      this.ctx.fillRect(x, y - radius, 2, radius * 2);
      this.ctx.beginPath();
      this.ctx.moveTo(x + 2, y - radius);
      this.ctx.lineTo(x + radius, y - radius / 2);
      this.ctx.lineTo(x + 2, y);
      this.ctx.fill();
    });

    // Draw preview for current tool
    if (this.currentTool === "wall" && this.isDrawing && this.dragStart) {
      const worldX = this.screenToWorldX(this.mouseX);
      const worldY = this.screenToWorldY(this.mouseY);
      const x = this.worldToScreenX(Math.min(this.dragStart.x, worldX));
      const y = this.worldToScreenY(Math.min(this.dragStart.y, worldY));
      const w = Math.abs(worldX - this.dragStart.x) * this.zoom;
      const h = Math.abs(worldY - this.dragStart.y) * this.zoom;

      this.ctx.strokeStyle = "#ff3366";
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeRect(x, y, w, h);
      this.ctx.setLineDash([]);
    }

    // Draw cursor position
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "12px monospace";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";
    const worldX = Math.round(this.screenToWorldX(this.mouseX));
    const worldY = Math.round(this.screenToWorldY(this.mouseY));
    this.ctx.fillText(
      `Pos: ${worldX}, ${worldY} | Zoom: ${this.zoom.toFixed(1)}x`,
      10,
      10
    );

    // Draw object counts
    this.ctx.fillText(
      `Walls: ${this.levelData.walls.length} | Crates: ${this.levelData.crates.length} | Spawns: ${this.levelData.spawnPoints.length} | Pickups: ${this.levelData.pickups.length}`,
      10,
      30
    );
  }

  drawGrid() {
    const gridSize = 100;
    const startX =
      Math.floor((this.camera.x - this.canvas.width / 2 / this.zoom) / gridSize) *
      gridSize;
    const startY =
      Math.floor(
        (this.camera.y - this.canvas.height / 2 / this.zoom) / gridSize
      ) * gridSize;
    const endX = this.camera.x + this.canvas.width / 2 / this.zoom;
    const endY = this.camera.y + this.canvas.height / 2 / this.zoom;

    this.ctx.strokeStyle = "rgba(102, 204, 255, 0.1)";
    this.ctx.lineWidth = 1;

    for (let x = startX; x <= endX; x += gridSize) {
      const screenX = this.worldToScreenX(x);
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = startY; y <= endY; y += gridSize) {
      const screenY = this.worldToScreenY(y);
      this.ctx.beginPath();
      this.ctx.moveTo(0, screenY);
      this.ctx.lineTo(this.canvas.width, screenY);
      this.ctx.stroke();
    }
  }

  drawLevelBounds() {
    const x = this.worldToScreenX(0);
    const y = this.worldToScreenY(0);
    const w = this.levelData.width * this.zoom;
    const h = this.levelData.height * this.zoom;

    this.ctx.strokeStyle = "#ff3366";
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([10, 10]);
    this.ctx.strokeRect(x, y, w, h);
    this.ctx.setLineDash([]);

    // Draw corner labels
    this.ctx.fillStyle = "#ff3366";
    this.ctx.font = "14px monospace";
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "top";
    this.ctx.fillText(`0, 0`, x + 5, y + 5);
    this.ctx.textAlign = "right";
    this.ctx.fillText(
      `${this.levelData.width}, ${this.levelData.height}`,
      x + w - 5,
      y + h - 20
    );
  }

  renderLoop() {
    if (!this.isActive) return;

    this.updateCamera();
    this.render();

    requestAnimationFrame(() => this.renderLoop());
  }

  async saveLevel() {
    if (!this.levelData.name) {
      alert("Please enter a level name");
      return;
    }

    try {
      const response = await fetch("/api/levels/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.levelData),
      });

      if (response.ok) {
        alert("Level saved successfully!");
        this.loadLevelsList();
      } else {
        const error = await response.text();
        alert(`Failed to save level: ${error}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save level");
    }
  }

  async loadLevelsList() {
    try {
      const response = await fetch("/api/levels/list");
      const levels = await response.json();

      const listElement = document.getElementById("savedLevelsList");
      if (levels.length === 0) {
        listElement.innerHTML = '<p style="color: #666">No saved levels</p>';
        return;
      }

      listElement.innerHTML = levels
        .map(
          (name) =>
            `<div class="saved-level-item" onclick="window.levelEditor.loadLevel('${name}')">${name}</div>`
        )
        .join("");
    } catch (error) {
      console.error("Load levels list error:", error);
    }
  }

  async loadLevel(name) {
    try {
      const response = await fetch(`/api/levels/load/${encodeURIComponent(name)}`);
      if (response.ok) {
        const levelData = await response.json();
        this.levelData = levelData;

        // Update UI
        document.getElementById("levelNameInput").value = levelData.name;
        document.getElementById("mapWidthInput").value = levelData.width;
        document.getElementById("mapHeightInput").value = levelData.height;

        // Center camera
        this.camera.x = levelData.width / 2;
        this.camera.y = levelData.height / 2;

        alert("Level loaded successfully!");
      } else {
        alert("Failed to load level");
      }
    } catch (error) {
      console.error("Load error:", error);
      alert("Failed to load level");
    }
  }

  showLoadDialog() {
    // The list is already shown in the sidebar, just scroll to it
    const listElement = document.getElementById("savedLevelsList");
    listElement.scrollIntoView({ behavior: "smooth" });
  }

  newLevel() {
    if (
      confirm(
        "Create a new level? This will clear the current level (make sure to save first!)"
      )
    ) {
      this.levelData = {
        name: "Untitled Level",
        width: 2000,
        height: 2000,
        walls: [],
        crates: [],
        spawnPoints: [],
        pickups: [],
        waypoints: [],
      };

      document.getElementById("levelNameInput").value = "Untitled Level";
      document.getElementById("mapWidthInput").value = 2000;
      document.getElementById("mapHeightInput").value = 2000;

      this.camera.x = 1000;
      this.camera.y = 1000;
      this.zoom = 1;
    }
  }
}
