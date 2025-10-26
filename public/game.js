// Game client
import { AssetLoader, PlayerAnimator } from "./assets.js";
import { ModSystem } from "./modSystem.js";
import { ModEditor } from "./modEditor.js";
import { LevelEditor } from "./levelEditor.js";

// Configure Socket.io with automatic reconnection
const socket = io({
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});
const assets = new AssetLoader();

// ====== CLIENT VERSION TRACKING ======
let clientVersion = null;

// Check for version updates every 30 seconds
setInterval(async () => {
  if (!clientVersion) return; // Wait until we receive initial version

  try {
    const response = await fetch("/api/version");
    const data = await response.json();

    if (data.version !== clientVersion) {
      console.log(
        `🔄 New version available: ${data.version} (current: ${clientVersion})`,
      );
      showUpdateNotification(data.version);
    }
  } catch (err) {
    console.error("Failed to check version:", err);
  }
}, 30000);

function showUpdateNotification(newVersion) {
  // Show non-intrusive update notification
  let updateBanner = document.getElementById("updateBanner");

  if (!updateBanner) {
    updateBanner = document.createElement("div");
    updateBanner.id = "updateBanner";
    updateBanner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px;
      text-align: center;
      z-index: 100000;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      animation: slideDown 0.3s ease-out;
    `;

    updateBanner.innerHTML = `
      <strong>🎮 New Update Available!</strong>
      <span style="margin: 0 10px;">The game has been updated with new features and fixes.</span>
      <button id="updateNowBtn" style="
        background: white;
        color: #667eea;
        border: none;
        padding: 8px 20px;
        border-radius: 5px;
        font-weight: bold;
        cursor: pointer;
        margin: 0 5px;
      ">Update Now</button>
      <button id="updateLaterBtn" style="
        background: rgba(255,255,255,0.2);
        color: white;
        border: 1px solid white;
        padding: 8px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin: 0 5px;
      ">Later</button>
    `;

    document.body.appendChild(updateBanner);

    document.getElementById("updateNowBtn").addEventListener("click", () => {
      console.log("🔄 Reloading page for update...");
      window.location.reload(true); // Hard reload to bypass cache
    });

    document.getElementById("updateLaterBtn").addEventListener("click", () => {
      updateBanner.remove();
      // Show again in 2 minutes if they dismiss
      setTimeout(() => showUpdateNotification(newVersion), 120000);
    });
  }
}

// Add CSS animation
const style = document.createElement("style");
style.textContent = `
  @keyframes slideDown {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// Player colors for differentiation
const PLAYER_COLORS = [
  { name: "blue", r: 100, g: 149, b: 237 }, // Cornflower blue
  { name: "red", r: 220, g: 20, b: 60 }, // Crimson
  { name: "green", r: 50, g: 205, b: 50 }, // Lime green
  { name: "yellow", r: 255, g: 215, b: 0 }, // Gold
  { name: "purple", r: 147, g: 112, b: 219 }, // Medium purple
  { name: "orange", r: 255, g: 140, b: 0 }, // Dark orange
  { name: "cyan", r: 0, g: 206, b: 209 }, // Dark turquoise
  { name: "pink", r: 255, g: 105, b: 180 }, // Hot pink
  { name: "lime", r: 154, g: 205, b: 50 }, // Yellow green
  { name: "magenta", r: 199, g: 21, b: 133 }, // Medium violet red
  { name: "teal", r: 0, g: 128, b: 128 }, // Teal
  { name: "brown", r: 139, g: 69, b: 19 }, // Saddle brown
];

// Map player IDs to colors
const playerColorMap = new Map();
let nextColorIndex = 0;

// Get or assign color for a player
function getPlayerColor(playerId) {
  if (!playerColorMap.has(playerId)) {
    playerColorMap.set(
      playerId,
      PLAYER_COLORS[nextColorIndex % PLAYER_COLORS.length],
    );
    nextColorIndex++;
  }
  return playerColorMap.get(playerId);
}

// Player animators - one per player
const playerAnimators = new Map();

// Track last shot time for each player to trigger shoot animation
const playerLastShot = new Map();

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
modEditor.setSocket(socket); // Connect socket for server mods
modEditor.setPlayerName(playerName); // Set initial player name

// Level Editor
const levelEditor = new LevelEditor();
window.levelEditor = levelEditor; // Expose for saved levels list onclick

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

    // Enable hot-reload for live-coding with enhanced error handling
    modSystem.enableHotReload(2000);
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

  // Resize canvas now that the game div is visible
  // This ensures canvas gets proper dimensions
  resizeCanvas();

  // Get loading screen elements
  const loadingScreen = document.getElementById("loadingScreen");
  const loadingProgress = document.getElementById("loadingProgress");
  const loadingText = document.getElementById("loadingText");

  // Update loading progress
  loadingProgress.style.width = "0%";

  // Load critical assets first
  assets.loadAll().then(() => {
    loadingProgress.style.width = "100%";
    loadingText.textContent = "Ready!";

    // Hide loading screen after brief delay
    setTimeout(() => {
      loadingScreen.style.opacity = "0";
      setTimeout(() => {
        loadingScreen.style.display = "none";
      }, 500);
    }, 300);

    console.log("✅ Assets loaded, ready to join game");
  });

  // Simulate loading progress (assets load so fast we need to show something)
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += 5;
    if (progress <= 90) {
      loadingProgress.style.width = `${progress}%`;
      if (progress < 30) {
        loadingText.textContent = "Loading assets...";
      } else if (progress < 60) {
        loadingText.textContent = "Loading animations...";
      } else {
        loadingText.textContent = "Almost ready...";
      }
    } else {
      clearInterval(progressInterval);
    }
  }, 50);

  // Load mods
  setTimeout(autoLoadMods, 500);

  console.log(`👻 Spectating as "${playerName}"`);
})();

