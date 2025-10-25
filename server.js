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
  soundEvents: [], // Sound events for bots to hear (gunshots, footsteps)
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

// Sound detection ranges for bots
const SOUND_CONFIG = {
  GUNSHOT_RANGE: 600, // Bots can hear gunshots within this range
  FOOTSTEP_RANGE: 150, // Bots can hear footsteps within this range
  SOUND_LIFETIME: 500, // ms - how long a sound event lasts
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

// Find nearest cover (wall or crate) relative to enemy position
function findNearestCover(botX, botY, enemyX, enemyY, maxDist = 250) {
  let bestCover = null;
  let bestScore = -Infinity;

  const allObstacles = [...WALLS, ...CRATES.map(c => ({ x: c.x, y: c.y, width: c.size, height: c.size }))];

  for (const obstacle of allObstacles) {
    const coverX = obstacle.x + obstacle.width / 2;
    const coverY = obstacle.y + obstacle.height / 2;

    // Distance from bot to cover
    const distToCover = Math.sqrt((coverX - botX) ** 2 + (coverY - botY) ** 2);
    if (distToCover > maxDist || distToCover < 50) continue;

    // Check if cover is between bot and enemy
    const coverToEnemyDist = Math.sqrt((enemyX - coverX) ** 2 + (enemyY - coverY) ** 2);
    const botToEnemyDist = Math.sqrt((enemyX - botX) ** 2 + (enemyY - botY) ** 2);

    // Prefer cover that's closer and blocks line to enemy
    const blocksEnemy = coverToEnemyDist < botToEnemyDist ? 2.0 : 0.3;
    const score = (1 / (distToCover + 1)) * blocksEnemy;

    if (score > bestScore) {
      bestScore = score;
      bestCover = { x: coverX, y: coverY };
    }
  }

  return bestCover;
}

// Find best pickup for bot based on current needs
function findBestPickup(bot) {
  let bestPickup = null;
  let bestScore = -Infinity;

  for (const pickup of gameState.pickups) {
    if (!pickup.active) continue;

    const dx = pickup.x - bot.x;
    const dy = pickup.y - bot.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate priority score based on bot's needs
    let priority = 0;

    if (pickup.type.startsWith("health")) {
      const healthMissing = GAME_CONFIG.PLAYER_MAX_HEALTH - bot.health;
      if (healthMissing > 0) {
        const config = PICKUP_TYPES[pickup.type];
        // Higher priority when health is lower
        priority = (healthMissing / GAME_CONFIG.PLAYER_MAX_HEALTH) * 3.0;
        // Prefer big health when very low
        if (bot.health < 40 && pickup.type === "health_big") {
          priority *= 1.5;
        }
      }
    } else if (pickup.type.startsWith("armor")) {
      const armorMissing = 100 - bot.armor;
      if (armorMissing > 0) {
        // Armor is valuable but less urgent than health
        priority = (armorMissing / 100) * 2.0;
        // Prefer heavy armor when we have none
        if (bot.armor < 30 && pickup.type === "armor_heavy") {
          priority *= 1.3;
        }
      }
    } else if (pickup.type === "ammo") {
      const ammoMissing = WEAPONS[bot.weapon].mag - bot.ammo;
      if (ammoMissing > 0) {
        // Ammo is important but less than health/armor
        priority = (ammoMissing / WEAPONS[bot.weapon].mag) * 1.5;
      }
    } else if (pickup.type.startsWith("weapon_")) {
      const config = PICKUP_TYPES[pickup.type];
      // Only interested if it's a better weapon
      if (config.weapon !== bot.weapon) {
        // Prioritize weapon upgrades
        if (bot.weapon === "pistol") priority = 2.0;
        else if (config.weapon === "rifle") priority = 1.2;
        else priority = 0.8;
      }
    }

    if (priority <= 0) continue;

    // Score combines priority and distance (closer is better)
    const distanceFactor = 1 / (distance / 100 + 1);
    const score = priority * distanceFactor;

    if (score > bestScore) {
      bestScore = score;
      bestPickup = pickup;
    }
  }

  return bestPickup;
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

// Check line of sight between two points (for vision and sound propagation)
function hasLineOfSight(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 1) return true; // Same position

  const angle = Math.atan2(dy, dx);
  const rayDx = Math.cos(angle);
  const rayDy = Math.sin(angle);

  // Check walls
  for (const wall of WALLS) {
    const dist = rayRectIntersection(x1, y1, rayDx, rayDy, distance, wall.x, wall.y, wall.width, wall.height);
    if (dist !== null && dist < distance) {
      return false; // Wall blocks line of sight
    }
  }

  // Check crates
  for (const crate of CRATES) {
    const dist = rayRectIntersection(x1, y1, rayDx, rayDy, distance, crate.x, crate.y, crate.size, crate.size);
    if (dist !== null && dist < distance) {
      return false; // Crate blocks line of sight
    }
  }

  return true; // Clear line of sight
}

// Create a sound event that bots can hear
function createSoundEvent(x, y, type, sourceId) {
  const now = Date.now();
  gameState.soundEvents.push({
    x,
    y,
    type, // 'gunshot' or 'footstep'
    sourceId,
    createdAt: now,
    expiresAt: now + SOUND_CONFIG.SOUND_LIFETIME,
  });
}

// Clean up expired sound events
function cleanupSoundEvents() {
  const now = Date.now();
  gameState.soundEvents = gameState.soundEvents.filter(event => event.expiresAt > now);
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
    lastFootstepSound: 0,
    // Bot AI state
    target: null,
    lastHeardSound: null, // Last sound event this bot heard
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
    lastFootstepSound: 0,
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
      } else if (hit && hit.wall) {
        // Bullet hit a wall - emit wall impact event
        const impactX = player.x + Math.cos(angle) * hit.distance;
        const impactY = player.y + Math.sin(angle) * hit.distance;
        io.emit("wallImpact", {
          x: impactX,
          y: impactY,
          angle: angle,
        });
      }
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
    } else if (hit && hit.wall) {
      // Bullet hit a wall - emit wall impact event
      const impactX = player.x + Math.cos(angle) * hit.distance;
      const impactY = player.y + Math.sin(angle) * hit.distance;
      io.emit("wallImpact", {
        x: impactX,
        y: impactY,
        angle: angle,
      });
    }
  }

  io.emit("shoot", {
    playerId: player.id,
    x: player.x,
    y: player.y,
    angle: player.aimAngle,
    weapon: player.weapon,
  });

  // Create gunshot sound event for bots to hear
  createSoundEvent(player.x, player.y, 'gunshot', player.id);
}

