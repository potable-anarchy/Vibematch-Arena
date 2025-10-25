// Game client
import { AssetLoader, PlayerAnimator } from "./assets.js";
import { ModSystem } from "./modSystem.js";
import { ModEditor } from "./modEditor.js";

const socket = io();
const assets = new AssetLoader();

// Player colors for differentiation
const PLAYER_COLORS = [
  { name: 'blue', r: 100, g: 149, b: 237 },     // Cornflower blue
  { name: 'red', r: 220, g: 20, b: 60 },        // Crimson
  { name: 'green', r: 50, g: 205, b: 50 },      // Lime green
  { name: 'yellow', r: 255, g: 215, b: 0 },     // Gold
  { name: 'purple', r: 147, g: 112, b: 219 },   // Medium purple
  { name: 'orange', r: 255, g: 140, b: 0 },     // Dark orange
  { name: 'cyan', r: 0, g: 206, b: 209 },       // Dark turquoise
  { name: 'pink', r: 255, g: 105, b: 180 },     // Hot pink
  { name: 'lime', r: 154, g: 205, b: 50 },      // Yellow green
  { name: 'magenta', r: 199, g: 21, b: 133 },   // Medium violet red
  { name: 'teal', r: 0, g: 128, b: 128 },       // Teal
  { name: 'brown', r: 139, g: 69, b: 19 },      // Saddle brown
];

// Map player IDs to colors
const playerColorMap = new Map();
let nextColorIndex = 0;

// Get or assign color for a player
function getPlayerColor(playerId) {
  if (!playerColorMap.has(playerId)) {
    playerColorMap.set(playerId, PLAYER_COLORS[nextColorIndex % PLAYER_COLORS.length]);
    nextColorIndex++;
  }
  return playerColorMap.get(playerId);
}

// Player animators - one per player
const playerAnimators = new Map();