// HUD elements
// Bottom HUD elements removed - using mod system for HUD
// const healthBar = document.getElementById("healthBar");
// const healthText = document.getElementById("healthText");
// const armorBar = document.getElementById("armorBar");
// const armorText = document.getElementById("armorText");
// const weaponName = document.getElementById("weaponName");
// const ammoCount = document.getElementById("ammoCount");
// const reloadIndicator = document.getElementById("reloadIndicator");
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
  projectiles: [],
};

// Interpolation for smooth movement
let lastServerState = {
  players: [],
  pickups: [],
  projectiles: [],
  grenades: [],
};
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
  throwGrenade: false,
  aimAngle: 0,
};

// Grenade throw power (0 to 1)
let grenadePower = 0;
let grenadeChargeStartTime = 0;
const MAX_GRENADE_POWER = 1.0;
const GRENADE_CHARGE_TIME = 2000; // 2 seconds to reach full power

let mouseX = 0;
let mouseY = 0;

// Visual effects
let effects = [];
let particles = [];
let bloodstains = []; // Permanent bloodstains from deaths

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
// Note: resizeCanvas() is now called in initGame() after game div is visible

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

    // Save player name for auto-rejoin on reconnect
    localStorage.setItem("playerName", playerName);

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
    case "g":
      if (!input.throwGrenade) {
        input.throwGrenade = true;
        grenadeChargeStartTime = Date.now();
        grenadePower = 0;
      }
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
    case "g":
      if (input.throwGrenade) {
        // Calculate final power based on hold duration
        const holdDuration = Date.now() - grenadeChargeStartTime;
        grenadePower = Math.min(
          MAX_GRENADE_POWER,
          holdDuration / GRENADE_CHARGE_TIME,
        );
        input.throwGrenade = false;
        // Power will be sent with the input to server
      }
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
const resumeGameButton = document.getElementById("resumeGameButton");
const playerNameInput = document.getElementById("playerNameInput");
const saveNameButton = document.getElementById("saveNameButton");
const spectateButton = document.getElementById("spectateButton");
const controlsButton = document.getElementById("controlsButton");
const closeControlsButton = document.getElementById("closeControlsButton");
const debugHudButton = document.getElementById("debugHudButton");
const debugHudButtonText = document.getElementById("debugHudButtonText");
const levelEditorButton = document.getElementById("levelEditorButton");

// Menu state
let isMenuOpen = false;

