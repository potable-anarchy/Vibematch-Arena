import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ====== CRASH PREVENTION & ERROR HANDLING ======

// Catch uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("❌ UNCAUGHT EXCEPTION:", error);
  console.error("Stack:", error.stack);
  // Don't exit - keep server alive
});

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ UNHANDLED REJECTION at:", promise);
  console.error("Reason:", reason);
  // Don't exit - keep server alive
});

// Handle termination signals gracefully
process.on("SIGTERM", () => {
  console.log("⚠️  SIGTERM received, attempting graceful shutdown...");
  // Don't actually shutdown - keep alive
});

process.on("SIGINT", () => {
  console.log("⚠️  SIGINT received, attempting graceful shutdown...");
  // Don't actually shutdown - keep alive
});

// Log memory usage periodically
setInterval(() => {
  const usage = process.memoryUsage();
  console.log(
    `📊 Memory: RSS=${(usage.rss / 1024 / 1024).toFixed(2)}MB, Heap=${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
  );
}, 60000); // Every 60 seconds

console.log("✅ Crash prevention and error handlers installed");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5500;

// Serve static files
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

// Game state
const gameState = {
  players: new Map(),
  bots: new Map(),
  projectiles: [],
  pickups: [],
  nextProjectileId: 0,
  nextPickupId: 0,
  nextBotId: 0,
};

// Game constants
const GAME_CONFIG = {
  TICK_RATE: 60,
  MAX_PLAYERS: 12,
  MIN_PLAYER_COUNT: 8, // Total players + bots
  WORLD_WIDTH: 2000,
  WORLD_HEIGHT: 2000,
  PLAYER_RADIUS: 20,
  PLAYER_SPEED: 250, // pixels per second
  PLAYER_MAX_HEALTH: 100,
  PLAYER_START_ARMOR: 0,
  RESPAWN_DELAY: 1500, // ms
  SPAWN_INVULN_TIME: 600, // ms
};

// Weapon configs
const WEAPONS = {
  pistol: { damage: 20, rof: 6, mag: 12, reload: 1.2, range: 800, bloom: 0.02 },
  smg: { damage: 12, rof: 12, mag: 30, reload: 1.8, range: 600, bloom: 0.05 },
  shotgun: {
    damage: 8,
    pellets: 10,
    rof: 0.9,
    mag: 6,
    reload: 2.5,
    range: 300,
    spread: 0.12,
  },
  rifle: {
    damage: 30,
    rof: 5,
    mag: 20,
    reload: 1.7,
    range: 1200,
    bloom: 0.008,
  },
};

// Pickup configs
const PICKUP_TYPES = {
  health_small: { amount: 25, respawn: 15000 },
  health_big: { amount: 50, respawn: 25000 },
  armor_light: { amount: 50, respawn: 30000 },
  armor_heavy: { amount: 100, respawn: 45000 },
  ammo: { amount: 40, respawn: 20000 },
  weapon_smg: { weapon: "smg", respawn: 15000 },
  weapon_shotgun: { weapon: "shotgun", respawn: 20000 },
  weapon_rifle: { weapon: "rifle", respawn: 25000 },
};

// Walls and obstacles (must match client-side walls-and-obstacles.js)
const WALLS = [
  // Outer perimeter walls
  { x: 0, y: 0, width: 2000, height: 20 },
  { x: 0, y: 1980, width: 2000, height: 20 },
  { x: 0, y: 0, width: 20, height: 2000 },
  { x: 1980, y: 0, width: 20, height: 2000 },

  // Center structure
  { x: 900, y: 900, width: 200, height: 20 },
  { x: 990, y: 900, width: 20, height: 200 },

  // Corner structures (cover spots)
  { x: 200, y: 200, width: 150, height: 20 },
  { x: 200, y: 200, width: 20, height: 150 },
  { x: 1650, y: 200, width: 150, height: 20 },
  { x: 1780, y: 200, width: 20, height: 150 },
  { x: 200, y: 1650, width: 150, height: 20 },
  { x: 200, y: 1650, width: 20, height: 150 },
  { x: 1650, y: 1780, width: 150, height: 20 },
  { x: 1780, y: 1650, width: 20, height: 150 },

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

const CRATES = [
  { x: 600, y: 800, size: 40 },
  { x: 1400, y: 800, size: 40 },
  { x: 600, y: 1200, size: 40 },
  { x: 1400, y: 1200, size: 40 },
  { x: 1000, y: 600, size: 40 },
  { x: 1000, y: 1400, size: 40 },
];

// Spawn points for players (safe from walls)
const SPAWN_POINTS = [
  { x: 100, y: 100 },     // Top-left open area
  { x: 1900, y: 100 },    // Top-right open area
  { x: 100, y: 1900 },    // Bottom-left open area
  { x: 1900, y: 1900 },   // Bottom-right open area
  { x: 450, y: 1000 },    // Left center (away from corridors)
  { x: 1550, y: 1000 },   // Right center (away from corridors)
  { x: 1000, y: 450 },    // Top center (away from center structure)
  { x: 1000, y: 1550 },   // Bottom center (away from center structure)
  { x: 400, y: 400 },     // Near NW cover but clear
  { x: 1600, y: 400 },    // Near NE cover but clear
  { x: 400, y: 1600 },    // Near SW cover but clear
  { x: 1600, y: 1600 },   // Near SE cover but clear
];

// Initialize pickups
function initializePickups() {
  const pickupSpawns = [
    { x: 300, y: 300, type: "health_small" },
    { x: 1700, y: 300, type: "health_small" },
    { x: 300, y: 1700, type: "health_small" },
    { x: 1700, y: 1700, type: "health_small" },
    { x: 1000, y: 200, type: "health_big" },
    { x: 1000, y: 1800, type: "health_big" },
    { x: 200, y: 1000, type: "armor_light" },
    { x: 1800, y: 1000, type: "armor_heavy" },
    { x: 600, y: 600, type: "ammo" },
    { x: 1400, y: 1400, type: "ammo" },

    // Weapon pickups
    { x: 400, y: 400, type: "weapon_smg" },
    { x: 1600, y: 400, type: "weapon_smg" },
    { x: 400, y: 1600, type: "weapon_smg" },
    { x: 1600, y: 1600, type: "weapon_smg" },
    { x: 300, y: 1000, type: "weapon_shotgun" },
    { x: 1700, y: 1000, type: "weapon_shotgun" },
    { x: 1000, y: 300, type: "weapon_rifle" },
    { x: 1000, y: 1700, type: "weapon_rifle" },
    { x: 1000, y: 1000, type: "weapon_rifle" },
  ];

  pickupSpawns.forEach((spawn) => {
    gameState.pickups.push({
      id: gameState.nextPickupId++,
      x: spawn.x,
      y: spawn.y,
      type: spawn.type,
      active: true,
      respawnAt: null,
    });
  });
}

// Check collision between circle (player) and rectangle (wall)
function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
  // Find closest point on rectangle to circle center
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));

  // Calculate distance between circle center and closest point
  const distX = cx - closestX;
  const distY = cy - closestY;
  const distSquared = distX * distX + distY * distY;

  return distSquared < (radius * radius);
}

// Check if position collides with any walls or crates
function checkWallCollision(x, y, radius) {
  // Check walls
  for (const wall of WALLS) {
    if (circleRectCollision(x, y, radius, wall.x, wall.y, wall.width, wall.height)) {
      return true;
    }
  }

  // Check crates
  for (const crate of CRATES) {
    if (circleRectCollision(x, y, radius, crate.x, crate.y, crate.size, crate.size)) {
      return true;
    }
  }

  return false;
}

// Get spawn point farthest from other players and bots
function getSpawnPoint(players) {
  let bestSpawn = SPAWN_POINTS[0];
  let maxMinDist = 0;

  for (const spawn of SPAWN_POINTS) {
    // Skip spawns that collide with walls
    if (checkWallCollision(spawn.x, spawn.y, GAME_CONFIG.PLAYER_RADIUS)) {
      continue;
    }

    let minDist = Infinity;

    // Check distance to players
    for (const player of players.values()) {
      if (player.health <= 0) continue;
      const dx = spawn.x - player.x;
      const dy = spawn.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      minDist = Math.min(minDist, dist);
    }

    // Check distance to bots
    for (const bot of gameState.bots.values()) {
      if (bot.health <= 0) continue;
      const dx = spawn.x - bot.x;
      const dy = spawn.y - bot.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      minDist = Math.min(minDist, dist);
    }

    if (minDist > maxMinDist) {
      maxMinDist = minDist;
      bestSpawn = spawn;
    }
  }

  return { ...bestSpawn };
}

// Bot name generator
const BOT_NAMES = [
  "TargetBot", "PracticeBot", "TestDummy", "TrainingBot", "AIBot",
  "BotAlpha", "BotBravo", "BotCharlie", "BotDelta", "BotEcho"
];

// Create a bot
function createBot() {
  const id = `bot_${gameState.nextBotId++}`;
  const name = BOT_NAMES[gameState.nextBotId % BOT_NAMES.length];
  const spawn = getSpawnPoint(gameState.players);

  const bot = {
    id,
    name,
    isBot: true,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    aimAngle: 0,
    health: GAME_CONFIG.PLAYER_MAX_HEALTH,
    armor: GAME_CONFIG.PLAYER_START_ARMOR,
    weapon: "pistol",
    ammo: WEAPONS.pistol.mag,
    maxAmmo: WEAPONS.pistol.mag,
    kills: 0,
    deaths: 0,
    lastShot: 0,
    reloading: false,
    reloadFinish: 0,
    invulnerable: Date.now() + GAME_CONFIG.SPAWN_INVULN_TIME,
    respawnAt: null,
    // Bot AI state
    target: null,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderTimer: Date.now() + Math.random() * 3000,
    thinkTimer: Date.now(),
  };

  gameState.bots.set(id, bot);
  console.log(`🤖 Bot spawned: ${name} (${id})`);
  return bot;
}

// Remove a bot
function removeBot() {
  const botIds = Array.from(gameState.bots.keys());
  if (botIds.length > 0) {
    const botId = botIds[0];
    const bot = gameState.bots.get(botId);
    gameState.bots.delete(botId);
    console.log(`🤖 Bot removed: ${bot.name}`);
    io.emit("playerLeft", botId);
  }
}

// Maintain minimum player count with bots
function maintainBotCount() {
  const humanPlayers = gameState.players.size;
  const currentBots = gameState.bots.size;
  const totalPlayers = humanPlayers + currentBots;

  // Calculate how many bots we need to reach MIN_PLAYER_COUNT
  const neededBots = GAME_CONFIG.MIN_PLAYER_COUNT - humanPlayers;
  const botsToAdd = neededBots - currentBots;

  if (botsToAdd > 0) {
    // Need to add more bots
    console.log(`🤖 Adding ${botsToAdd} bots (${humanPlayers} humans, ${currentBots} bots -> ${neededBots} needed)`);
    for (let i = 0; i < botsToAdd; i++) {
      createBot();
    }
  } else if (botsToAdd < 0) {
    // Need to remove bots
    const botsToRemove = Math.abs(botsToAdd);
    console.log(`🤖 Removing ${botsToRemove} bots (${humanPlayers} humans, ${currentBots} bots -> ${neededBots} needed)`);
    for (let i = 0; i < botsToRemove; i++) {
      if (gameState.bots.size > 0) {
        removeBot();
      }
    }
  }
}

// Create new player
function createPlayer(id, name) {
  const spawn = getSpawnPoint(gameState.players);
  return {
    id,
    name,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    aimAngle: 0,
    health: GAME_CONFIG.PLAYER_MAX_HEALTH,
    armor: GAME_CONFIG.PLAYER_START_ARMOR,
    weapon: "pistol",
    ammo: WEAPONS.pistol.mag,
    maxAmmo: WEAPONS.pistol.mag,
    kills: 0,
    deaths: 0,
    lastShot: 0,
    reloading: false,
    reloadFinish: 0,
    invulnerable: Date.now() + GAME_CONFIG.SPAWN_INVULN_TIME,
    respawnAt: null,
  };
}

// Handle player damage
function damagePlayer(player, damage, attackerId) {
  if (player.invulnerable > Date.now()) return false;

  // Armor absorbs 33% damage
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, damage * 0.33);
    player.armor = Math.max(0, player.armor - absorbed);
    damage -= absorbed;
  }

  player.health = Math.max(0, player.health - damage);

  if (player.health <= 0) {
    player.deaths++;
    if (attackerId && attackerId !== player.id) {
      // Check if attacker is a player
      const attacker = gameState.players.get(attackerId);
      if (attacker) {
        attacker.kills++;
      } else {
        // Check if attacker is a bot
        const botAttacker = gameState.bots.get(attackerId);
        if (botAttacker) botAttacker.kills++;
      }
    }
    player.respawnAt = Date.now() + GAME_CONFIG.RESPAWN_DELAY;
    return true; // Player died
  }

  return false;
}

// Check if ray intersects with a rectangle (for wall collision)
function rayRectIntersection(rayX, rayY, rayDx, rayDy, range, rx, ry, rw, rh) {
  let tMin = 0;
  let tMax = range;

  // Check X slab
  if (Math.abs(rayDx) < 0.0001) {
    if (rayX < rx || rayX > rx + rw) return null;
  } else {
    const tx1 = (rx - rayX) / rayDx;
    const tx2 = (rx + rw - rayX) / rayDx;
    tMin = Math.max(tMin, Math.min(tx1, tx2));
    tMax = Math.min(tMax, Math.max(tx1, tx2));
  }

  // Check Y slab
  if (Math.abs(rayDy) < 0.0001) {
    if (rayY < ry || rayY > ry + rh) return null;
  } else {
    const ty1 = (ry - rayY) / rayDy;
    const ty2 = (ry + rh - rayY) / rayDy;
    tMin = Math.max(tMin, Math.min(ty1, ty2));
    tMax = Math.min(tMax, Math.max(ty1, ty2));
  }

  if (tMax < tMin || tMin < 0) return null;
  return tMin;
}

// Hitscan raycast
function raycast(x, y, angle, range, shooterId) {
  const endX = x + Math.cos(angle) * range;
  const endY = y + Math.sin(angle) * range;

  let closestHit = null;
  let closestDist = range;

  const rayDx = Math.cos(angle);
  const rayDy = Math.sin(angle);

  // Check wall collisions first
  for (const wall of WALLS) {
    const dist = rayRectIntersection(x, y, rayDx, rayDy, range, wall.x, wall.y, wall.width, wall.height);
    if (dist !== null && dist < closestDist) {
      closestDist = dist;
      closestHit = { wall: true, distance: dist };
    }
  }

  // Check crate collisions
  for (const crate of CRATES) {
    const dist = rayRectIntersection(x, y, rayDx, rayDy, range, crate.x, crate.y, crate.size, crate.size);
    if (dist !== null && dist < closestDist) {
      closestDist = dist;
      closestHit = { wall: true, distance: dist };
    }
  }

  // Check player collisions (only if closer than wall hit)
  for (const [id, player] of gameState.players) {
    if (id === shooterId || player.health <= 0) continue;

    // Simple circle intersection
    const dx = player.x - x;
    const dy = player.y - y;

    const a = rayDx * rayDx + rayDy * rayDy;
    const b = -2 * (rayDx * dx + rayDy * dy);
    const c =
      dx * dx + dy * dy - GAME_CONFIG.PLAYER_RADIUS * GAME_CONFIG.PLAYER_RADIUS;

    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const t = (-b - Math.sqrt(disc)) / (2 * a);
      if (t >= 0 && t < closestDist) {
        closestDist = t;
        closestHit = { player, distance: t };
      }
    }
  }

  // Check bot collisions (only if closer than wall hit)
  for (const [id, bot] of gameState.bots) {
    if (id === shooterId || bot.health <= 0) continue;

    // Simple circle intersection
    const dx = bot.x - x;
    const dy = bot.y - y;

    const a = rayDx * rayDx + rayDy * rayDy;
    const b = -2 * (rayDx * dx + rayDy * dy);
    const c =
      dx * dx + dy * dy - GAME_CONFIG.PLAYER_RADIUS * GAME_CONFIG.PLAYER_RADIUS;

    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const t = (-b - Math.sqrt(disc)) / (2 * a);
      if (t >= 0 && t < closestDist) {
        closestDist = t;
        closestHit = { player: bot, distance: t };
      }
    }
  }

  return closestHit;
}

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("join", (playerName) => {
    try {
      // Check if server is full
      if (gameState.players.size >= GAME_CONFIG.MAX_PLAYERS) {
        socket.emit("serverFull");
        console.log("Server full, rejected:", socket.id);
        return;
      }

      const player = createPlayer(
        socket.id,
        playerName || `Player${gameState.players.size + 1}`,
      );
      gameState.players.set(socket.id, player);

      socket.emit("init", {
        playerId: socket.id,
        gameConfig: GAME_CONFIG,
        weapons: WEAPONS,
      });

      io.emit("playerJoined", {
        id: player.id,
        name: player.name,
      });

      // Maintain bot count (kick bots if needed)
      maintainBotCount();

      // Broadcast updated player count
      io.emit("playerCount", gameState.players.size + gameState.bots.size);
    } catch (error) {
      console.error("❌ Error in join handler:", error);
    }
  });

  socket.on("input", (input) => {
    try {
      const player = gameState.players.get(socket.id);
      if (!player || player.health <= 0) return;

      player.aimAngle = input.aimAngle;

      // Movement
      const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);

      if (moveX !== 0 || moveY !== 0) {
        const mag = Math.sqrt(moveX * moveX + moveY * moveY);
        player.vx = (moveX / mag) * GAME_CONFIG.PLAYER_SPEED;
        player.vy = (moveY / mag) * GAME_CONFIG.PLAYER_SPEED;
      } else {
        player.vx = 0;
        player.vy = 0;
      }

      // Shooting
      if (input.shoot) {
        handleShoot(player);
      }

      // Reloading
      if (input.reload && !player.reloading) {
        const weapon = WEAPONS[player.weapon];
        player.reloading = true;
        player.reloadFinish = Date.now() + weapon.reload * 1000;
      }
    } catch (error) {
      console.error("❌ Error in input handler:", error);
    }
  });

  socket.on("disconnect", () => {
    try {
      console.log("Player disconnected:", socket.id);
      gameState.players.delete(socket.id);
      io.emit("playerLeft", socket.id);

      // Maintain bot count (spawn bots if needed)
      maintainBotCount();

      // Broadcast updated player count
      io.emit("playerCount", gameState.players.size + gameState.bots.size);
    } catch (error) {
      console.error("❌ Error in disconnect handler:", error);
    }
  });

  socket.on("error", (error) => {
    console.error("❌ Socket error:", socket.id, error);
  });
});

// Handle shooting
function handleShoot(player) {
  if (player.invulnerable > Date.now()) return;
  if (player.reloading) return;
  if (player.ammo <= 0) return;

  const weapon = WEAPONS[player.weapon];
  const now = Date.now();
  const cooldown = 1000 / weapon.rof;

  if (now - player.lastShot < cooldown) return;

  player.lastShot = now;
  player.ammo--;

  // Handle different weapon types
  if (player.weapon === "shotgun") {
    // Shotgun fires multiple pellets
    for (let i = 0; i < weapon.pellets; i++) {
      const spread = (Math.random() - 0.5) * weapon.spread * 2;
      const angle = player.aimAngle + spread;
      const hit = raycast(player.x, player.y, angle, weapon.range, player.id);

      if (hit && hit.player) {
        const killed = damagePlayer(hit.player, weapon.damage, player.id);
        io.emit("hit", {
          shooterId: player.id,
          targetId: hit.player.id,
          damage: weapon.damage,
          killed,
        });
      }
      // If hit.wall is true, bullet stopped at wall (no damage)
    }
  } else {
    // Hitscan weapons
    const bloom = (Math.random() - 0.5) * weapon.bloom * 2;
    const angle = player.aimAngle + bloom;
    const hit = raycast(player.x, player.y, angle, weapon.range, player.id);

    if (hit && hit.player) {
      const killed = damagePlayer(hit.player, weapon.damage, player.id);
      io.emit("hit", {
        shooterId: player.id,
        targetId: hit.player.id,
        damage: weapon.damage,
        killed,
      });
    }
    // If hit.wall is true, bullet stopped at wall (no damage)
  }

  io.emit("shoot", {
    playerId: player.id,
    x: player.x,
    y: player.y,
    angle: player.aimAngle,
    weapon: player.weapon,
  });
}

// Game loop
const TICK_INTERVAL = 1000 / GAME_CONFIG.TICK_RATE;
let lastTick = Date.now();

function gameLoop() {
  try {
    const now = Date.now();
    const dt = (now - lastTick) / 1000; // seconds
    lastTick = now;

    // Update bots AI
    for (const [id, bot] of gameState.bots) {
      if (bot.health <= 0) {
        // Handle bot respawn
        if (bot.respawnAt && now >= bot.respawnAt) {
          const spawn = getSpawnPoint(gameState.players);
          bot.x = spawn.x;
          bot.y = spawn.y;
          bot.health = GAME_CONFIG.PLAYER_MAX_HEALTH;
          bot.armor = GAME_CONFIG.PLAYER_START_ARMOR;
          bot.ammo = WEAPONS[bot.weapon].mag;
          bot.invulnerable = now + GAME_CONFIG.SPAWN_INVULN_TIME;
          bot.respawnAt = null;
          bot.reloading = false;
          bot.wanderAngle = Math.random() * Math.PI * 2;
        }
        continue;
      }

      // Simple bot AI - think every 200ms
      if (now > bot.thinkTimer) {
        bot.thinkTimer = now + 200;

        // Find nearest target (human players or other bots)
        let nearestTarget = null;
        let nearestDist = Infinity;

        // Check human players
        for (const player of gameState.players.values()) {
          if (player.health <= 0) continue;
          const dx = player.x - bot.x;
          const dy = player.y - bot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestTarget = player;
          }
        }

        // Check other bots
        for (const [otherId, otherBot] of gameState.bots) {
          if (otherId === id || otherBot.health <= 0) continue;
          const dx = otherBot.x - bot.x;
          const dy = otherBot.y - bot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestTarget = otherBot;
          }
        }

        // If target in range, aim and shoot
        if (nearestTarget && nearestDist < 450) {
          const dx = nearestTarget.x - bot.x;
          const dy = nearestTarget.y - bot.y;
          bot.aimAngle = Math.atan2(dy, dx);

          // Move towards target (slower than player speed)
          const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.7;
          bot.vx = Math.cos(bot.aimAngle) * moveSpeed;
          bot.vy = Math.sin(bot.aimAngle) * moveSpeed;

          // Try to shoot (with random chance to make them less accurate/aggressive)
          if (nearestDist < 300 && Math.random() < 0.4) {
            handleShoot(bot);
          }
        } else {
          // Wander randomly
          if (now > bot.wanderTimer) {
            bot.wanderAngle = Math.random() * Math.PI * 2;
            bot.wanderTimer = now + 2000 + Math.random() * 2000;
          }
          const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.5;
          bot.vx = Math.cos(bot.wanderAngle) * moveSpeed;
          bot.vy = Math.sin(bot.wanderAngle) * moveSpeed;
        }
      }

      // Move bot with collision detection
      const newX = bot.x + bot.vx * dt;
      const newY = bot.y + bot.vy * dt;

      if (!checkWallCollision(newX, bot.y, GAME_CONFIG.PLAYER_RADIUS)) {
        bot.x = newX;
      } else {
        // Hit wall, change wander direction
        bot.wanderAngle = Math.random() * Math.PI * 2;
      }

      if (!checkWallCollision(bot.x, newY, GAME_CONFIG.PLAYER_RADIUS)) {
        bot.y = newY;
      } else {
        // Hit wall, change wander direction
        bot.wanderAngle = Math.random() * Math.PI * 2;
      }

      // Clamp to world bounds
      bot.x = Math.max(GAME_CONFIG.PLAYER_RADIUS, Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.PLAYER_RADIUS, bot.x));
      bot.y = Math.max(GAME_CONFIG.PLAYER_RADIUS, Math.min(GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.PLAYER_RADIUS, bot.y));

      // Handle reload
      if (bot.reloading && now >= bot.reloadFinish) {
        bot.reloading = false;
        bot.ammo = WEAPONS[bot.weapon].mag;
      }

      // Auto-reload when empty
      if (bot.ammo <= 0 && !bot.reloading) {
        bot.reloading = true;
        bot.reloadFinish = now + WEAPONS[bot.weapon].reload * 1000;
      }
    }

    // Update players
    for (const [id, player] of gameState.players) {
      // Handle respawn
      if (player.health <= 0 && player.respawnAt && now >= player.respawnAt) {
        const spawn = getSpawnPoint(gameState.players);
        player.x = spawn.x;
        player.y = spawn.y;
        player.health = GAME_CONFIG.PLAYER_MAX_HEALTH;
        player.armor = GAME_CONFIG.PLAYER_START_ARMOR;
        player.ammo = WEAPONS[player.weapon].mag;
        player.invulnerable = now + GAME_CONFIG.SPAWN_INVULN_TIME;
        player.respawnAt = null;
        player.reloading = false;

        io.emit("respawn", {
          playerId: id,
          x: player.x,
          y: player.y,
        });
      }

      if (player.health <= 0) continue;

      // Update position with collision detection
      const newX = player.x + player.vx * dt;
      const newY = player.y + player.vy * dt;

      // Check X axis collision
      const xBlocked = checkWallCollision(newX, player.y, GAME_CONFIG.PLAYER_RADIUS);
      if (!xBlocked) {
        player.x = newX;
      }

      // Check Y axis collision
      const yBlocked = checkWallCollision(player.x, newY, GAME_CONFIG.PLAYER_RADIUS);
      if (!yBlocked) {
        player.y = newY;
      }

      // Clamp to world bounds
      player.x = Math.max(
        GAME_CONFIG.PLAYER_RADIUS,
        Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.PLAYER_RADIUS, player.x),
      );
      player.y = Math.max(
        GAME_CONFIG.PLAYER_RADIUS,
        Math.min(
          GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.PLAYER_RADIUS,
          player.y,
        ),
      );

      // Handle reload finish
      if (player.reloading && now >= player.reloadFinish) {
        player.reloading = false;
        player.ammo = WEAPONS[player.weapon].mag;
      }

      // Check pickup collisions
      for (const pickup of gameState.pickups) {
        if (!pickup.active) {
          if (pickup.respawnAt && now >= pickup.respawnAt) {
            pickup.active = true;
            pickup.respawnAt = null;
          }
          continue;
        }

        const dx = player.x - pickup.x;
        const dy = player.y - pickup.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < GAME_CONFIG.PLAYER_RADIUS + 20) {
          // Collect pickup
          const config = PICKUP_TYPES[pickup.type];
          let collected = false;

          if (
            pickup.type.startsWith("health") &&
            player.health < GAME_CONFIG.PLAYER_MAX_HEALTH
          ) {
            player.health = Math.min(
              GAME_CONFIG.PLAYER_MAX_HEALTH,
              player.health + config.amount,
            );
            collected = true;
          } else if (pickup.type.startsWith("armor")) {
            player.armor = Math.min(100, player.armor + config.amount);
            collected = true;
          } else if (
            pickup.type === "ammo" &&
            player.ammo < WEAPONS[player.weapon].mag
          ) {
            player.ammo = Math.min(
              WEAPONS[player.weapon].mag,
              player.ammo + Math.floor(WEAPONS[player.weapon].mag * 0.4),
            );
            collected = true;
          } else if (pickup.type.startsWith("weapon_")) {
            // Weapon pickup
            const newWeapon = config.weapon;
            if (player.weapon !== newWeapon) {
              player.weapon = newWeapon;
              player.ammo = WEAPONS[newWeapon].mag;
              player.maxAmmo = WEAPONS[newWeapon].mag;
              player.reloading = false;
              collected = true;
            }
          }

          if (collected) {
            pickup.active = false;
            pickup.respawnAt = now + config.respawn;
            io.emit("pickupCollected", {
              playerId: id,
              pickupId: pickup.id,
            });
          }
        }
      }
    }

    // Send state update to all clients
    // Combine players and bots into one array
    const allPlayers = [
      ...Array.from(gameState.players.values()),
      ...Array.from(gameState.bots.values())
    ];

    const state = {
      players: allPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        aimAngle: p.aimAngle,
        health: p.health,
        armor: p.armor,
        weapon: p.weapon,
        ammo: p.ammo,
        kills: p.kills,
        deaths: p.deaths,
        reloading: p.reloading,
        invulnerable: p.invulnerable > now,
      })),
      pickups: gameState.pickups.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        type: p.type,
        active: p.active,
      })),
    };

    io.emit("state", state);
  } catch (error) {
    console.error("❌ Error in game loop:", error);
    console.error("Stack:", error.stack);
    // Don't crash - continue next tick
  }
}

// Initialize and start server
initializePickups();
maintainBotCount(); // Spawn initial bots
setInterval(gameLoop, TICK_INTERVAL);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  console.log(`🤖 ${gameState.bots.size} bots ready`);
});