// Game loop
const TICK_INTERVAL = 1000 / GAME_CONFIG.TICK_RATE;
const STATE_BROADCAST_INTERVAL = 1000 / 30; // Broadcast state 30 times per second
let lastTick = Date.now();
let lastStateBroadcast = Date.now();

function gameLoop() {
  try {
    const now = Date.now();
    const dt = (now - lastTick) / 1000; // seconds
    lastTick = now;

    // Clean up expired sound events
    cleanupSoundEvents();

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

        // LISTEN for sounds (gunshots and footsteps)
        let heardSound = null;
        for (const sound of gameState.soundEvents) {
          if (sound.sourceId === id) continue; // Don't hear own sounds

          const dx = sound.x - bot.x;
          const dy = sound.y - bot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Check if sound is within hearing range
          const hearingRange = sound.type === 'gunshot' ? SOUND_CONFIG.GUNSHOT_RANGE : SOUND_CONFIG.FOOTSTEP_RANGE;

          if (dist < hearingRange) {
            // Remember this sound (investigate location even if can't see source)
            if (!heardSound || dist < heardSound.dist) {
              heardSound = { x: sound.x, y: sound.y, dist, type: sound.type };
            }
          }
        }

        // Store the most recent heard sound for investigation
        if (heardSound) {
          bot.lastHeardSound = heardSound;
        }

        // Find nearest VISIBLE target (human players or other bots)
        let nearestTarget = null;
        let nearestDist = Infinity;

        // Check human players - only if bot can see them
        for (const player of gameState.players.values()) {
          if (player.health <= 0) continue;
          const dx = player.x - bot.x;
          const dy = player.y - bot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Only consider targets within vision range AND with clear line of sight
          if (dist < 600 && hasLineOfSight(bot.x, bot.y, player.x, player.y)) {
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestTarget = player;
            }
          }
        }

        // Check other bots - only if bot can see them
        for (const [otherId, otherBot] of gameState.bots) {
          if (otherId === id || otherBot.health <= 0) continue;
          const dx = otherBot.x - bot.x;
          const dy = otherBot.y - bot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Only consider targets within vision range AND with clear line of sight
          if (dist < 600 && hasLineOfSight(bot.x, bot.y, otherBot.x, otherBot.y)) {
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestTarget = otherBot;
            }
          }
        }

        // If target in range, engage tactically
        if (nearestTarget && nearestDist < 450) {
          const dx = nearestTarget.x - bot.x;
          const dy = nearestTarget.y - bot.y;
          bot.aimAngle = Math.atan2(dy, dx);

          const IDEAL_COMBAT_RANGE = 200; // Maintain this distance
          const MIN_COMBAT_RANGE = 100; // Too close, back up

          // Try to find cover (only check occasionally, not every think cycle)
          let cover = null;
          if (!bot.lastCoverCheck || now - bot.lastCoverCheck > 1000) {
            cover = findNearestCover(bot.x, bot.y, nearestTarget.x, nearestTarget.y);
            bot.cachedCover = cover;
            bot.lastCoverCheck = now;
          } else {
            cover = bot.cachedCover;
          }

          // Movement logic based on distance and cover
          if (nearestDist < MIN_COMBAT_RANGE) {
            // Too close - back away while shooting
            const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.5;
            bot.vx = -Math.cos(bot.aimAngle) * moveSpeed;
            bot.vy = -Math.sin(bot.aimAngle) * moveSpeed;
          } else if (cover && nearestDist > 150) {
            // Move toward cover when at medium range
            const coverDx = cover.x - bot.x;
            const coverDy = cover.y - bot.y;
            const coverAngle = Math.atan2(coverDy, coverDx);
            const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.4;
            bot.vx = Math.cos(coverAngle) * moveSpeed;
            bot.vy = Math.sin(coverAngle) * moveSpeed;
          } else if (nearestDist > IDEAL_COMBAT_RANGE + 50) {
            // Too far - move closer
            const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.4;
            bot.vx = Math.cos(bot.aimAngle) * moveSpeed;
            bot.vy = Math.sin(bot.aimAngle) * moveSpeed;
          } else {
            // Good range - strafe to make harder target
            const strafeAngle = bot.aimAngle + Math.PI / 2;
            const strafeDir = Math.random() > 0.5 ? 1 : -1;
            const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.3;
            bot.vx = Math.cos(strafeAngle) * moveSpeed * strafeDir;
            bot.vy = Math.sin(strafeAngle) * moveSpeed * strafeDir;
          }

          // Shoot when in good range AND has clear line of sight
          if (nearestDist >= MIN_COMBAT_RANGE && nearestDist <= 350 && Math.random() < 0.5) {
            // Double-check line of sight before shooting (in case target moved behind cover)
            if (hasLineOfSight(bot.x, bot.y, nearestTarget.x, nearestTarget.y)) {
              handleShoot(bot);
            }
          }
        } else if (bot.lastHeardSound && bot.lastHeardSound.dist > 50) {
          // INVESTIGATE heard sound - move toward it
          const dx = bot.lastHeardSound.x - bot.x;
          const dy = bot.lastHeardSound.y - bot.y;
          const angleToSound = Math.atan2(dy, dx);

          const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.6;
          bot.vx = Math.cos(angleToSound) * moveSpeed;
          bot.vy = Math.sin(angleToSound) * moveSpeed;
          bot.aimAngle = angleToSound;

          // Clear heard sound once we're close to the location
          if (bot.lastHeardSound.dist < 50) {
            bot.lastHeardSound = null;
          }
        } else {
          // No active target - roam for pickups
          bot.lastHeardSound = null; // Clear old sound
          const bestPickup = findBestPickup(bot);

          if (bestPickup) {
            // Move toward the best pickup
            const dx = bestPickup.x - bot.x;
            const dy = bestPickup.y - bot.y;
            const angle = Math.atan2(dy, dx);
            const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.6;
            bot.vx = Math.cos(angle) * moveSpeed;
            bot.vy = Math.sin(angle) * moveSpeed;
            bot.aimAngle = angle;
          } else {
            // No useful pickups - wander randomly
            if (now > bot.wanderTimer) {
              bot.wanderAngle = Math.random() * Math.PI * 2;
              bot.wanderTimer = now + 2000 + Math.random() * 2000;
            }
            const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.5;
            bot.vx = Math.cos(bot.wanderAngle) * moveSpeed;
            bot.vy = Math.sin(bot.wanderAngle) * moveSpeed;
            // Look in movement direction when wandering
            bot.aimAngle = bot.wanderAngle;
          }
        }
      }

      // Move bot with collision detection
      const newX = bot.x + bot.vx * dt;
      const newY = bot.y + bot.vy * dt;

      let moved = false;
      if (!checkWallCollision(newX, bot.y, GAME_CONFIG.PLAYER_RADIUS)) {
        bot.x = newX;
        moved = true;
      } else {
        // Hit wall, change wander direction
        bot.wanderAngle = Math.random() * Math.PI * 2;
      }

      if (!checkWallCollision(bot.x, newY, GAME_CONFIG.PLAYER_RADIUS)) {
        bot.y = newY;
        moved = true;
      } else {
        // Hit wall, change wander direction
        bot.wanderAngle = Math.random() * Math.PI * 2;
      }

      // Create footstep sounds when bot moves (every 300ms)
      if (moved && (bot.vx !== 0 || bot.vy !== 0) && now - bot.lastFootstepSound > 300) {
        createSoundEvent(bot.x, bot.y, 'footstep', bot.id);
        bot.lastFootstepSound = now;
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

      // Check pickup collisions for bots
      for (const pickup of gameState.pickups) {
        if (!pickup.active) continue;

        const dx = bot.x - pickup.x;
        const dy = bot.y - pickup.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < GAME_CONFIG.PLAYER_RADIUS + 20) {
          // Collect pickup
          const config = PICKUP_TYPES[pickup.type];
          let collected = false;

          if (
            pickup.type.startsWith("health") &&
            bot.health < GAME_CONFIG.PLAYER_MAX_HEALTH
          ) {
            bot.health = Math.min(
              GAME_CONFIG.PLAYER_MAX_HEALTH,
              bot.health + config.amount,
            );
            collected = true;
          } else if (pickup.type.startsWith("armor")) {
            bot.armor = Math.min(100, bot.armor + config.amount);
            collected = true;
          } else if (
            pickup.type === "ammo" &&
            bot.ammo < WEAPONS[bot.weapon].mag
          ) {
            bot.ammo = Math.min(
              WEAPONS[bot.weapon].mag,
              bot.ammo + Math.floor(WEAPONS[bot.weapon].mag * 0.4),
            );
            collected = true;
          } else if (pickup.type.startsWith("weapon_")) {
            // Weapon pickup
            const newWeapon = config.weapon;
            if (bot.weapon !== newWeapon) {
              bot.weapon = newWeapon;
              bot.ammo = WEAPONS[newWeapon].mag;
              bot.maxAmmo = WEAPONS[newWeapon].mag;
              bot.reloading = false;
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

      let playerMoved = false;
      // Check X axis collision
      const xBlocked = checkWallCollision(newX, player.y, GAME_CONFIG.PLAYER_RADIUS);
      if (!xBlocked) {
        player.x = newX;
        playerMoved = true;
      }

      // Check Y axis collision
      const yBlocked = checkWallCollision(player.x, newY, GAME_CONFIG.PLAYER_RADIUS);
      if (!yBlocked) {
        player.y = newY;
        playerMoved = true;
      }

      // Create footstep sounds when player moves (every 300ms)
      if (playerMoved && (player.vx !== 0 || player.vy !== 0) && now - player.lastFootstepSound > 300) {
        createSoundEvent(player.x, player.y, 'footstep', player.id);
        player.lastFootstepSound = now;
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

    // Only broadcast state at reduced rate (not every tick)
    if (now - lastStateBroadcast >= STATE_BROADCAST_INTERVAL) {
      lastStateBroadcast = now;

      const state = {
        players: allPlayers.map((p) => ({
          id: p.id,
          name: p.name,
          x: Math.round(p.x), // Round positions to reduce data size
          y: Math.round(p.y),
          aimAngle: Math.round(p.aimAngle * 100) / 100, // Round to 2 decimals
          health: Math.round(p.health),
          armor: Math.round(p.armor),
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
    }
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