// Generate random player name
function generatePlayerName() {
  const adjectives = [
    "Swift",
    "Silent",
    "Deadly",
    "Rogue",
    "Ghost",
    "Shadow",
    "Viper",
    "Chaos",
    "Blitz",
    "Nova",
    "Phantom",
    "Reaper",
    "Storm",
    "Iron",
    "Cyber",
  ];
  const nouns = [
    "Hunter",
    "Warrior",
    "Sniper",
    "Soldier",
    "Agent",
    "Operative",
    "Merc",
    "Striker",
    "Assassin",
    "Ranger",
    "Raven",
    "Wolf",
    "Fox",
    "Bear",
    "Tiger",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}${noun}${num}`;
}

// Load player name from localStorage or generate new one
let playerName = localStorage.getItem("playerName") || generatePlayerName();
// Save to localStorage if it was generated
if (!localStorage.getItem("playerName")) {
  localStorage.setItem("playerName", playerName);
}
let isSpectator = true; // Start as spectator

// Smooth camera for spectator mode
const CAMERA_LERP_SPEED = 2.5; // How fast camera moves toward target
const CAMERA_DEADZONE = 150; // Pixels of deadzone before camera starts moving

// Mod system
const modSystem = new ModSystem({
  getState: () => gameState,
  getPlayerId: () => playerId,
  getCamera: () => camera,
  getAssets: () => assets,
  getCanvas: () => canvas,
  getContext: () => ctx,
  isSpectator: () => isSpectator,
  getPlayerName: () => playerName,
  setPlayerName: (name) => {
    playerName = name;
    localStorage.setItem("playerName", name);
  },
});

const modEditor = new ModEditor(modSystem);

// Auto-load enabled mods from manifest
async function autoLoadMods() {
  if (!modSystem.modsEnabled) return;

  try {
    const response = await fetch("/mods/mods.json");
    if (!response.ok) return;

    const data = await response.json();
    const enabledMods = data.mods.filter((mod) => mod.enabled);

    for (const mod of enabledMods) {
      const result = await modSystem.loadModFromFile(mod.file);
      if (result.success) {
        console.log(`🎮 Auto-loaded: ${mod.name}`);
      }
    }

    // Enable hot-reload for live-coding
    modSystem.enableHotReload(2000); // Check every 2 seconds
  } catch (error) {
    console.log("Could not auto-load mods:", error);
  }
}

// DOM elements (must be defined before initGame)
const menu = document.getElementById("menu");
const game = document.getElementById("game");
const joinButton = document.getElementById("joinButton");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Auto-connect as spectator and load game
(async function initGame() {
  console.log("🎮 Initializing game as spectator...");

  // Hide menu, show game canvas immediately
  menu.style.display = "none";
  game.style.display = "block";

  // Load assets in background
  assets.loadAll().then(() => {
    console.log("✅ Assets loaded, ready to join game");
  });

  // Load mods
  setTimeout(autoLoadMods, 500);

  console.log(`👻 Spectating as "${playerName}"`);
})();

// HUD elements
const healthBar = document.getElementById("healthBar");
const healthText = document.getElementById("healthText");
const armorBar = document.getElementById("armorBar");
const armorText = document.getElementById("armorText");
const weaponName = document.getElementById("weaponName");
const ammoCount = document.getElementById("ammoCount");
const reloadIndicator = document.getElementById("reloadIndicator");
const scoreboardContent = document.getElementById("scoreboardContent");
const killfeed = document.getElementById("killfeed");
const respawnMessage = document.getElementById("respawnMessage");
const respawnTimer = document.getElementById("respawnTimer");

// Game state
let playerId = null;
let gameConfig = null;
let weapons = null;
let gameState = {
  players: [],
  pickups: [],
};

// Interpolation for smooth movement
let lastServerState = { players: [], pickups: [] };
let serverStateTime = Date.now();
const INTERPOLATION_TIME = 100; // ms - how long to interpolate

let camera = { x: 0, y: 0 };
let input = {
  up: false,
  down: false,
  left: false,
  right: false,
  shoot: false,
  reload: false,
  aimAngle: 0,
};

let mouseX = 0;
let mouseY = 0;

// Visual effects
let effects = [];
let particles = [];

// Setup canvas
let resizeTimeout;
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Disable image smoothing for pixel-perfect rendering
  ctx.imageSmoothingEnabled = false;
}

// Debounce resize to avoid race conditions with render loop
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(resizeCanvas, 100);
});
resizeCanvas();

// Join game (transition from spectator to player)
joinButton.addEventListener("click", async () => {
  try {
    joinButton.disabled = true;
    joinButton.textContent = "JOINING...";
    console.log("🎮 Joining game as player...");

    // Ensure assets are loaded
    if (!assets.loaded) {
      joinButton.textContent = "LOADING ASSETS...";
      await assets.loadAll();
    }

    // Wait for socket to be connected
    if (!socket.connected) {
      console.log("⏳ Waiting for socket connection...");
      await new Promise((resolve) => {
        if (socket.connected) {
          resolve();
        } else {
          socket.once("connect", resolve);
        }
      });
    }

    // Emit join event with generated name
    console.log(`📡 Emitting join event as "${playerName}"...`);
    socket.emit("join", playerName);
    console.log(`✅ Join event sent`);

    // Will transition to player mode when server sends "init" response
    joinButton.textContent = "JOINING...";
  } catch (error) {
    console.error("❌ Error joining game:", error);
    joinButton.disabled = false;
    joinButton.textContent = "JOIN GAME";
  }
});

// Input handling
document.addEventListener("keydown", (e) => {
  if (menu.style.display !== "none") return;

  switch (e.key.toLowerCase()) {
    case "w":
      input.up = true;
      break;
    case "s":
      input.down = true;
      break;
    case "a":
      input.left = true;
      break;
    case "d":
      input.right = true;
      break;
    case "r":
      input.reload = true;
      break;
  }
});

document.addEventListener("keyup", (e) => {
  switch (e.key.toLowerCase()) {
    case "w":
      input.up = false;
      break;
    case "s":
      input.down = false;
      break;
    case "a":
      input.left = false;
      break;
    case "d":
      input.right = false;
      break;
    case "r":
      input.reload = false;
      break;
  }
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0) {
    input.shoot = true;
  }
});

canvas.addEventListener("mouseup", (e) => {
  if (e.button === 0) {
    input.shoot = false;
  }
});

canvas.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  // Update crosshair position
  const crosshair = document.getElementById("crosshair");
  if (crosshair) {
    crosshair.style.left = `${e.clientX}px`;
    crosshair.style.top = `${e.clientY}px`;
  }
});

// Prevent context menu
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// Game Menu System
const gameMenu = document.getElementById("gameMenu");
const controlsScreen = document.getElementById("controlsScreen");
const playerNameInput = document.getElementById("playerNameInput");
const saveNameButton = document.getElementById("saveNameButton");
const spectateButton = document.getElementById("spectateButton");
const controlsButton = document.getElementById("controlsButton");
const closeControlsButton = document.getElementById("closeControlsButton");

let isMenuOpen = false;

function toggleGameMenu() {
  isMenuOpen = !isMenuOpen;
  gameMenu.style.display = isMenuOpen ? "flex" : "none";
  controlsScreen.style.display = "none";

  // Populate name input with current name when opening
  if (isMenuOpen) {
    playerNameInput.value = playerName;
    playerNameInput.focus();
    playerNameInput.select();
  }
}

function showControlsScreen() {
  gameMenu.style.display = "none";
  controlsScreen.style.display = "flex";
}

function closeControlsScreen() {
  controlsScreen.style.display = "none";
  gameMenu.style.display = "flex";
}

// ESC key handler
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // If controls screen is open, go back to menu
    if (controlsScreen.style.display === "flex") {
      closeControlsScreen();
    }
    // Otherwise toggle the main menu
    else {
      toggleGameMenu();
    }
  }
});

// Save name button
saveNameButton.addEventListener("click", () => {
  const newName = playerNameInput.value.trim();
  if (newName && newName.length > 0) {
    modSystem.setPlayerName(newName);
    console.log(`✅ Name changed to: ${newName}`);

    // Show feedback
    saveNameButton.textContent = "SAVED!";
    saveNameButton.style.background = "#66ccff";
    setTimeout(() => {
      saveNameButton.textContent = "SAVE NAME";
      saveNameButton.style.background = "";
    }, 1000);
  }
});

// Enter key in name input
playerNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    saveNameButton.click();
  }
});

// Spectate button
spectateButton.addEventListener("click", () => {
  if (!isSpectator) {
    // Disconnect player and reconnect as spectator
    socket.disconnect();
    playerId = null;
    isSpectator = true;

    // Reconnect as spectator
    setTimeout(() => {
      socket.connect();
      console.log("👻 Switched to spectator mode");
    }, 100);

    // Show spectator overlay again
    const spectatorOverlay = document.getElementById("spectatorOverlay");
    if (spectatorOverlay) {
      spectatorOverlay.style.display = "block";
    }

    // Reset join button
    joinButton.disabled = false;
    joinButton.textContent = "JOIN GAME";
  }

  // Close menu
  toggleGameMenu();
});

// Controls button
controlsButton.addEventListener("click", () => {
  showControlsScreen();
});

// Close controls button
closeControlsButton.addEventListener("click", () => {
  closeControlsScreen();
});

// Socket connection events
socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("disconnect", () => {
  console.log("❌ Socket disconnected");
});

socket.on("connect_error", (error) => {
  console.error("❌ Socket connection error:", error);
});

// Socket events
socket.on("playerCount", (count) => {
  console.log(`Players online: ${count}/12`);
});

socket.on("serverFull", () => {
  alert("Server is full! Maximum 12 players. Please try again later.");
  menu.style.display = "block";
  game.style.display = "none";
});

socket.on("init", (data) => {
  playerId = data.playerId;
  gameConfig = data.gameConfig;
  weapons = data.weapons;
  isSpectator = false; // No longer spectating, now a player

  console.log(`✅ Joined game as player: ${playerId} (${playerName})`);

  // Hide spectator overlay
  const spectatorOverlay = document.getElementById("spectatorOverlay");
  if (spectatorOverlay) {
    spectatorOverlay.style.display = "none";
  }

  // Focus canvas for input
  canvas.focus();
});

socket.on("state", (state) => {
  // Store previous state for interpolation
  lastServerState = JSON.parse(JSON.stringify(gameState));
  serverStateTime = Date.now();

  gameState = state;
  updateHUD();
  updateScoreboard();
});

// Get interpolated game state for smooth rendering
function getInterpolatedState() {
  // Safety check: return raw state if no interpolation data
  if (!gameState.players || !lastServerState.players) {
    return gameState;
  }

  const now = Date.now();
  const timeSinceUpdate = now - serverStateTime;
  const t = Math.min(1, timeSinceUpdate / INTERPOLATION_TIME); // 0 to 1

  // Interpolate player positions
  const interpolatedPlayers = gameState.players.map(player => {
    const lastPlayer = lastServerState.players.find(p => p.id === player.id);
    if (!lastPlayer) return player;

    return {
      ...player,
      x: lastPlayer.x + (player.x - lastPlayer.x) * t,
      y: lastPlayer.y + (player.y - lastPlayer.y) * t,
      aimAngle: lastPlayer.aimAngle + (player.aimAngle - lastPlayer.aimAngle) * t,
    };
  });

  return {
    players: interpolatedPlayers,
    pickups: gameState.pickups,
  };
}

socket.on("shoot", (data) => {
  createMuzzleFlash(data.x, data.y, data.angle);
  createBulletTracer(data.x, data.y, data.angle, weapons[data.weapon].range);
  modSystem.callHook("onShoot", data);
});

socket.on("hit", (data) => {
  const target = gameState.players.find((p) => p.id === data.targetId);
  if (target) {
    createHitEffect(target.x, target.y);
    if (data.killed) {
      showKillMessage(data.shooterId, data.targetId);
      modSystem.callHook("onKill", data.shooterId, data.targetId);
    }
    modSystem.callHook("onHit", data.shooterId, data.targetId, data.damage);
  }
});

socket.on("pickupCollected", (data) => {
  const pickup = gameState.pickups.find((p) => p.id === data.pickupId);
  if (pickup) {
    createPickupEffect(pickup.x, pickup.y);
    modSystem.callHook("onPickup", data.playerId, pickup);
  }
});

socket.on("respawn", (data) => {
  if (data.playerId === playerId) {
    respawnMessage.style.display = "none";
  }
});

// Send input to server
setInterval(() => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) return;

  // Calculate aim angle
  const screenCenterX = canvas.width / 2;
  const screenCenterY = canvas.height / 2;
  input.aimAngle = Math.atan2(mouseY - screenCenterY, mouseX - screenCenterX);

  socket.emit("input", input);
}, 1000 / 60);

// Update HUD
function updateHUD() {
  let displayPlayer = gameState.players.find((p) => p.id === playerId);

  // If spectating, show the top scorer's stats instead
  if (!displayPlayer && isSpectator) {
    let topScorer = null;
    let topKills = -1;

    for (const p of gameState.players) {
      if (p.health > 0 && p.kills > topKills) {
        topKills = p.kills;
        topScorer = p;
      }
    }

    displayPlayer = topScorer;
  }

  if (!displayPlayer) return;

  // Health
  healthBar.style.width = `${displayPlayer.health}%`;
  healthText.textContent = Math.ceil(displayPlayer.health);

  // Armor
  armorBar.style.width = `${displayPlayer.armor}%`;
  armorText.textContent = Math.ceil(displayPlayer.armor);

  // Weapon
  weaponName.textContent = displayPlayer.weapon.toUpperCase();
  ammoCount.textContent = `${displayPlayer.ammo} / ${weapons[displayPlayer.weapon].mag}`;
  reloadIndicator.style.display = displayPlayer.reloading ? "block" : "none";

  // Respawn (only show for own player)
  if (displayPlayer.id === playerId && displayPlayer.health <= 0) {
    respawnMessage.style.display = "block";
    respawnTimer.textContent = "Respawning...";
  }
}

// Update scoreboard
function updateScoreboard() {
  const sortedPlayers = [...gameState.players].sort(
    (a, b) => b.kills - a.kills,
  );

  scoreboardContent.innerHTML = sortedPlayers
    .map(
      (p) => `
    <div class="score-entry ${p.id === playerId ? "self" : ""}">
      <span class="score-name">${p.name}</span>
      <span class="score-kd">${p.kills} / ${p.deaths}</span>
    </div>
  `,
    )
    .join("");
}

// Show kill message
function showKillMessage(killerId, victimId) {
  const killer = gameState.players.find((p) => p.id === killerId);
  const victim = gameState.players.find((p) => p.id === victimId);

  if (!killer || !victim) return;

  const message = document.createElement("div");
  message.className = "kill-message";
  message.textContent = `${killer.name} killed ${victim.name}`;

  if (killerId === playerId) {
    message.style.borderColor = "#66ccff";
  } else if (victimId === playerId) {
    message.style.borderColor = "#ff3366";
  }

  killfeed.appendChild(message);

  setTimeout(() => {
    message.remove();
  }, 3000);
}

// Visual effects
function createMuzzleFlash(x, y, angle) {
  effects.push({
    type: "muzzleFlash",
    x,
    y,
    angle,
    life: 0.1,
    maxLife: 0.1,
  });
}

function createBulletTracer(x, y, angle, range) {
  effects.push({
    type: "tracer",
    x,
    y,
    angle,
    range,
    life: 0.2,
    maxLife: 0.2,
  });
}

function createHitEffect(x, y) {
  // Add blood splat sprite effect
  const bloodSprite = assets.get("blood_splat");
  if (bloodSprite && bloodSprite.complete) {
    effects.push({
      type: "bloodSplat",
      x,
      y,
      angle: Math.random() * Math.PI * 2,
      scale: 0.3 + Math.random() * 0.3,
      life: 2.0,
      maxLife: 2.0,
    });
  }

  // Blood particles
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3;
    const speed = 150 + Math.random() * 150;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8,
      maxLife: 0.8,
      color: "#cc0000",
      size: 2 + Math.random() * 3,
    });
  }
}

function createPickupEffect(x, y) {
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const speed = 80;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6,
      maxLife: 0.6,
      color: "#66ccff",
      size: 2,
    });
  }
}

// Render loop
function render(dt) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Use interpolated state for smooth rendering
  const renderState = getInterpolatedState();
  const player = renderState.players.find((p) => p.id === playerId);

  // Spectator mode - follow top scoring alive player/bot
  if (!player && isSpectator) {
    // Find top scoring alive player or bot
    let topScorer = null;
    let topKills = -1;

    // Check all players (use renderState for interpolated positions)
    for (const p of renderState.players) {
      if (p.health > 0 && p.kills > topKills) {
        topKills = p.kills;
        topScorer = p;
      }
    }

    // Determine target camera position
    let targetX, targetY;
    if (topScorer) {
      targetX = topScorer.x;
      targetY = topScorer.y;
    } else {
      targetX = gameConfig?.WORLD_WIDTH / 2 || 1000;
      targetY = gameConfig?.WORLD_HEIGHT / 2 || 1000;
    }

    // Calculate distance from camera to target
    const dx = targetX - camera.x;
    const dy = targetY - camera.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only move camera if outside deadzone
    if (distance > CAMERA_DEADZONE) {
      // Smooth lerp toward target
      const lerpFactor = Math.min(1, CAMERA_LERP_SPEED * dt);
      camera.x = Math.floor(camera.x + dx * lerpFactor);
      camera.y = Math.floor(camera.y + dy * lerpFactor);
    }
  } else if (player) {
    // Update camera to follow player (rounded to prevent sub-pixel shifting)
    camera.x = Math.floor(player.x);
    camera.y = Math.floor(player.y);
  }

  // Draw background grid
  drawGrid();

  // Draw pickups
  renderState.pickups.forEach((pickup) => {
    if (pickup.active) {
      drawPickup(pickup);
    }
  });

  // Update and draw players (using interpolated positions)
  renderState.players.forEach((p) => {
    if (p.health > 0) {
      // Update animator
      const animator = playerAnimators.get(p.id);
      if (animator) {
        animator.update(dt);
      }

      drawPlayer(p);
      modSystem.callHook("onPlayerDraw", ctx, p, camera);
    }
  });

  // Draw effects
  drawEffects(dt);

  // Draw particles
  drawParticles(dt);

  // Call mod render hooks
  modSystem.callHook("onRender", ctx, camera, dt);

  // Spectator mode indicator (small label at top)
  if (!player && isSpectator) {
    // Semi-transparent background for label
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(canvas.width / 2 - 200, 10, 400, 50);

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SPECTATOR MODE", canvas.width / 2, 40);
  }
}

function drawGrid() {
  const gridSize = 100;
  const startX =
    Math.floor((camera.x - canvas.width / 2) / gridSize) * gridSize;
  const startY =
    Math.floor((camera.y - canvas.height / 2) / gridSize) * gridSize;
  const endX = camera.x + canvas.width / 2;
  const endY = camera.y + canvas.height / 2;

  ctx.strokeStyle = "rgba(102, 204, 255, 0.1)";
  ctx.lineWidth = 1;

  for (let x = startX; x <= endX; x += gridSize) {
    const screenX = worldToScreenX(x);
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, canvas.height);
    ctx.stroke();
  }

  for (let y = startY; y <= endY; y += gridSize) {
    const screenY = worldToScreenY(y);
    ctx.beginPath();
    ctx.moveTo(0, screenY);
    ctx.lineTo(canvas.width, screenY);
    ctx.stroke();
  }
}

function drawPickup(pickup) {
  const screenX = worldToScreenX(pickup.x);
  const screenY = worldToScreenY(pickup.y);

  const colors = {
    health_small: "#ff6699",
    health_big: "#ff3366",
    armor_light: "#99ddff",
    armor_heavy: "#66ccff",
    ammo: "#ffaa00",
  };

  const color = colors[pickup.type] || "#ffffff";

  // Pulsing effect
  const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8;
  const size = 15 * pulse;

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Symbol
  ctx.fillStyle = "#000";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const symbols = {
    health_small: "+",
    health_big: "++",
    armor_light: "A",
    armor_heavy: "A+",
    ammo: "O",
  };
  ctx.fillText(symbols[pickup.type] || "?", screenX, screenY);
}

function drawPlayer(p) {
  const screenX = worldToScreenX(p.x);
  const screenY = worldToScreenY(p.y);

  const isLocalPlayer = p.id === playerId;

  // Get or create animator for this player
  if (!playerAnimators.has(p.id)) {
    playerAnimators.set(p.id, new PlayerAnimator());
  }
  const animator = playerAnimators.get(p.id);

  // Get player's color
  const playerColor = getPlayerColor(p.id);

  // Determine animation based on state
  let weaponType = 'handgun'; // default
  if (p.weapon === 'rifle' || p.weapon === 'smg') {
    weaponType = 'rifle';
  }

  // Determine animation state
  let animationKey;
  if (p.reloading) {
    animationKey = `${weaponType}_reload`;
    animator.setFrameDelay(40); // Slower for reload
  } else {
    // Check if player is moving
    const isMoving = p.vx !== 0 || p.vy !== 0;
    if (isMoving) {
      animationKey = `${weaponType}_move`;
      animator.setFrameDelay(50);
    } else {
      animationKey = `${weaponType}_idle`;
      animator.setFrameDelay(60);
    }
  }

  const animation = assets.getAnimation(animationKey);
  const sprite = animator.getFrame(animation);

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(p.aimAngle);

  if (sprite && sprite.complete) {
    // Draw shadow first
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#000";
    ctx.fillRect(
      -sprite.width / 2 + 2,
      -sprite.height / 2 + 2,
      sprite.width,
      sprite.height,
    );
    ctx.globalAlpha = 1;

    // Draw invulnerability effect
    if (p.invulnerable) {
      ctx.strokeStyle = "#ffff00";
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        -sprite.width / 2 - 5,
        -sprite.height / 2 - 5,
        sprite.width + 10,
        sprite.height + 10,
      );
      ctx.setLineDash([]);
    }

    // Create colored version of sprite using canvas tinting
    const tintCanvas = document.createElement('canvas');
    tintCanvas.width = sprite.width;
    tintCanvas.height = sprite.height;
    const tintCtx = tintCanvas.getContext('2d');

    // Draw original sprite
    tintCtx.drawImage(sprite, 0, 0);

    // Apply color tint
    tintCtx.globalCompositeOperation = 'multiply';
    tintCtx.fillStyle = `rgb(${playerColor.r}, ${playerColor.g}, ${playerColor.b})`;
    tintCtx.fillRect(0, 0, sprite.width, sprite.height);

    // Restore original alpha
    tintCtx.globalCompositeOperation = 'destination-in';
    tintCtx.drawImage(sprite, 0, 0);

    // Draw tinted player sprite
    ctx.drawImage(tintCanvas, -sprite.width / 2, -sprite.height / 2);
  } else {
    // Fallback to circle if sprite not loaded
    const radius = gameConfig?.PLAYER_RADIUS || 20;
    ctx.fillStyle = `rgb(${playerColor.r}, ${playerColor.g}, ${playerColor.b})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Weapon direction line
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(25, 0);
    ctx.stroke();
  }

  ctx.restore();

  // Name with player color
  const playerRadius = gameConfig?.PLAYER_RADIUS || 30;
  ctx.fillStyle = isLocalPlayer ? "#ffff00" : "#fff";
  ctx.font = isLocalPlayer ? "bold 14px monospace" : "12px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(p.name, screenX, screenY - playerRadius - 5);

  // Health bar
  const barWidth = 40;
  const barHeight = 4;
  const barX = screenX - barWidth / 2;
  const barY = screenY + playerRadius + 8;

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  ctx.fillStyle = "#ff3366";
  ctx.fillRect(barX, barY, barWidth * (p.health / 100), barHeight);

  if (p.armor > 0) {
    ctx.fillStyle = "#66ccff";
    ctx.fillRect(barX, barY - 6, barWidth * (p.armor / 100), barHeight);
  }
}