function toggleGameMenu() {
  isMenuOpen = !isMenuOpen;
  gameMenu.style.display = isMenuOpen ? "flex" : "none";
  controlsScreen.style.display = "none";

  // Populate name input with current name when opening
  if (isMenuOpen) {
    // Reset to player tab when opening menu
    switchTab("player");
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

// M key handler for game menu
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "m") {
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

// Resume game button
resumeGameButton.addEventListener("click", () => {
  toggleGameMenu();
});

// Save name button
saveNameButton.addEventListener("click", () => {
  const newName = playerNameInput.value.trim();
  if (newName && newName.length > 0) {
    modSystem.setPlayerName(newName);
    modEditor.setPlayerName(newName); // Update modEditor with new name
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
    // Emit spectate event to server to properly remove player
    socket.emit("spectate");

    // Update local state
    playerId = null;
    isSpectator = true;

    // Show spectator overlay again
    const spectatorOverlay = document.getElementById("spectatorOverlay");
    if (spectatorOverlay) {
      spectatorOverlay.style.display = "block";
    }

    // Reset join button
    joinButton.disabled = false;
    joinButton.textContent = "JOIN GAME";

    console.log("👻 Switched to spectator mode");
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

// Debug HUD toggle button
debugHudButton.addEventListener("click", () => {
  if (window.togglePerformanceHUD) {
    const isEnabled = window.togglePerformanceHUD();
    debugHudButtonText.textContent = isEnabled
      ? "Disable Debug HUD"
      : "Enable Debug HUD";

    // Show feedback
    debugHudButton.style.background = isEnabled ? "#66ccff" : "";
    setTimeout(() => {
      debugHudButton.style.background = "";
    }, 500);
  } else {
    console.error("Performance HUD mod not loaded!");
    debugHudButtonText.textContent = "Error: Mod not loaded";
    setTimeout(() => {
      debugHudButtonText.textContent = "Enable Debug HUD";
    }, 2000);
  }
});

// Level Editor button
levelEditorButton.addEventListener("click", () => {
  // Disconnect from game server
  if (!isSpectator && playerId) {
    socket.emit("spectate");
    playerId = null;
    isSpectator = true;
  }

  // Close menu and open level editor
  toggleGameMenu();
  levelEditor.open();

  console.log("🎨 Opened level editor");
});

// Game mode voting buttons
const voteDeathmatchButton = document.getElementById("voteDeathmatchButton");
const voteVibeRoyaleButton = document.getElementById("voteVibeRoyaleButton");
const gameModeDisplay = document.getElementById("gameModeDisplay");
const voteCountsDisplay = document.getElementById("voteCountsDisplay");

voteDeathmatchButton.addEventListener("click", () => {
  if (!isSpectator) {
    socket.emit("voteGameMode", { gameMode: "deathmatch" });
    voteDeathmatchButton.style.background = "#66ccff";
    voteVibeRoyaleButton.style.background = "";
  }
});

voteVibeRoyaleButton.addEventListener("click", () => {
  if (!isSpectator) {
    socket.emit("voteGameMode", { gameMode: "vibe-royale" });
    voteVibeRoyaleButton.style.background = "#66ccff";
    voteDeathmatchButton.style.background = "";
  }
});

// Tab event listeners removed - no tabs needed

// Socket connection events
socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);

  // Clear any reconnection messages
  const reconnectOverlay = document.getElementById("reconnectOverlay");
  if (reconnectOverlay) {
    reconnectOverlay.remove();
  }

  // If we were in game before disconnect, automatically rejoin
  if (playerName && !menu.style.display.includes("none")) {
    const savedName = localStorage.getItem("playerName");
    if (savedName) {
      // Auto-rejoin with saved name
      setTimeout(() => {
        const nameInput = document.getElementById("playerName");
        if (nameInput) {
          nameInput.value = savedName;
          document.getElementById("joinButton")?.click();
        }
      }, 100);
    }
  }
});

// Receive client version from server
socket.on("clientVersion", (data) => {
  console.log("🔖 Client version:", data.version);
  clientVersion = data.version;
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket disconnected:", reason);
  showReconnectOverlay("Disconnected from server. Reconnecting...");
});

socket.on("connect_error", (error) => {
  console.error("❌ Socket connection error:", error);
  showReconnectOverlay("Connection error. Retrying...");
});

socket.on("reconnect", (attemptNumber) => {
  console.log("✅ Reconnected after", attemptNumber, "attempts");
  hideReconnectOverlay();
});

socket.on("reconnect_attempt", (attemptNumber) => {
  console.log("🔄 Reconnection attempt", attemptNumber);
  showReconnectOverlay(`Reconnecting... (attempt ${attemptNumber}/10)`);
});

socket.on("reconnect_failed", () => {
  console.error("❌ Reconnection failed");
  showReconnectOverlay("Reconnection failed. Please refresh the page.", true);
});

// Server shutdown notification
socket.on("serverShutdown", (data) => {
  console.log("⚠️ Server shutting down:", data.message);
  showReconnectOverlay(data.message);
});

// Helper function to show reconnection overlay
function showReconnectOverlay(message, permanent = false) {
  let overlay = document.getElementById("reconnectOverlay");

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "reconnectOverlay";
    overlay.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 30px 50px;
      border-radius: 10px;
      font-size: 20px;
      text-align: center;
      z-index: 10000;
      border: 2px solid #ff9800;
    `;
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div style="margin-bottom: 15px;">${message}</div>
    ${!permanent ? '<div style="font-size: 14px; color: #aaa;">Please wait...</div>' : '<div style="font-size: 14px; color: #f44336;">Please refresh the page</div>'}
  `;
}

function hideReconnectOverlay() {
  const overlay = document.getElementById("reconnectOverlay");
  if (overlay) {
    overlay.remove();
  }
}

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

  // Sync ModHUD with server active mods
  if (modEditor && modEditor.modHUD && state.activeMods) {
    modEditor.modHUD.syncFromServerState(state.activeMods, socket.id);
  }
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

  // Interpolate player positions (but skip dead players to avoid flying corpses)
  const interpolatedPlayers = gameState.players.map((player) => {
    const lastPlayer = lastServerState.players.find((p) => p.id === player.id);
    if (!lastPlayer) return player;

    // Don't interpolate dead players - prevents them from flying across map during respawn
    if (player.health <= 0 || lastPlayer.health <= 0) {
      return player;
    }

    return {
      ...player,
      x: lastPlayer.x + (player.x - lastPlayer.x) * t,
      y: lastPlayer.y + (player.y - lastPlayer.y) * t,
      aimAngle:
        lastPlayer.aimAngle + (player.aimAngle - lastPlayer.aimAngle) * t,
    };
  });

  return {
    players: interpolatedPlayers,
    pickups: gameState.pickups,
    projectiles: gameState.projectiles,
  };
}

socket.on("shoot", (data) => {
  // Calculate gun barrel end position (gun extends about 25-30 pixels from player center)
  const gunBarrelLength = 30;
  const gunEndX = data.x + Math.cos(data.angle) * gunBarrelLength;
  const gunEndY = data.y + Math.sin(data.angle) * gunBarrelLength;

  createMuzzleFlash(gunEndX, gunEndY, data.angle);
  // Projectiles are now rendered from server state instead of instant tracers
  modSystem.callHook("onShoot", data);

  // Track shoot time for animation (if playerId is in the data)
  if (data.playerId) {
    playerLastShot.set(data.playerId, Date.now());
  }
});

socket.on("outOfAmmo", (data) => {
  // Call mod hook to play empty gun click sound
  modSystem.callHook("onOutOfAmmo", data);
});

socket.on("hit", (data) => {
  const target = gameState.players.find((p) => p.id === data.targetId);
  if (target) {
    createHitEffect(target.x, target.y, data.headshot);
    if (data.killed) {
      showKillMessage(data.shooterId, data.targetId, data.headshot);
      modSystem.callHook("onKill", data.shooterId, data.targetId);
      // Create bloodstain at death location
      createBloodstain(target.x, target.y);
    }
    modSystem.callHook(
      "onHit",
      data.shooterId,
      data.targetId,
      data.damage,
      data.headshot,
    );
  }
});

socket.on("pickupCollected", (data) => {
  const pickup = gameState.pickups.find((p) => p.id === data.pickupId);
  if (pickup) {
    createPickupEffect(pickup.x, pickup.y);
    modSystem.callHook("onPickup", data.playerId, pickup);
  }
});

socket.on("wallImpact", (data) => {
  createWallImpactEffect(data.x, data.y, data.angle);
});

socket.on("wallPenetration", (data) => {
  createWallPenetrationEffect(data.x, data.y, data.angle);
});

// Grenade events
socket.on("grenadeThrown", (data) => {
  console.log("Grenade thrown:", data);
});

socket.on("grenadeBounce", (data) => {
  // Create small bounce particle effect
  for (let i = 0; i < 3; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 40;
    particles.push({
      x: data.x,
      y: data.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.3,
      maxLife: 0.3,
      color: "#888888",
      size: 2,
    });
  }
});

socket.on("grenadeExplode", (data) => {
  createExplosionEffect(data.x, data.y, data.radius);
});

socket.on("respawn", (data) => {
  if (data.playerId === playerId) {
    respawnMessage.style.display = "none";
  }
});

socket.on("roundOver", (data) => {
  // Display round over message
  showRoundOverMessage(data.winnerName, data.scoreLimit);
  modSystem.callHook("onRoundOver", data.winnerId, data.winnerName);
});

// Warmup and countdown state
let warmupEndTime = null;
let countdownStartTime = null;
let countdownInterval = null;

socket.on("warmupStart", (data) => {
  warmupEndTime = data.endTime;
  console.log("🔥 Warmup started - 25 seconds");
  showWarmupMessage();
});

socket.on("countdownStart", (data) => {
  warmupEndTime = null;
  countdownStartTime = Date.now();
  console.log("⏱️  Countdown started - 5 seconds");
  showCountdownMessage();
});

socket.on("roundStart", () => {
  countdownStartTime = null;
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  console.log("🎮 Round started!");
  hideCountdownMessage();
});

socket.on("modActivated", async (data) => {
  console.log(`🤖 ${data.entityName} purchased ${data.modName}`);

  // Show notification to all players
  const notification = document.createElement("div");
  notification.style.position = "fixed";
  notification.style.top = "120px";
  notification.style.right = "20px";
  notification.style.backgroundColor = "rgba(102, 204, 255, 0.95)";
  notification.style.border = "2px solid #66ccff";
  notification.style.borderRadius = "8px";
  notification.style.padding = "12px 20px";
  notification.style.fontFamily = "monospace";
  notification.style.fontSize = "14px";
  notification.style.color = "#ffffff";
  notification.style.zIndex = "9999";
  notification.style.animation = "slideInRight 0.3s ease-out";
  notification.textContent = `${data.entityName} purchased ${data.modName}`;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOutRight 0.3s ease-in";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
});

// Game mode voting handlers
socket.on("voteUpdate", (data) => {
  const { votes, totalPlayers } = data;
  voteCountsDisplay.textContent = `Votes: Deathmatch (${votes.deathmatch}) | Vibe Royale (${votes["vibe-royale"]})`;
});

socket.on("gameModeChanged", (data) => {
  const { gameMode } = data;
  const displayName = gameMode === "vibe-royale" ? "Vibe Royale" : "Deathmatch";
  gameModeDisplay.textContent = `Current: ${displayName}`;

  // Show notification
  const notification = document.createElement("div");
  notification.style.position = "fixed";
  notification.style.top = "50%";
  notification.style.left = "50%";
  notification.style.transform = "translate(-50%, -50%)";
  notification.style.backgroundColor = "rgba(255, 215, 0, 0.95)";
  notification.style.border = "3px solid #ffd700";
  notification.style.borderRadius = "10px";
  notification.style.padding = "20px 40px";
  notification.style.fontFamily = "monospace";
  notification.style.fontSize = "24px";
  notification.style.fontWeight = "bold";
  notification.style.color = "#000";
  notification.style.zIndex = "10000";
  notification.style.textAlign = "center";
  notification.textContent = `Game Mode: ${displayName}`;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.transition = "opacity 0.3s";
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
});

// Send input to server
setInterval(() => {
  const player = gameState.players.find((p) => p.id === playerId);
  if (!player) return;

  // Calculate aim angle
  const screenCenterX = canvas.width / 2;
  const screenCenterY = canvas.height / 2;
  input.aimAngle = Math.atan2(mouseY - screenCenterY, mouseX - screenCenterX);

  // Update grenade power if charging
  if (input.throwGrenade) {
    const holdDuration = Date.now() - grenadeChargeStartTime;
    grenadePower = Math.min(
      MAX_GRENADE_POWER,
      holdDuration / GRENADE_CHARGE_TIME,
    );
  }

  // Send input with grenade power
  socket.emit("input", { ...input, grenadePower });
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

  // Bottom HUD elements removed - updates handled by mod system
  // healthBar.style.width = `${displayPlayer.health}%`;
  // healthText.textContent = Math.ceil(displayPlayer.health);
  // armorBar.style.width = `${displayPlayer.armor}%`;
  // armorText.textContent = Math.ceil(displayPlayer.armor);
  // weaponName.textContent = displayPlayer.weapon.toUpperCase();
  // ammoCount.textContent = `${displayPlayer.ammo} / ${weapons[displayPlayer.weapon].mag}`;
  // reloadIndicator.style.display = displayPlayer.reloading ? "block" : "none";

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
function showKillMessage(killerId, victimId, isHeadshot = false) {
  const killer = gameState.players.find((p) => p.id === killerId);
  const victim = gameState.players.find((p) => p.id === victimId);

  if (!killer || !victim) return;

  const message = document.createElement("div");
  message.className = "kill-message";

  // Add headshot indicator if it was a headshot
  if (isHeadshot) {
    message.textContent = `${killer.name} [HEADSHOT] ${victim.name}`;
    message.style.color = "#ff0000"; // Red text for headshots
  } else {
    message.textContent = `${killer.name} killed ${victim.name}`;
  }

  if (killerId === playerId) {
    message.style.borderLeftColor = "#66ccff";
  } else if (victimId === playerId) {
    message.style.borderLeftColor = "#ff3366";
  }

  killfeed.appendChild(message);

  // Limit number of messages displayed (keep last 5)
  const MAX_MESSAGES = 5;
  const messages = killfeed.querySelectorAll(".kill-message");
  if (messages.length > MAX_MESSAGES) {
    messages[0].remove();
  }

  // Remove message after 5 seconds (matches CSS animation)
  setTimeout(() => {
    message.remove();
  }, 5000);
}

// Show round over message
function showRoundOverMessage(winnerName, scoreLimit) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "50%";
  overlay.style.left = "50%";
  overlay.style.transform = "translate(-50%, -50%)";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
  overlay.style.border = "3px solid #ffff00";
  overlay.style.borderRadius = "10px";
  overlay.style.padding = "40px 60px";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.zIndex = "9999";
  overlay.style.animation = "fadeIn 0.5s";
  overlay.style.boxShadow = "0 0 40px rgba(255, 255, 0, 0.5)";

  const title = document.createElement("div");
  title.textContent = "ROUND OVER";
  title.style.fontSize = "48px";
  title.style.fontWeight = "bold";
  title.style.color = "#ffff00";
  title.style.fontFamily = "monospace";
  title.style.textShadow = "0 0 20px #ffff00";
  title.style.marginBottom = "20px";

  const winnerText = document.createElement("div");
  winnerText.textContent = `${winnerName} WINS!`;
  winnerText.style.fontSize = "36px";
  winnerText.style.color = "#66ccff";
  winnerText.style.fontFamily = "monospace";
  winnerText.style.textShadow = "0 0 15px #66ccff";
  winnerText.style.marginBottom = "15px";

  const scoreText = document.createElement("div");
  scoreText.textContent = `${scoreLimit} KILLS`;
  scoreText.style.fontSize = "24px";
  scoreText.style.color = "#ffffff";
  scoreText.style.fontFamily = "monospace";
  scoreText.style.marginBottom = "30px";

  const nextRoundText = document.createElement("div");
  nextRoundText.textContent = "Next round starting...";
  nextRoundText.style.fontSize = "18px";
  nextRoundText.style.color = "#888888";
  nextRoundText.style.fontFamily = "monospace";

  overlay.appendChild(title);
  overlay.appendChild(winnerText);
  overlay.appendChild(scoreText);
  overlay.appendChild(nextRoundText);

  document.body.appendChild(overlay);

  // Remove after 3 seconds
  setTimeout(() => {
    overlay.style.animation = "fadeOut 0.5s";
    setTimeout(() => {
      overlay.remove();
    }, 500);
  }, 2500);
}

// Warmup and countdown overlay
let warmupOverlay = null;
let countdownOverlay = null;

function showWarmupMessage() {
  // Remove any existing overlay
  if (warmupOverlay) warmupOverlay.remove();
  if (countdownOverlay) countdownOverlay.remove();

  warmupOverlay = document.createElement("div");
  warmupOverlay.style.position = "fixed";
  warmupOverlay.style.top = "100px";
  warmupOverlay.style.left = "50%";
  warmupOverlay.style.transform = "translateX(-50%)";
  warmupOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  warmupOverlay.style.border = "2px solid #ff9900";
  warmupOverlay.style.borderRadius = "10px";
  warmupOverlay.style.padding = "20px 40px";
  warmupOverlay.style.zIndex = "8000";
  warmupOverlay.style.fontFamily = "monospace";
  warmupOverlay.style.fontSize = "24px";
  warmupOverlay.style.color = "#ff9900";
  warmupOverlay.style.textAlign = "center";
  warmupOverlay.style.textShadow = "0 0 10px #ff9900";
  warmupOverlay.textContent = "WARMUP - Get Ready!";

  document.body.appendChild(warmupOverlay);
}

function showCountdownMessage() {
  // Remove warmup overlay
  if (warmupOverlay) {
    warmupOverlay.remove();
    warmupOverlay = null;
  }

  countdownOverlay = document.createElement("div");
  countdownOverlay.style.position = "fixed";
  countdownOverlay.style.top = "50%";
  countdownOverlay.style.left = "50%";
  countdownOverlay.style.transform = "translate(-50%, -50%)";
  countdownOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
  countdownOverlay.style.border = "4px solid #ff0000";
  countdownOverlay.style.borderRadius = "20px";
  countdownOverlay.style.padding = "50px 80px";
  countdownOverlay.style.zIndex = "10000";
  countdownOverlay.style.fontFamily = "monospace";
  countdownOverlay.style.fontSize = "120px";
  countdownOverlay.style.color = "#ff0000";
  countdownOverlay.style.textAlign = "center";
  countdownOverlay.style.textShadow = "0 0 30px #ff0000";
  countdownOverlay.style.fontWeight = "bold";

  document.body.appendChild(countdownOverlay);

  // Start countdown animation
  let countdown = 5;
  countdownOverlay.textContent = countdown;

  countdownInterval = setInterval(() => {
    countdown--;
    if (countdown > 0 && countdownOverlay) {
      countdownOverlay.textContent = countdown;
    } else if (countdown === 0 && countdownOverlay) {
      countdownOverlay.textContent = "GO!";
      countdownOverlay.style.color = "#00ff00";
      countdownOverlay.style.textShadow = "0 0 30px #00ff00";
      countdownOverlay.style.borderColor = "#00ff00";
    }
  }, 1000);
}

function hideCountdownMessage() {
  if (countdownOverlay) {
    setTimeout(() => {
      if (countdownOverlay) {
        countdownOverlay.style.animation = "fadeOut 0.5s";
        setTimeout(() => {
          if (countdownOverlay) {
            countdownOverlay.remove();
            countdownOverlay = null;
          }
        }, 500);
      }
    }, 500); // Show "GO!" for 500ms
  }
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

// Projectiles are now rendered directly from server state
// No longer need instant tracer lines

function createHitEffect(x, y, isHeadshot = false) {
  // Add blood splat sprite effect (larger for headshots)
  const bloodSprite = assets.get("blood_splat");
  if (bloodSprite && bloodSprite.complete) {
    effects.push({
      type: "bloodSplat",
      x,
      y,
      angle: Math.random() * Math.PI * 2,
      scale: isHeadshot ? 0.5 + Math.random() * 0.3 : 0.3 + Math.random() * 0.3,
      life: 2.0,
      maxLife: 2.0,
    });
  }

  // Headshot text effect
  if (isHeadshot) {
    effects.push({
      type: "headshotText",
      x,
      y: y - 30, // Above the player
      life: 1.0,
      maxLife: 1.0,
    });
  }

  // Blood particles (more for headshots)
  const particleCount = isHeadshot ? 20 : 12;
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
    const speed = isHeadshot
      ? 200 + Math.random() * 200
      : 150 + Math.random() * 150;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8,
      maxLife: 0.8,
      color: isHeadshot ? "#ff0000" : "#cc0000", // Brighter red for headshots
      size: isHeadshot ? 3 + Math.random() * 4 : 2 + Math.random() * 3,
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

function createWallImpactEffect(x, y, angle) {
  // Create small particles flying off the wall
  // Particles should fly away from the wall (opposite to bullet direction)
  for (let i = 0; i < 5; i++) {
    // Spread particles in a cone away from impact point
    const spreadAngle = angle + Math.PI + (Math.random() - 0.5) * 1.0; // Opposite direction with spread
    const speed = 80 + Math.random() * 120;
    particles.push({
      x,
      y,
      vx: Math.cos(spreadAngle) * speed,
      vy: Math.sin(spreadAngle) * speed,
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.5,
      color: "#aaaaaa", // Gray dust/debris color
      size: 2 + Math.random() * 2,
    });
  }
}

function createWallPenetrationEffect(x, y, angle) {
  // Create bright particles bursting through wall
  // More dramatic than wall impact - bullet going THROUGH
  for (let i = 0; i < 8; i++) {
    // Particles fly in bullet direction (penetrating through)
    const spreadAngle = angle + (Math.random() - 0.5) * 0.6;
    const speed = 120 + Math.random() * 180;
    particles.push({
      x,
      y,
      vx: Math.cos(spreadAngle) * speed,
      vy: Math.sin(spreadAngle) * speed,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      color: "#ffaa00", // Bright orange for penetration
      size: 2 + Math.random() * 3,
    });
  }

  // Add some debris particles too
  for (let i = 0; i < 4; i++) {
    const spreadAngle = angle + Math.PI + (Math.random() - 0.5) * 1.5;
    const speed = 60 + Math.random() * 100;
    particles.push({
      x,
      y,
      vx: Math.cos(spreadAngle) * speed,
      vy: Math.sin(spreadAngle) * speed,
      life: 0.3 + Math.random() * 0.2,
      maxLife: 0.5,
      color: "#888888", // Gray debris
      size: 2 + Math.random() * 2,
    });
  }
}

function createBloodstain(x, y) {
  const bloodSprite = assets.get("blood_splat");
  if (bloodSprite && bloodSprite.complete) {
    bloodstains.push({
      x,
      y,
      angle: Math.random() * Math.PI * 2,
      scale: 0.4 + Math.random() * 0.3,
      createdAt: Date.now(),
      duration: 5000, // 5 seconds
    });
  }
}

function createExplosionEffect(x, y, radius) {
  // Large explosion flash
  effects.push({
    type: "explosionFlash",
    x,
    y,
    radius,
    life: 0.3,
    maxLife: 0.3,
  });

  // Create explosion particles in all directions
  const particleCount = 60;
  for (let i = 0; i < particleCount; i++) {
    const angle =
      (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.2;
    const speed = 200 + Math.random() * 300;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6 + Math.random() * 0.4,
      maxLife: 1.0,
      color: i % 3 === 0 ? "#ff6600" : i % 3 === 1 ? "#ffaa00" : "#ff0000",
      size: 3 + Math.random() * 4,
    });
  }

  // Add smoke particles
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 100;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50, // Float upward
      life: 1.0 + Math.random() * 0.5,
      maxLife: 1.5,
      color: "#444444",
      size: 4 + Math.random() * 6,
    });
  }
}