function drawEffects(dt) {
  effects = effects.filter((effect) => {
    effect.life -= dt;
    if (effect.life <= 0) return false;

    const alpha = effect.life / effect.maxLife;

    if (effect.type === "muzzleFlash") {
      const screenX = worldToScreenX(effect.x);
      const screenY = worldToScreenY(effect.y);

      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.rotate(effect.angle);

      ctx.fillStyle = `rgba(255, 255, 100, ${alpha})`;
      ctx.beginPath();
      ctx.arc(15, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    } else if (effect.type === "tracer") {
      const screenX = worldToScreenX(effect.x);
      const screenY = worldToScreenY(effect.y);
      const endX = screenX + Math.cos(effect.angle) * effect.range;
      const endY = screenY + Math.sin(effect.angle) * effect.range;

      ctx.strokeStyle = `rgba(255, 204, 0, ${alpha * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenX, screenY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    } else if (effect.type === "bloodSplat") {
      const screenX = worldToScreenX(effect.x);
      const screenY = worldToScreenY(effect.y);
      const bloodSprite = assets.get("blood_splat");

      if (bloodSprite && bloodSprite.complete) {
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(effect.angle);
        ctx.globalAlpha = alpha;

        const width = bloodSprite.width * effect.scale;
        const height = bloodSprite.height * effect.scale;
        ctx.drawImage(bloodSprite, -width / 2, -height / 2, width, height);

        ctx.globalAlpha = 1;
        ctx.restore();
      }
    }

    return true;
  });
}

function drawParticles(dt) {
  particles = particles.filter((particle) => {
    particle.life -= dt;
    if (particle.life <= 0) return false;

    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 200 * dt; // Gravity

    const alpha = particle.life / particle.maxLife;
    const screenX = worldToScreenX(particle.x);
    const screenY = worldToScreenY(particle.y);

    ctx.fillStyle = particle.color
      .replace(")", `, ${alpha})`)
      .replace("rgb", "rgba");
    ctx.beginPath();
    ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
    ctx.fill();

    return true;
  });
}

function worldToScreenX(worldX) {
  return Math.floor(worldX - camera.x + canvas.width / 2);
}

function worldToScreenY(worldY) {
  return Math.floor(worldY - camera.y + canvas.height / 2);
}

// Animation loop
let lastTime = Date.now();
function gameLoop() {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  render(dt);
  requestAnimationFrame(gameLoop);
}

gameLoop();