// Render loop
function render(dt) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Use interpolated state for smooth rendering
  const renderState = getInterpolatedState();
  const player = renderState.players.find((p) => p.id === playerId);

  // Spectator mode - follow kill leader (or top scorer if no kill leader)
  if (!player && isSpectator) {
    let topScorer = null;

    // In Vibe Royale mode, follow the kill leader
    if (gameState.gameMode === "vibe-royale" && gameState.killLeaderId) {
      topScorer = renderState.players.find(
        (p) => p.id === gameState.killLeaderId && p.health > 0,
      );
    }

    // Fallback: find top scoring alive player or bot
    if (!topScorer) {
      let topKills = -1;
      for (const p of renderState.players) {
        if (p.health > 0 && p.kills > topKills) {
          topKills = p.kills;
          topScorer = p;
        }
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

  // Draw bloodstains (permanent decals from deaths)
  drawBloodstains();

  // Draw effects (blood splatters should be under players)
  drawEffects(dt);

  // Draw particles (blood particles should be under players)
  drawParticles(dt);

  // Draw projectiles
  drawProjectiles();

  // Draw grenades
  drawGrenades();

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

  // Call mod render hooks
  modSystem.callHook("onRender", ctx, camera, dt);

  // Spectator mode indicator (below join button)
  if (!player && isSpectator) {
    // Position below the join button (which is at bottom: 20px with some height)
    // Join button is approximately 30-40px tall, so place indicator at about 70px from bottom
    const indicatorY = canvas.height - 70;

    // Semi-transparent background for label
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(canvas.width / 2 - 100, indicatorY - 20, 200, 35);

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SPECTATOR MODE", canvas.width / 2, indicatorY);
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

  // Determine animation based on weapon type
  let weaponType = "handgun"; // default
  if (p.weapon === "rifle" || p.weapon === "smg") {
    weaponType = "rifle";
  } else if (p.weapon === "shotgun") {
    weaponType = "shotgun";
  }

  // Determine animation state
  let animationKey;
  const now = Date.now();
  const lastShot = playerLastShot.get(p.id) || 0;
  const shootAnimDuration = 3 * 50; // 3 frames * 50ms per frame = 150ms
  const isShooting = now - lastShot < shootAnimDuration;

  if (p.reloading) {
    animationKey = `${weaponType}_reload`;
    animator.setFrameDelay(30); // Faster for more frames (15 frames total)
  } else if (isShooting) {
    animationKey = `${weaponType}_shoot`;
    animator.setFrameDelay(50); // 3 frames, play once
    // Reset animator if this is a new shot
    if (now - lastShot < 16) {
      // Within one frame of shooting
      animator.reset();
    }
  } else {
    // Check if player is moving
    const isMoving = p.vx !== 0 || p.vy !== 0;
    if (isMoving) {
      animationKey = `${weaponType}_move`;
      animator.setFrameDelay(40); // Faster for more frames (20 frames total)
    } else {
      animationKey = `${weaponType}_idle`;
      animator.setFrameDelay(50); // Faster for more frames (20 frames total)
    }
  }

  const animation = assets.getAnimation(animationKey);
  const isLooping = animationKey.includes("shoot") ? false : true;
  const sprite = animator.getFrame(animation, isLooping);

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(p.aimAngle);

  if (sprite && sprite.complete) {
    // Scale down the sprite (0.3 = 30% of original size)
    const scale = 0.3;
    const scaledWidth = sprite.width * scale;
    const scaledHeight = sprite.height * scale;

    // Draw invulnerability effect - rotating particle ring
    if (p.invulnerable) {
      const time = Date.now() / 1000; // Convert to seconds for smoother animation

      // Calculate pulsing radius (oscillates between 0.85 and 1.15 of base)
      const pulse = Math.sin(time * 2.5) * 0.15 + 1.0;
      const baseRadius = Math.max(scaledWidth, scaledHeight) / 2 + 25;
      const radius = baseRadius * pulse;

      // Rotation angle increases over time
      const rotationSpeed = 2.0; // radians per second
      const rotationOffset = time * rotationSpeed;

      // Draw ring of particles
      const particleCount = 16;
      const particleSize = 4;

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + rotationOffset;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;

        // Particle glow effect
        ctx.shadowColor = "#ffff00";
        ctx.shadowBlur = 8;

        // Draw particle
        ctx.fillStyle = "#ffff00";
        ctx.beginPath();
        ctx.arc(px, py, particleSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Reset shadow
      ctx.shadowBlur = 0;
    }

    // Create colored version of sprite using canvas tinting
    const tintCanvas = document.createElement("canvas");
    tintCanvas.width = sprite.width;
    tintCanvas.height = sprite.height;
    const tintCtx = tintCanvas.getContext("2d");

    // Draw original sprite
    tintCtx.drawImage(sprite, 0, 0);

    // Apply color tint
    tintCtx.globalCompositeOperation = "multiply";
    tintCtx.fillStyle = `rgb(${playerColor.r}, ${playerColor.g}, ${playerColor.b})`;
    tintCtx.fillRect(0, 0, sprite.width, sprite.height);

    // Restore original alpha
    tintCtx.globalCompositeOperation = "destination-in";
    tintCtx.drawImage(sprite, 0, 0);

    // Draw tinted player sprite with scaling
    ctx.drawImage(
      tintCanvas,
      -scaledWidth / 2,
      -scaledHeight / 2,
      scaledWidth,
      scaledHeight,
    );
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

  // Grenade power bar (only for local player when charging)
  if (isLocalPlayer && input.throwGrenade && grenadePower > 0) {
    const powerBarWidth = 50;
    const powerBarHeight = 6;
    const powerBarX = screenX - powerBarWidth / 2;
    const powerBarY = screenY - (gameConfig?.PLAYER_RADIUS || 30) - 25;

    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(powerBarX, powerBarY, powerBarWidth, powerBarHeight);

    // Power fill (yellow gradient)
    const gradient = ctx.createLinearGradient(
      powerBarX,
      0,
      powerBarX + powerBarWidth,
      0,
    );
    gradient.addColorStop(0, "#ffff00");
    gradient.addColorStop(1, "#ff9900");
    ctx.fillStyle = gradient;
    ctx.fillRect(
      powerBarX,
      powerBarY,
      powerBarWidth * grenadePower,
      powerBarHeight,
    );

    // Border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(powerBarX, powerBarY, powerBarWidth, powerBarHeight);
  }

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

  // Ammo bar - shows magazine percentage or reload progress
  if (weapons && weapons[p.weapon]) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(barX, barY + 6, barWidth, barHeight);

    if (p.reloading && p.reloadFinish) {
      // Show reload progress as a filling bar
      const weapon = weapons[p.weapon];
      const reloadDuration = weapon.reload * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeRemaining = Math.max(0, p.reloadFinish - now);
      const reloadProgress = 1 - timeRemaining / reloadDuration;

      ctx.fillStyle = "#ff9900"; // Orange color for reloading
      ctx.fillRect(barX, barY + 6, barWidth * reloadProgress, barHeight);
    } else {
      // Show ammo percentage
      const ammoPercent = p.ammo / weapons[p.weapon].mag;
      ctx.fillStyle = "#ffd700"; // Gold color
      ctx.fillRect(barX, barY + 6, barWidth * ammoPercent, barHeight);
    }
  }
}

function drawBloodstains() {
  const now = Date.now();
  const bloodSprite = assets.get("blood_splat");

  // Remove expired bloodstains
  bloodstains = bloodstains.filter((stain) => {
    return now - stain.createdAt < stain.duration;
  });

  // Draw bloodstains
  if (bloodSprite && bloodSprite.complete) {
    bloodstains.forEach((stain) => {
      const screenX = worldToScreenX(stain.x);
      const screenY = worldToScreenY(stain.y);

      // Calculate fade out effect in final second
      const timeLeft = stain.duration - (now - stain.createdAt);
      const alpha = timeLeft < 1000 ? timeLeft / 1000 : 1.0;

      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.rotate(stain.angle);
      ctx.globalAlpha = alpha * 0.8; // Semi-transparent

      const width = bloodSprite.width * stain.scale;
      const height = bloodSprite.height * stain.scale;
      ctx.drawImage(bloodSprite, -width / 2, -height / 2, width, height);

      ctx.globalAlpha = 1;
      ctx.restore();
    });
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

      // Orange muzzle flash
      ctx.fillStyle = `rgba(255, 140, 0, ${alpha})`;
      ctx.beginPath();
      // Draw at position 0,0 since we've already positioned at gun barrel end
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
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
    } else if (effect.type === "headshotText") {
      const screenX = worldToScreenX(effect.x);
      const screenY = worldToScreenY(effect.y);

      ctx.save();
      ctx.globalAlpha = alpha;

      // Draw "HEADSHOT!" text
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Text shadow for visibility
      ctx.shadowColor = "#000000";
      ctx.shadowBlur = 8;

      // Bright red text
      ctx.fillStyle = "#ff0000";
      ctx.fillText("HEADSHOT!", screenX, screenY);

      ctx.globalAlpha = 1;
      ctx.restore();
    } else if (effect.type === "explosionFlash") {
      const screenX = worldToScreenX(effect.x);
      const screenY = worldToScreenY(effect.y);

      // Large expanding circle of fire
      ctx.save();
      const explosionAlpha = alpha * 0.8;
      const explosionRadius = effect.radius * (1.5 - alpha * 0.5); // Expands then fades

      // Outer ring - orange
      ctx.fillStyle = `rgba(255, 140, 0, ${explosionAlpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(screenX, screenY, explosionRadius, 0, Math.PI * 2);
      ctx.fill();

      // Middle ring - bright yellow
      ctx.fillStyle = `rgba(255, 220, 0, ${explosionAlpha})`;
      ctx.beginPath();
      ctx.arc(screenX, screenY, explosionRadius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Inner core - white hot
      ctx.fillStyle = `rgba(255, 255, 255, ${explosionAlpha})`;
      ctx.beginPath();
      ctx.arc(screenX, screenY, explosionRadius * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
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

function drawProjectiles() {
  if (!gameState.projectiles) return;

  gameState.projectiles.forEach((projectile) => {
    const screenX = worldToScreenX(projectile.x);
    const screenY = worldToScreenY(projectile.y);

    // Draw projectile as a pixelated rectangle/bit
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(projectile.angle || 0);

    // Glow effect
    ctx.shadowColor = "#ffcc00";
    ctx.shadowBlur = 6;

    // Main projectile - rectangular bit
    ctx.fillStyle = "#ffff66";
    ctx.fillRect(-4, -1.5, 8, 3);

    // Inner bright core
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-3, -1, 6, 2);

    ctx.shadowBlur = 0;
    ctx.restore();
  });
}

function drawGrenades() {
  if (!gameState.grenades) return;

  const now = Date.now();

  gameState.grenades.forEach((grenade) => {
    const screenX = worldToScreenX(grenade.x);
    const screenY = worldToScreenY(grenade.y);

    // Calculate time until detonation
    const timeRemaining = grenade.detonateTime - now;
    const fusePercent = timeRemaining / 3000; // 3 second fuse

    // Color shifts from yellow to red as fuse burns down
    let r, g, b;
    if (fusePercent > 0.66) {
      // Yellow (100% to 66% remaining)
      r = 255;
      g = 255;
      b = 0;
    } else if (fusePercent > 0.33) {
      // Orange (66% to 33% remaining)
      r = 255;
      g = Math.floor(165 + (90 * (fusePercent - 0.33)) / 0.33);
      b = 0;
    } else {
      // Red (33% to 0% remaining)
      r = 255;
      g = Math.floor(165 * (fusePercent / 0.33));
      b = 0;
    }

    // Pulse effect - pulses once per second
    const pulseTime = timeRemaining % 1000; // 0-1000ms cycle
    const pulseAmount = Math.sin((pulseTime / 1000) * Math.PI); // 0 to 1 to 0
    const size = 6 + pulseAmount * 3; // 6-9px radius

    // Draw grenade with glow
    ctx.save();
    ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;
    ctx.shadowBlur = 10 + pulseAmount * 5;

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();
    ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
    ctx.fill();

    // Inner core
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(screenX, screenY, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();

    // Draw fuse timer text if close to detonation
    if (fusePercent < 0.5) {
      ctx.save();
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(
        Math.ceil(timeRemaining / 1000).toString(),
        screenX,
        screenY + size + 2,
      );
      ctx.restore();
    }
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
