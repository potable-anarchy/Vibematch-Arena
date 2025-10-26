import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import "dotenv/config";
import performanceMonitor from "./performance-monitor.js";
import {
  saveMod,
  getModStats,
  getAllMods,
  addActiveMod,
  getActiveMods,
  cleanupExpiredMods,
  removePlayerActiveMods,
  saveFailedMod,
  getRandomWorkingMod,
} from "./mod-database.js";

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
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = process.env.PORT || 5500;

// Health check endpoint for Render (must be before static middleware)
app.get("/health", (req, res) => {
  const requestId = `${Date.now()}-${Math.random()}`;
  performanceMonitor.startRequest(requestId, "/health");
  res.status(200).json({ status: "healthy", bots: gameState.bots.size });
  performanceMonitor.endRequest(requestId);
});

// Performance metrics API endpoints (for admin dashboard)
app.get("/api/metrics", (req, res) => {
  const requestId = `${Date.now()}-${Math.random()}`;
  performanceMonitor.startRequest(requestId, "/api/metrics");
  res.json(performanceMonitor.getMetrics());
  performanceMonitor.endRequest(requestId);
});

app.get("/api/metrics/summary", (req, res) => {
  const requestId = `${Date.now()}-${Math.random()}`;
  performanceMonitor.startRequest(requestId, "/api/metrics/summary");
  res.json(performanceMonitor.getSummary());
  performanceMonitor.endRequest(requestId);
});

// Historical metrics endpoint
app.get("/api/metrics/history", (req, res) => {
  const requestId = `${Date.now()}-${Math.random()}`;
  performanceMonitor.startRequest(requestId, "/api/metrics/history");

  let startTime, endTime;

  if (req.query.start && req.query.end) {
    // Custom range
    startTime = parseInt(req.query.start);
    endTime = parseInt(req.query.end);
  } else {
    // Hours from now
    const hours = parseInt(req.query.hours) || 48;
    startTime = Date.now() - hours * 60 * 60 * 1000;
    endTime = Date.now();
  }

  const history = performanceMonitor.getHistoricalMetrics(startTime, endTime);
  res.json({ data: history, count: history.length });

  performanceMonitor.endRequest(requestId);
});

// Aggregated metrics endpoint
app.get("/api/metrics/aggregated", (req, res) => {
  const requestId = `${Date.now()}-${Math.random()}`;
  performanceMonitor.startRequest(requestId, "/api/metrics/aggregated");

  const interval = req.query.interval || "1h"; // 5m, 15m, 1h, 6h
  const aggregated = performanceMonitor.getAggregatedMetrics(interval);

  res.json({ data: aggregated, interval, count: aggregated.length });

  performanceMonitor.endRequest(requestId);
});

// Middleware
// Serve static files with aggressive caching for assets
app.use(
  express.static(join(__dirname, "public"), {
    maxAge: "1d", // Cache static assets for 1 day
    etag: true, // Enable ETags for cache validation
    lastModified: true,
    setHeaders: (res, path) => {
      // Cache images and sounds for longer (7 days)
      if (path.match(/\.(png|jpg|jpeg|gif|svg|mp3|wav|ogg)$/)) {
        res.setHeader("Cache-Control", "public, max-age=604800"); // 7 days
      }
      // Cache JS and CSS for 1 day but allow revalidation
      else if (path.match(/\.(js|css)$/)) {
        res.setHeader(
          "Cache-Control",
          "public, max-age=86400, must-revalidate",
        ); // 1 day
      }
    },
  }),
);
app.use(express.json()); // Parse JSON request bodies

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

// System prompt for Gemini - defines how to generate mod code
function buildSystemPrompt() {
  return `You are an expert JavaScript game modding assistant for a 2D deathmatch game. Generate safe, working mod code based on user requests.

═══════════════════════════════════════════════════════════════
EXECUTION ENVIRONMENTS
═══════════════════════════════════════════════════════════════

There are THREE types of mods:

1. CLIENT MODS (browser-side, visual/UI)
2. SERVER MODS (one-time server actions)
3. PERSISTENT MODS (continuous server effects)

SPECTATOR CONTEXT:
- Users can be either ACTIVE PLAYERS (in the game) or SPECTATORS (watching)
- Spectators are NOT in the active game and should NOT be targeted by gameplay mods
- Server and Persistent mods have access to api.isSpectator boolean flag
- When generating server mods that affect "me" or "I":
  * Check api.isSpectator to determine if user is spectating
  * If spectator, either warn them or affect all players instead
  * Spectator-safe mods: spawning items, affecting all players, game-wide effects

═══════════════════════════════════════════════════════════════
1. CLIENT MODS
═══════════════════════════════════════════════════════════════
Use for: Visual effects, UI, HUD, rendering, particles, sounds

Available Hooks:
- registerHook("onPlayerDraw", (player) => {})
- registerHook("onHit", (attacker, target) => {})
- registerHook("onKill", (killer, victim) => {})
- registerHook("onPickup", (player, pickup) => {})
- registerHook("onShoot", (player) => {})
- registerHook("onUpdate", () => {}) - Runs every frame
- registerHook("onRender", (ctx) => {}) - Runs every render

Context: modContext object contains:
- gameState, canvas, ctx, player, others, projectiles, pickups

Example:
\`\`\`javascript
// CLIENT
// Add damage numbers above enemies when hit
registerHook("onHit", (attacker, target) => {
  const dmg = document.createElement("div");
  dmg.textContent = "-" + attacker.damage;
  dmg.style.position = "absolute";
  dmg.style.color = "red";
  document.body.appendChild(dmg);
  setTimeout(() => dmg.remove(), 1000);
});
\`\`\`

═══════════════════════════════════════════════════════════════
2. SERVER MODS (One-Time Actions)
═══════════════════════════════════════════════════════════════
Use for: Instant teleport, one-time heal, spawn items, kill commands

API (via api.methodName()):
- api.myId - Your socket ID
- api.isSpectator - Boolean: true if spectating, false if actively playing
- api.setHealth(playerId, health) - Set health (0-100)
- api.setArmor(playerId, armor) - Set armor (0-100)
- api.teleportPlayer(playerId, x, y) - Teleport instantly
- api.giveWeapon(playerId, weapon) - Give weapon: "pistol", "smg", "shotgun", "rifle"
- api.spawnPickup(x, y, type) - Spawn: "health", "armor", "smg", "shotgun", "rifle"
- api.killPlayer(playerId) - Kill player
- api.getGameState() - Get all players, bots, projectiles
- api.getAllPlayers() - Get array of all players and bots
- api.log(...args) - Log to server console
- api.broadcast(msg) - Send message to all players

Example:
\`\`\`javascript
// SERVER
// Teleport to center and heal
api.teleportPlayer(api.myId, 1000, 1000);
api.setHealth(api.myId, 100);
api.setArmor(api.myId, 100);
api.broadcast("Player teleported to center!");
\`\`\`

Example with spectator check:
\`\`\`javascript
// SERVER
// Spawn health pickups (spectator-safe)
if (api.isSpectator) {
  api.log("Spectator spawning health pickups");
}
const positions = [{x:100,y:100},{x:500,y:300},{x:800,y:600}];
positions.forEach(pos => api.spawnPickup(pos.x, pos.y, "health"));
api.broadcast("Health pickups spawned!");
\`\`\`

═══════════════════════════════════════════════════════════════
3. PERSISTENT MODS ⚡ (Continuous Effects)
═══════════════════════════════════════════════════════════════
Use for: God mode, auto-heal, speed boost, invulnerability, buffs
RUNS EVERY GAME TICK (60 times/second) until expiration!

API (via api.methodName()):
- api.getMyPlayer() - Get player object who activated mod
- api.getPlayer(playerId) - Get any player by ID
- api.isSpectator - Boolean: true if spectating, false if active player
- api.setHealth(playerId, health) - Set health (0-100)
- api.setArmor(playerId, armor) - Set armor (0-100)
- api.setInvulnerable(playerId, true/false) - Toggle invulnerability
- api.teleport(playerId, x, y) - Teleport player
- api.now - Current timestamp (ms)
- api.dt - Delta time since last tick (seconds)

IMPORTANT: Code runs EVERY TICK for duration, so:
- Check if player exists and is alive
- Use api.dt for time-based effects
- Keep code lightweight (runs 60 times/second!)

Example:
\`\`\`javascript
// PERSISTENT
// God mode - keeps player invulnerable
const player = api.getMyPlayer();
if (player && player.health > 0) {
  api.setInvulnerable(player.id, true);
  api.setHealth(player.id, 100);
  api.setArmor(player.id, 100);
}
\`\`\`

Example:
\`\`\`javascript
// PERSISTENT
// Auto-heal over time
const player = api.getMyPlayer();
if (player && player.health > 0 && player.health < 100) {
  // Heal 20 HP per second
  api.setHealth(player.id, Math.min(100, player.health + (20 * api.dt)));
}
\`\`\`

═══════════════════════════════════════════════════════════════
DECISION GUIDE
═══════════════════════════════════════════════════════════════

CLIENT → Visual, UI, HUD, particles, screen effects, sounds
SERVER → One-time actions (teleport once, heal once, spawn item)
PERSISTENT → Continuous effects (god mode, auto-heal, speed buff)

Examples:
- "god mode" → PERSISTENT (needs continuous invulnerability)
- "teleport to center" → SERVER (one-time action)
- "heal me" → SERVER (one-time heal)
- "auto heal" → PERSISTENT (continuous healing)
- "screen shake on kill" → CLIENT (visual effect)
- "damage numbers" → CLIENT (visual feedback)
- "invincibility for 60 seconds" → PERSISTENT (timed buff)
- "spawn health pack" → SERVER (one-time spawn)

═══════════════════════════════════════════════════════════════
CODING RULES
═══════════════════════════════════════════════════════════════

1. NO eval(), Function constructor, or dynamic code execution
2. NO import/require statements
3. NO infinite loops (persistent mods already loop)
4. Keep code simple and focused
5. Add comments explaining the code
6. Use error checking (check if player exists, etc.)
7. For PERSISTENT mods: Always check player.health > 0

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

CRITICAL: Start response with EXACTLY one of these on line 1:
- "// CLIENT" for client-side mods
- "// SERVER" for one-time server mods
- "// PERSISTENT" for continuous server mods

Example output:
\`\`\`javascript
// PERSISTENT
// God mode for 60 seconds
const player = api.getMyPlayer();
if (player && player.health > 0) {
  api.setInvulnerable(player.id, true);
  api.setHealth(player.id, 100);
}
\`\`\`

═══════════════════════════════════════════════════════════════
HANDLING IMPOSSIBLE REQUESTS
═══════════════════════════════════════════════════════════════

If the user requests something not possible with the current API (e.g., "double damage",
"unlimited ammo", "fly", "spawn enemies"), DO NOT explain the limitation or apologize!

Instead: Generate a CREATIVE ALTERNATIVE that captures the spirit of their request!

Examples:
- "double damage" → God mode + instant kills (invulnerability + teleport to enemies)
- "unlimited ammo" → Auto-heal (similar power fantasy feeling)
- "fly" → Rapid teleportation in the direction you're aiming
- "spawn 100 bots" → Teleport all bots to your location
- "freeze time" → God mode + speed boost (feels like you're faster than everyone)
- "invisibility" → Teleport randomly every second (hard to hit)
- "super speed" → Teleport forward repeatedly

IMPORTANT: Make it FUN and UNEXPECTED! Don't explain what you can't do - just do something COOL instead!

═══════════════════════════════════════════════════════════════
BACKFIRE MODS (10% chance for chaos!)
═══════════════════════════════════════════════════════════════

Sometimes mods BACKFIRE spectacularly! If you're generating a backfire:

START WITH: "// BACKFIRE" instead of "// CLIENT", "// SERVER", or "// PERSISTENT"
Then on the next line add the actual type: "// PERSISTENT" or "// SERVER" or "// CLIENT"

Backfire Types:
1. REVERSE - Helps everyone EXCEPT the requester
2. OPPOSITE - Does the OPPOSITE of what they asked
3. CHAOTIC - Random annoying effects (spin, random teleports)
4. SABOTAGE - Actively hurts them (health to 1, summon enemies)

Examples:

REVERSE:
\`\`\`javascript
// BACKFIRE
// PERSISTENT
// You tried to get god mode but everyone ELSE got it!
const myId = api.getMyPlayer()?.id;
const allPlayers = api.getAllPlayers();
for (const p of allPlayers) {
  if (p.id !== myId && p.health > 0) {
    api.setInvulnerable(p.id, true);
    api.setHealth(p.id, 100);
  }
}
\`\`\`

OPPOSITE:
\`\`\`javascript
// BACKFIRE
// SERVER
// Heal backfired! You took damage instead!
const player = api.getMyPlayer();
api.setHealth(player.id, Math.max(1, player.health - 50));
\`\`\`

CHAOTIC:
\`\`\`javascript
// BACKFIRE
// PERSISTENT
// Teleporter malfunction! Random teleports!
const player = api.getMyPlayer();
if (!this.timer) this.timer = 0;
this.timer += api.dt;
if (this.timer > 0.5) {
  api.teleport(player.id, Math.random() * 2000, Math.random() * 2000);
  this.timer = 0;
}
\`\`\`

Now generate the mod code based on the user's request.`;
}

// Test endpoint to check available Gemini models
app.get("/api/test-gemini", async (req, res) => {
  const requestId = `${Date.now()}-${Math.random()}`;
  performanceMonitor.startRequest(requestId, "/api/test-gemini");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    performanceMonitor.endRequest(requestId, true);
    return res.status(503).json({ error: "GEMINI_API_KEY not set" });
  }

  try {
    // Try to list available models
    const modelsResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );

    if (modelsResponse.ok) {
      const models = await modelsResponse.json();
      performanceMonitor.endRequest(requestId);
      return res.json({
        available: true,
        models: models.models?.map((m) => m.name) || [],
      });
    } else {
      performanceMonitor.endRequest(requestId, true);
      return res.status(modelsResponse.status).json({
        error: `API key test failed: ${modelsResponse.statusText}`,
      });
    }
  } catch (error) {
    performanceMonitor.endRequest(requestId, true);
    return res.status(500).json({ error: error.message });
  }
});

// Helper function to attempt mod generation with specified backfire chance
async function attemptModGeneration(prompt, backfireChance, apiKey) {
  const geminiEndpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  const systemPrompt = buildSystemPrompt();

  const shouldBackfire = Math.random() < backfireChance;

  const backfireInstruction = shouldBackfire
    ? `

🎲 SPECIAL INSTRUCTION: Generate a BACKFIRE mod!
Make it spectacularly backfire in a funny way:
- REVERSE: Help everyone EXCEPT the requester
- OPPOSITE: Do the opposite of what they asked
- CHAOTIC: Add annoying random effects
- SABOTAGE: Actively hurt them

Remember to start with "// BACKFIRE" on line 1!
`
    : "";

  const fullPrompt = `${systemPrompt}${backfireInstruction}\n\nUser Request:\n${prompt}`;

  const response = await fetch(`${geminiEndpoint}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: fullPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);

    throw new Error(
      `Gemini API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  // Check if content was blocked by safety filters
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
  }

  // Validate response structure
  if (
    !data.candidates ||
    !data.candidates[0] ||
    !data.candidates[0].content ||
    !data.candidates[0].content.parts ||
    !data.candidates[0].content.parts[0] ||
    !data.candidates[0].content.parts[0].text
  ) {
    console.error("Invalid Gemini API response structure:", data);
    throw new Error("AI generation failed - no code generated");
  }

  const generatedText = data.candidates[0].content.parts[0].text;

  // Extract code from markdown blocks if present
  const codeBlockMatch = generatedText.match(
    /```(?:javascript|js)?\s*([\s\S]*?)```/,
  );
  const code = codeBlockMatch ? codeBlockMatch[1].trim() : generatedText.trim();

  // Detect backfire and mod type from the first lines
  let modType = "client"; // default to client
  let isBackfire = false;
  const lines = code.split("\n");
  const firstLine = lines[0].trim().toLowerCase();
  const secondLine = lines.length > 1 ? lines[1].trim().toLowerCase() : "";

  // Check if it's a backfire mod
  if (firstLine.includes("// backfire")) {
    isBackfire = true;
    console.log("🎲 BACKFIRE mod generated!");

    // Type is on the second line for backfire mods
    if (secondLine.includes("// server")) {
      modType = "server";
    } else if (secondLine.includes("// client")) {
      modType = "client";
    } else if (secondLine.includes("// persistent")) {
      modType = "persistent";
    }
  } else {
    // Normal mod - type is on first line
    if (firstLine.includes("// server")) {
      modType = "server";
    } else if (firstLine.includes("// client")) {
      modType = "client";
    } else if (firstLine.includes("// persistent")) {
      modType = "persistent";
    }
  }

  // Validate generated code for syntax errors
  try {
    if (modType === "client") {
      // Client mods run directly
      new Function(code);
    } else if (modType === "server" || modType === "persistent") {
      // Server/persistent mods get an 'api' parameter
      new Function("api", code);
    }
  } catch (syntaxError) {
    console.error("Generated code has syntax errors:", syntaxError);
    console.error("Code:", code);
    throw new Error(`Generated code has syntax errors: ${syntaxError.message}`);
  }

  return { code, type: modType, backfire: isBackfire };
}

// Gemini API proxy endpoint for mod code generation with retry and fallback
app.post("/api/generate-mod", async (req, res) => {
  const requestId = `${Date.now()}-${Math.random()}`;
  performanceMonitor.startRequest(requestId, "/api/generate-mod");

  try {
    const { prompt } = req.body;

    if (!prompt) {
      performanceMonitor.endRequest(requestId, true);
      return res.status(400).json({ error: "Prompt is required" });
    }

    // Get Gemini API key from environment
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn(
        "GEMINI_API_KEY not configured - AI code generation disabled",
      );
      performanceMonitor.endRequest(requestId, true);
      return res.status(503).json({
        error:
          "AI code generation is not available. GEMINI_API_KEY environment variable is not set.",
      });
    }

    // 10% chance to request a backfire mod!
    const BACKFIRE_CHANCE = 0.1;
    let currentBackfireChance = BACKFIRE_CHANCE;
    let attempt = 1;
    let lastError = null;
    let result = null;

    // First attempt
    try {
      console.log(
        `🎲 Mod generation attempt ${attempt} (backfire chance: ${currentBackfireChance * 100}%)`,
      );
      result = await attemptModGeneration(
        prompt,
        currentBackfireChance,
        apiKey,
      );
    } catch (error) {
      lastError = error.message;
      console.error(`❌ Attempt ${attempt} failed:`, lastError);

      // Log first failure
      try {
        saveFailedMod(prompt, lastError, attempt, null);
      } catch (dbError) {
        console.error("Failed to save failed mod to database:", dbError);
      }

      // Second attempt with doubled backfire chance
      attempt = 2;
      currentBackfireChance = BACKFIRE_CHANCE * 2;
      console.log(
        `🔄 Retrying mod generation (attempt ${attempt}, backfire chance: ${currentBackfireChance * 100}%)`,
      );

      try {
        result = await attemptModGeneration(
          prompt,
          currentBackfireChance,
          apiKey,
        );
      } catch (error2) {
        lastError = error2.message;
        console.error(`❌ Attempt ${attempt} failed:`, lastError);

        // Log second failure
        try {
          saveFailedMod(prompt, lastError, attempt, null);
        } catch (dbError) {
          console.error("Failed to save failed mod to database:", dbError);
        }

        // Both attempts failed - fallback to random working mod
        console.log(
          "🎰 Both attempts failed, picking random working mod from database...",
        );
        const randomMod = getRandomWorkingMod();

        if (randomMod) {
          console.log(
            `✅ Using existing mod: ${randomMod.name} (type: ${randomMod.type})`,
          );
          result = {
            code: randomMod.code,
            type: randomMod.type,
            backfire: false,
            fallback: true,
            fallbackMessage:
              "⚠️ Generation failed - using a random existing mod instead!",
          };
        } else {
          // No working mods in database - final failure
          performanceMonitor.endRequest(requestId, true);
          return res.status(500).json({
            error: "Failed to generate mod",
            reason: lastError,
            userMessage:
              "The AI couldn't generate code and no fallback mods are available. Please try again.",
            canRetry: true,
          });
        }
      }
    }

    // Save successful generation to database
    if (result && !result.fallback) {
      try {
        const modName = `generated_${Date.now()}`;
        saveMod(modName, result.code, result.type, prompt, null);
      } catch (dbError) {
        console.error("Failed to save mod to database:", dbError);
        // Don't fail the request if database save fails
      }
    }

    performanceMonitor.endRequest(requestId);

    // Build response
    const apiResponse = {
      code: result.code,
      type: result.type,
      backfire: result.backfire,
    };

    if (result.backfire) {
      apiResponse.backfireMessage =
        "⚠️ Your mod BACKFIRED! Something went terribly wrong...";
      console.log(`🎲 Sending backfire mod to user: ${result.type}`);
    }

    if (result.fallback) {
      apiResponse.fallback = true;
      apiResponse.fallbackMessage = result.fallbackMessage;
    }

    if (attempt > 1 && !result.fallback) {
      apiResponse.retryMessage = `✅ Generation succeeded on attempt ${attempt}`;
    }

    res.json(apiResponse);
  } catch (error) {
    console.error("Error in /api/generate-mod:", error);
    performanceMonitor.endRequest(requestId, true);
    res.status(500).json({
      error: error.message || "Failed to generate code",
    });
  }
});

// API endpoint to get mod statistics
app.get("/api/mods/stats", (req, res) => {
  try {
    const stats = getModStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching mod stats:", error);
    res.status(500).json({ error: "Failed to fetch mod statistics" });
  }
});

// API endpoint to get all mods
app.get("/api/mods", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const mods = getAllMods(limit);
    res.json({ mods });
  } catch (error) {
    console.error("Error fetching mods:", error);
    res.status(500).json({ error: "Failed to fetch mods" });
  }
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
  warmupEndTime: null, // When warmup ends (null = not in warmup)
  countdownStartTime: null, // When 5 second countdown starts (null = not counting down)
  roundActive: false, // Is the round currently active (scoring enabled)
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
  SPAWN_INVULN_TIME: 10000, // ms
  SCORE_LIMIT: 15, // Round ends when a player reaches this kill count
  HEADSHOT_RADIUS_RATIO: 0.2, // Headshot zone is 20% of player radius (center 4px)
  HEADSHOT_DAMAGE_MULTIPLIER: 1.5, // Headshots deal 150% damage
  WARMUP_DURATION: 25000, // 25 seconds warmup period
  COUNTDOWN_DURATION: 5000, // 5 second countdown before round starts
};

// Sound detection ranges for bots
const SOUND_CONFIG = {
  GUNSHOT_RANGE: 600, // Bots can hear gunshots within this range
  FOOTSTEP_RANGE: 150, // Bots can hear footsteps within this range
  SOUND_LIFETIME: 500, // ms - how long a sound event lasts
};

// Weapon configs
const WEAPONS = {
  pistol: {
    damage: 20,
    rof: 6,
    mag: 12,
    reload: 1.2,
    range: 800,
    bloom: 0.02,
    projectileSpeed: 1200, // pixels per second
    // Bot tactical ranges
    optimalRange: { min: 100, max: 300 },
    minEngageRange: 50,
    maxEngageRange: 400,
  },
  smg: {
    damage: 12,
    rof: 12,
    mag: 30,
    reload: 1.8,
    range: 600,
    bloom: 0.05,
    projectileSpeed: 1000, // pixels per second - slightly slower
    // Bot tactical ranges - close to medium, aggressive
    optimalRange: { min: 80, max: 250 },
    minEngageRange: 40,
    maxEngageRange: 350,
  },
  shotgun: {
    damage: 8,
    pellets: 10,
    rof: 1.8,
    mag: 6,
    reload: 2.5,
    range: 550,
    spread: 0.08,
    projectileSpeed: 800, // pixels per second - slower shotgun pellets
    // Bot tactical ranges - improved medium-close range
    optimalRange: { min: 50, max: 250 },
    minEngageRange: 20,
    maxEngageRange: 350,
  },
  rifle: {
    damage: 35,
    rof: 3,
    mag: 20,
    reload: 1.7,
    range: 1200,
    bloom: 0.008,
    projectileSpeed: 1500, // pixels per second - fastest bullets
    wallPenetrationChance: 0.3, // 30% chance to penetrate walls
    // Bot tactical ranges - medium to long range
    optimalRange: { min: 200, max: 450 },
    minEngageRange: 100,
    maxEngageRange: 600,
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

// Function to try to purchase a mod for a bot
function tryPurchaseModForBot(bot) {
  // Only purchase if bot has enough credits
  if (bot.credits < 10) return false;

  // Get all client-side mods from database
  const allMods = getAllMods();
  const clientMods = allMods.filter((mod) => mod.type === "client");

  // Get mods the bot doesn't already have
  const availableToPurchase = clientMods.filter(
    (mod) => !bot.activeMods.includes(mod.id),
  );

  if (availableToPurchase.length === 0) return false;

  // Randomly select a mod (30% chance to purchase when checked)
  if (Math.random() > 0.3) return false;

  const selectedMod =
    availableToPurchase[Math.floor(Math.random() * availableToPurchase.length)];

  // Purchase the mod (assume cost of 10 credits)
  const modCost = 10;
  bot.credits -= modCost;
  bot.activeMods.push(selectedMod.id);

  console.log(
    `🤖 Bot ${bot.name} purchased ${selectedMod.name} (${bot.credits} credits remaining)`,
  );

  // Broadcast the mod activation to all clients
  io.emit("modActivated", {
    entityId: bot.id,
    entityName: bot.name,
    modId: selectedMod.id,
    modName: selectedMod.name,
    modCode: selectedMod.code,
  });

  return true;
}

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
  { x: 100, y: 100 }, // Top-left open area
  { x: 1900, y: 100 }, // Top-right open area
  { x: 100, y: 1900 }, // Bottom-left open area
  { x: 1900, y: 1900 }, // Bottom-right open area
  { x: 450, y: 1000 }, // Left center (away from corridors)
  { x: 1550, y: 1000 }, // Right center (away from corridors)
  { x: 1000, y: 450 }, // Top center (away from center structure)
  { x: 1000, y: 1550 }, // Bottom center (away from center structure)
  { x: 400, y: 400 }, // Near NW cover but clear
  { x: 1600, y: 400 }, // Near NE cover but clear
  { x: 400, y: 1600 }, // Near SW cover but clear
  { x: 1600, y: 1600 }, // Near SE cover but clear
];

// Strategic waypoints for bot patrol and map control
// Bots will hunt toward these high-value positions when not in combat
const STRATEGIC_WAYPOINTS = [
  // Center control (most important - center of map)
  { x: 1000, y: 1000, priority: 10, name: "Center" },

  // Corner control points (near cover and spawns)
  { x: 300, y: 300, priority: 8, name: "NW Corner" },
  { x: 1700, y: 300, priority: 8, name: "NE Corner" },
  { x: 300, y: 1700, priority: 8, name: "SW Corner" },
  { x: 1700, y: 1700, priority: 8, name: "SE Corner" },

  // Mid-map chokepoints (control corridors)
  { x: 700, y: 500, priority: 7, name: "West Corridor" },
  { x: 1300, y: 500, priority: 7, name: "East Corridor" },
  { x: 700, y: 1500, priority: 7, name: "South-West Corridor" },
  { x: 1300, y: 1500, priority: 7, name: "South-East Corridor" },

  // Flank routes (less priority but good for positioning)
  { x: 500, y: 1000, priority: 5, name: "West Flank" },
  { x: 1500, y: 1000, priority: 5, name: "East Flank" },
  { x: 1000, y: 500, priority: 5, name: "North Flank" },
  { x: 1000, y: 1500, priority: 5, name: "South Flank" },
];

// Get a strategic waypoint for bot to patrol toward
function getStrategicWaypoint(botX, botY) {
  // Filter out waypoints that are too close (< 200px)
  const validWaypoints = STRATEGIC_WAYPOINTS.filter((wp) => {
    const dx = wp.x - botX;
    const dy = wp.y - botY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist > 200; // Don't pick waypoints we're already at
  });

  if (validWaypoints.length === 0) return null;

  // Weight by priority, with some randomness
  const totalPriority = validWaypoints.reduce(
    (sum, wp) => sum + wp.priority,
    0,
  );
  let random = Math.random() * totalPriority;

  for (const wp of validWaypoints) {
    random -= wp.priority;
    if (random <= 0) {
      return wp;
    }
  }

  return validWaypoints[0];
}

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

  return distSquared < radius * radius;
}

// Find nearest cover (wall or crate) relative to enemy position
function findNearestCover(botX, botY, enemyX, enemyY, maxDist = 250) {
  let bestCover = null;
  let bestScore = -Infinity;

  const allObstacles = [
    ...WALLS,
    ...CRATES.map((c) => ({ x: c.x, y: c.y, width: c.size, height: c.size })),
  ];

  for (const obstacle of allObstacles) {
    const coverX = obstacle.x + obstacle.width / 2;
    const coverY = obstacle.y + obstacle.height / 2;

    // Distance from bot to cover
    const distToCover = Math.sqrt((coverX - botX) ** 2 + (coverY - botY) ** 2);
    if (distToCover > maxDist || distToCover < 50) continue;

    // Check if cover is between bot and enemy
    const coverToEnemyDist = Math.sqrt(
      (enemyX - coverX) ** 2 + (enemyY - coverY) ** 2,
    );
    const botToEnemyDist = Math.sqrt(
      (enemyX - botX) ** 2 + (enemyY - botY) ** 2,
    );

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
    if (
      circleRectCollision(x, y, radius, wall.x, wall.y, wall.width, wall.height)
    ) {
      return true;
    }
  }

  // Check crates
  for (const crate of CRATES) {
    if (
      circleRectCollision(
        x,
        y,
        radius,
        crate.x,
        crate.y,
        crate.size,
        crate.size,
      )
    ) {
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
    const dist = rayRectIntersection(
      x1,
      y1,
      rayDx,
      rayDy,
      distance,
      wall.x,
      wall.y,
      wall.width,
      wall.height,
    );
    if (dist !== null && dist < distance) {
      return false; // Wall blocks line of sight
    }
  }

  // Check crates
  for (const crate of CRATES) {
    const dist = rayRectIntersection(
      x1,
      y1,
      rayDx,
      rayDy,
      distance,
      crate.x,
      crate.y,
      crate.size,
      crate.size,
    );
    if (dist !== null && dist < distance) {
      return false; // Crate blocks line of sight
    }
  }

  return true; // Clear line of sight
}

// Check if target is behind exactly one wall (for rifle wall penetration)
// Returns { canShootThrough: true, target, distance } if viable, null otherwise
function canShootThroughWall(botX, botY, targetX, targetY, maxRange) {
  const dx = targetX - botX;
  const dy = targetY - botY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 1 || distance > maxRange) return null;

  const angle = Math.atan2(dy, dx);
  const rayDx = Math.cos(angle);
  const rayDy = Math.sin(angle);

  let wallCount = 0;
  let closestWallDist = Infinity;

  // Count walls blocking line of sight
  for (const wall of WALLS) {
    const dist = rayRectIntersection(
      botX,
      botY,
      rayDx,
      rayDy,
      distance,
      wall.x,
      wall.y,
      wall.width,
      wall.height,
    );
    if (dist !== null && dist < distance) {
      wallCount++;
      closestWallDist = Math.min(closestWallDist, dist);
      if (wallCount > 1) return null; // More than one wall - can't penetrate
    }
  }

  // Check crates - treat them as un-penetrable
  for (const crate of CRATES) {
    const dist = rayRectIntersection(
      botX,
      botY,
      rayDx,
      rayDy,
      distance,
      crate.x,
      crate.y,
      crate.size,
      crate.size,
    );
    if (dist !== null && dist < distance) {
      return null; // Crate blocks - can't penetrate crates
    }
  }

  // Exactly one wall blocking? That's shootable with rifle!
  if (wallCount === 1) {
    return {
      canShootThrough: true,
      distance: distance,
      wallDistance: closestWallDist,
    };
  }

  return null; // No walls or too many walls
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
  gameState.soundEvents = gameState.soundEvents.filter(
    (event) => event.expiresAt > now,
  );
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
  "TargetBot",
  "PracticeBot",
  "TestDummy",
  "TrainingBot",
  "AIBot",
  "BotAlpha",
  "BotBravo",
  "BotCharlie",
  "BotDelta",
  "BotEcho",
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
    credits: 0,
    activeMods: [],
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
    // Position tracking to detect getting stuck in areas
    areaCheckTimer: Date.now(),
    lastAreaCheckPos: { x: spawn.x, y: spawn.y },
    totalDistanceMoved: 0,
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
    console.log(
      `🤖 Adding ${botsToAdd} bots (${humanPlayers} humans, ${currentBots} bots -> ${neededBots} needed)`,
    );
    for (let i = 0; i < botsToAdd; i++) {
      createBot();
    }
  } else if (botsToAdd < 0) {
    // Need to remove bots
    const botsToRemove = Math.abs(botsToAdd);
    console.log(
      `🤖 Removing ${botsToRemove} bots (${humanPlayers} humans, ${currentBots} bots -> ${neededBots} needed)`,
    );
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
    credits: 0,
    activeMods: [],
    lastShot: 0,
    reloading: false,
    reloadFinish: 0,
    invulnerable: Date.now() + GAME_CONFIG.SPAWN_INVULN_TIME,
    respawnAt: null,
    lastFootstepSound: 0,
  };
}

// Start warmup period
function startWarmup() {
  const now = Date.now();
  gameState.warmupEndTime = now + GAME_CONFIG.WARMUP_DURATION;
  gameState.roundActive = false;

  console.log(`🔥 WARMUP STARTED - 25 seconds`);

  // Notify all clients that warmup has started
  io.emit("warmupStart", {
    duration: GAME_CONFIG.WARMUP_DURATION,
    endTime: gameState.warmupEndTime,
  });
}

// Start countdown (after warmup ends)
function startCountdown() {
  const now = Date.now();
  gameState.countdownStartTime = now;

  console.log(`⏱️  COUNTDOWN STARTED - 5 seconds`);

  // Kill all players and respawn them
  for (const [id, player] of gameState.players) {
    player.health = 0;
    player.respawnAt = now + 100; // Respawn almost immediately
  }

  for (const [id, bot] of gameState.bots) {
    bot.health = 0;
    bot.respawnAt = now + 100; // Respawn almost immediately
  }

  // Notify all clients that countdown has started
  io.emit("countdownStart", {
    duration: GAME_CONFIG.COUNTDOWN_DURATION,
  });

  // After 5 seconds, start the actual round
  setTimeout(() => {
    gameState.roundActive = true;
    gameState.countdownStartTime = null;
    console.log(`🎮 ROUND ACTIVE - scoring enabled`);

    io.emit("roundStart");
  }, GAME_CONFIG.COUNTDOWN_DURATION);
}

// Reset round - clears all scores and respawns everyone
function resetRound(winnerId, winnerName) {
  console.log(
    `🏆 ROUND OVER! Winner: ${winnerName} with ${GAME_CONFIG.SCORE_LIMIT} kills`,
  );

  // Announce winner to all clients
  io.emit("roundOver", {
    winnerId,
    winnerName,
    scoreLimit: GAME_CONFIG.SCORE_LIMIT,
  });

  // Reset all player scores
  for (const [id, player] of gameState.players) {
    player.kills = 0;
    player.deaths = 0;
  }

  // Reset all bot scores
  for (const [id, bot] of gameState.bots) {
    bot.kills = 0;
    bot.deaths = 0;
  }

  console.log(`🔄 Round reset - all scores cleared`);

  // Start warmup period after a short delay
  setTimeout(() => {
    startWarmup();
  }, 3000);
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

  // Track damage for performance metrics
  performanceMonitor.recordDamage(damage);

  if (player.health <= 0) {
    // Only count kills/deaths if round is active (not during warmup)
    if (gameState.roundActive) {
      player.deaths++;

      // Track death for performance metrics
      performanceMonitor.recordDeath();
      if (attackerId && attackerId !== player.id) {
        // Check if attacker is a player
        const attacker = gameState.players.get(attackerId);
        if (attacker) {
          attacker.kills++;

          // Award credits for kill (base: 5 credits)
          attacker.credits += 5;

          // Track kill for performance metrics
          performanceMonitor.recordKill();

          // Check if attacker reached score limit
          if (attacker.kills >= GAME_CONFIG.SCORE_LIMIT) {
            // Reset round after a short delay (3 seconds)
            setTimeout(() => {
              resetRound(attacker.id, attacker.name);
            }, 3000);
          }
        } else {
          // Check if attacker is a bot
          const botAttacker = gameState.bots.get(attackerId);
          if (botAttacker) {
            botAttacker.kills++;

            // Award credits for kill (base: 5 credits)
            botAttacker.credits += 5;

            // Track kill for performance metrics
            performanceMonitor.recordKill();

            // Check if bot reached score limit
            if (botAttacker.kills >= GAME_CONFIG.SCORE_LIMIT) {
              // Reset round after a short delay (3 seconds)
              setTimeout(() => {
                resetRound(botAttacker.id, botAttacker.name);
              }, 3000);
            }
          }
        }
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
    const dist = rayRectIntersection(
      x,
      y,
      rayDx,
      rayDy,
      range,
      wall.x,
      wall.y,
      wall.width,
      wall.height,
    );
    if (dist !== null && dist < closestDist) {
      closestDist = dist;
      closestHit = { wall: true, distance: dist };
    }
  }

  // Check crate collisions
  for (const crate of CRATES) {
    const dist = rayRectIntersection(
      x,
      y,
      rayDx,
      rayDy,
      range,
      crate.x,
      crate.y,
      crate.size,
      crate.size,
    );
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

// Performance monitoring WebSocket namespace
const performanceIO = io.of("/performance");
performanceIO.on("connection", (socket) => {
  console.log("Performance monitor connected:", socket.id);

  // Send initial metrics
  socket.emit("metrics", performanceMonitor.getMetrics());

  socket.on("disconnect", () => {
    console.log("Performance monitor disconnected:", socket.id);
  });
});

// Broadcast metrics to all performance monitors every second
setInterval(() => {
  const metrics = performanceMonitor.getMetrics();
  performanceIO.emit("metrics", metrics);
}, 1000);

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

      // Freeze players during countdown (but allow them to aim)
      if (gameState.countdownStartTime !== null) {
        player.vx = 0;
        player.vy = 0;
      } else {
        // Movement
        const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);

        if (moveX !== 0 || moveY !== 0) {
          // End spawn protection when moving
          if (player.invulnerable > Date.now()) {
            player.invulnerable = 0;
          }

          const mag = Math.sqrt(moveX * moveX + moveY * moveY);
          player.vx = (moveX / mag) * GAME_CONFIG.PLAYER_SPEED;
          player.vy = (moveY / mag) * GAME_CONFIG.PLAYER_SPEED;
        } else {
          player.vx = 0;
          player.vy = 0;
        }
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

  socket.on("spectate", () => {
    try {
      const player = gameState.players.get(socket.id);
      if (player) {
        console.log(
          `👻 Player ${player.name} (${socket.id}) switching to spectator mode`,
        );

        // Remove player from game without marking as disconnect
        gameState.players.delete(socket.id);
        io.emit("playerLeft", socket.id);

        // Maintain bot count (spawn bots if needed)
        maintainBotCount();

        // Broadcast updated player count
        io.emit("playerCount", gameState.players.size + gameState.bots.size);
      }
    } catch (error) {
      console.error("❌ Error in spectate handler:", error);
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

  // Server-side mod execution
  socket.on("executeServerMod", (data) => {
    try {
      const { code, name } = data;
      const playerId = socket.id;
      const player = gameState.players.get(playerId);
      const isSpectator = !player;

      if (isSpectator) {
        console.log(
          `👻 Spectator ${socket.id} executing server mod: ${name || "unnamed"}`,
        );
      } else {
        console.log(`🔧 Executing server mod for ${player.name}`);
      }

      // Save server mod to database
      try {
        const modName = name || `server_${Date.now()}`;
        saveMod(modName, code, "server", null, playerId);
      } catch (dbError) {
        console.error("Failed to save server mod to database:", dbError);
        // Don't fail the request if database save fails
      }

      // Create server mod API available to mod code
      const serverModAPI = {
        // Current player ID (the one executing the mod)
        myId: playerId,

        // Spectator status - true if the user is spectating, false if actively playing
        isSpectator: isSpectator,

        // Game state access (read-only references)
        getGameState: () => ({
          players: Array.from(gameState.players.values()),
          bots: Array.from(gameState.bots.values()),
          projectiles: gameState.projectiles,
          pickups: gameState.pickups,
        }),

        // Player manipulation
        setHealth: (targetId, health) => {
          const target =
            gameState.players.get(targetId) || gameState.bots.get(targetId);
          if (target) {
            target.health = Math.max(
              0,
              Math.min(GAME_CONFIG.PLAYER_MAX_HEALTH, health),
            );
            console.log(`❤️ Set health of ${target.name} to ${target.health}`);
            return true;
          }
          return false;
        },

        setArmor: (targetId, armor) => {
          const target =
            gameState.players.get(targetId) || gameState.bots.get(targetId);
          if (target) {
            target.armor = Math.max(0, Math.min(100, armor));
            console.log(`🛡️ Set armor of ${target.name} to ${target.armor}`);
            return true;
          }
          return false;
        },

        teleportPlayer: (targetId, x, y) => {
          const target =
            gameState.players.get(targetId) || gameState.bots.get(targetId);
          if (target) {
            target.x = Math.max(0, Math.min(GAME_CONFIG.WORLD_WIDTH, x));
            target.y = Math.max(0, Math.min(GAME_CONFIG.WORLD_HEIGHT, y));
            console.log(
              `📍 Teleported ${target.name} to (${target.x}, ${target.y})`,
            );
            return true;
          }
          return false;
        },

        giveWeapon: (targetId, weapon) => {
          const target =
            gameState.players.get(targetId) || gameState.bots.get(targetId);
          if (target && WEAPONS[weapon]) {
            target.weapon = weapon;
            target.ammo = WEAPONS[weapon].mag;
            target.maxAmmo = WEAPONS[weapon].mag;
            target.reloading = false;
            console.log(`🔫 Gave ${weapon} to ${target.name}`);
            return true;
          }
          return false;
        },

        spawnPickup: (x, y, type) => {
          if (!PICKUP_TYPES[type]) return false;

          gameState.pickups.push({
            id: gameState.nextPickupId++,
            x: Math.max(0, Math.min(GAME_CONFIG.WORLD_WIDTH, x)),
            y: Math.max(0, Math.min(GAME_CONFIG.WORLD_HEIGHT, y)),
            type,
            active: true,
            respawnAt: null,
          });
          console.log(`📦 Spawned pickup ${type} at (${x}, ${y})`);
          return true;
        },

        killPlayer: (targetId) => {
          const target =
            gameState.players.get(targetId) || gameState.bots.get(targetId);
          if (target && target.health > 0) {
            target.health = 0;
            target.deaths++;
            target.respawnAt = Date.now() + GAME_CONFIG.RESPAWN_DELAY;
            console.log(`💀 Killed ${target.name}`);
            return true;
          }
          return false;
        },

        getAllPlayers: () => {
          return [
            ...Array.from(gameState.players.values()),
            ...Array.from(gameState.bots.values()),
          ];
        },

        // Utility functions
        log: (...args) => {
          console.log(`[Server Mod]`, ...args);
        },

        broadcast: (message) => {
          io.emit("serverModMessage", { message });
        },
      };

      // Execute the mod code in a safe context
      // Wrap code in a function that receives the API
      const modFunction = new Function("api", code);
      const result = modFunction(serverModAPI);

      socket.emit("serverModResult", {
        success: true,
        result:
          result !== undefined ? String(result) : "Mod executed successfully",
      });

      if (isSpectator) {
        console.log(
          `✅ Server mod executed successfully for spectator ${socket.id}`,
        );
      } else {
        console.log(`✅ Server mod executed successfully for ${player.name}`);
      }
    } catch (error) {
      console.error("❌ Error executing server mod:", error);
      socket.emit("serverModResult", {
        error: error.message,
        stack: error.stack,
      });
    }
  });

  // Track client-side mods
  socket.on("saveClientMod", (data) => {
    try {
      const { name, code } = data;
      const playerId = socket.id;

      // Save client mod to database
      saveMod(name, code, "client", null, playerId);
      console.log(`💾 Saved client mod "${name}" for player ${playerId}`);
    } catch (error) {
      console.error("Failed to save client mod:", error);
    }
  });

  // Activate persistent mod that runs every game tick
  socket.on("activatePersistentMod", (data) => {
    try {
      const { code, durationMs, name, description } = data;
      const playerId = socket.id;
      const player = gameState.players.get(playerId);
      const isSpectator = !player;

      // Validate duration (max 5 minutes = 300000ms)
      const maxDuration = 300000;
      const duration = Math.min(durationMs || 60000, maxDuration);

      if (isSpectator) {
        console.log(
          `👻 Activating persistent mod for spectator ${socket.id} (${duration / 1000}s)`,
        );
      } else {
        console.log(
          `⚡ Activating persistent mod for ${player.name} (${duration / 1000}s)`,
        );
      }

      // Add to active mods database
      const modId = addActiveMod(
        playerId,
        code,
        duration,
        name || `persistent_${Date.now()}`,
        description,
      );

      socket.emit("persistentModResult", {
        success: true,
        modId: modId,
        duration: duration,
        message: `Persistent mod activated for ${duration / 1000} seconds`,
      });

      if (isSpectator) {
        console.log(
          `✅ Persistent mod ${modId} activated for spectator ${socket.id}, expires in ${duration / 1000}s`,
        );
      } else {
        console.log(
          `✅ Persistent mod ${modId} activated for ${player.name}, expires in ${duration / 1000}s`,
        );
      }
    } catch (error) {
      console.error("❌ Error activating persistent mod:", error);
      socket.emit("persistentModResult", {
        error: error.message,
        stack: error.stack,
      });
    }
  });
});

// Handle shooting - creates projectiles instead of instant hitscan
function handleShoot(player) {
  // End spawn protection when shooting
  if (player.invulnerable > Date.now()) {
    player.invulnerable = 0;
  }

  if (player.reloading) return;
  if (player.ammo <= 0) {
    // Emit out of ammo click event
    io.emit("outOfAmmo", {
      playerId: player.id,
      x: player.x,
      y: player.y,
      weapon: player.weapon,
    });
    return;
  }

  const weapon = WEAPONS[player.weapon];
  const now = Date.now();
  const cooldown = 1000 / weapon.rof;

  if (now - player.lastShot < cooldown) return;

  player.lastShot = now;
  player.ammo--;

  // Handle different weapon types
  if (player.weapon === "shotgun") {
    // Shotgun fires multiple projectile pellets
    for (let i = 0; i < weapon.pellets; i++) {
      const spread = (Math.random() - 0.5) * weapon.spread * 2;
      const angle = player.aimAngle + spread;

      // Create projectile
      createProjectile(
        player.x,
        player.y,
        angle,
        weapon,
        player.id,
        player.weapon,
      );
    }
  } else {
    // Other weapons fire single projectile
    const bloom = (Math.random() - 0.5) * weapon.bloom * 2;
    const angle = player.aimAngle + bloom;

    // Create projectile
    createProjectile(
      player.x,
      player.y,
      angle,
      weapon,
      player.id,
      player.weapon,
    );
  }

  io.emit("shoot", {
    playerId: player.id,
    x: player.x,
    y: player.y,
    angle: player.aimAngle,
    weapon: player.weapon,
  });

  // Create gunshot sound event for bots to hear
  createSoundEvent(player.x, player.y, "gunshot", player.id);
}

// Create a projectile
function createProjectile(x, y, angle, weapon, shooterId, weaponName) {
  const projectile = {
    id: gameState.nextProjectileId++,
    x,
    y,
    vx: Math.cos(angle) * weapon.projectileSpeed,
    vy: Math.sin(angle) * weapon.projectileSpeed,
    angle,
    damage: weapon.damage,
    shooterId,
    weapon: weapon,
    weaponName: weaponName,
    distanceTraveled: 0,
    maxRange: weapon.range,
    hasPenetrated: false, // Track if this projectile has already penetrated a wall
  };

  gameState.projectiles.push(projectile);
}

// Game loop
const TICK_INTERVAL = 1000 / GAME_CONFIG.TICK_RATE;
const STATE_BROADCAST_INTERVAL = 1000 / 30; // Broadcast state 30 times per second
let lastTick = Date.now();
let lastStateBroadcast = Date.now();

// Execute active persistent mods every game tick
function executeActiveMods(now) {
  try {
    const activeMods = getActiveMods();

    for (const mod of activeMods) {
      try {
        // Create mod API for persistent mods
        const modAPI = {
          // Player access
          getPlayer: (playerId) => {
            return (
              gameState.players.get(playerId) || gameState.bots.get(playerId)
            );
          },

          // Get the player who created this mod
          getMyPlayer: () => {
            return (
              gameState.players.get(mod.player_id) ||
              gameState.bots.get(mod.player_id)
            );
          },

          // Manipulation functions
          setHealth: (targetId, health) => {
            const target =
              gameState.players.get(targetId) || gameState.bots.get(targetId);
            if (target) {
              target.health = Math.max(
                0,
                Math.min(GAME_CONFIG.PLAYER_MAX_HEALTH, health),
              );
              return true;
            }
            return false;
          },

          setArmor: (targetId, armor) => {
            const target =
              gameState.players.get(targetId) || gameState.bots.get(targetId);
            if (target) {
              target.armor = Math.max(0, Math.min(100, armor));
              return true;
            }
            return false;
          },

          setInvulnerable: (targetId, invulnerable) => {
            const target =
              gameState.players.get(targetId) || gameState.bots.get(targetId);
            if (target) {
              // Set invulnerable to far future or 0
              target.invulnerable = invulnerable
                ? now + 999999999
                : Math.min(target.invulnerable, now);
              return true;
            }
            return false;
          },

          teleport: (targetId, x, y) => {
            const target =
              gameState.players.get(targetId) || gameState.bots.get(targetId);
            if (target) {
              target.x = Math.max(0, Math.min(GAME_CONFIG.WORLD_WIDTH, x));
              target.y = Math.max(0, Math.min(GAME_CONFIG.WORLD_HEIGHT, y));
              return true;
            }
            return false;
          },

          // Utility
          now: now,
          dt: (now - lastTick) / 1000,
        };

        // Execute the mod code
        const modFunction = new Function("api", mod.code);
        modFunction(modAPI);
      } catch (error) {
        console.error(`❌ Error executing active mod ${mod.id}:`, error);
        // Don't remove the mod, just log the error and continue
      }
    }
  } catch (error) {
    console.error("❌ Error in executeActiveMods:", error);
  }
}

function gameLoop() {
  const tickStartTime = Date.now();

  try {
    const now = Date.now();
    const dt = (now - lastTick) / 1000; // seconds
    lastTick = now;

    // Check warmup timer
    if (gameState.warmupEndTime && now >= gameState.warmupEndTime) {
      gameState.warmupEndTime = null;
      startCountdown();
    }

    // Clean up expired sound events
    cleanupSoundEvents();

    // Update projectiles
    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
      const proj = gameState.projectiles[i];

      // Move projectile
      const moveDistance =
        Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy) * dt;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.distanceTraveled += moveDistance;

      // Check if projectile exceeded max range
      if (proj.distanceTraveled >= proj.maxRange) {
        gameState.projectiles.splice(i, 1);
        continue;
      }

      // Projectile radius for collision (small)
      const PROJECTILE_RADIUS = 3;

      let hitSomething = false;

      // Check wall collisions
      for (const wall of WALLS) {
        if (
          circleRectCollision(
            proj.x,
            proj.y,
            PROJECTILE_RADIUS,
            wall.x,
            wall.y,
            wall.width,
            wall.height,
          )
        ) {
          // Check if rifle can penetrate wall
          const isRifle = proj.weaponName === "rifle";
          const canPenetrate =
            isRifle &&
            !proj.hasPenetrated &&
            proj.weapon.wallPenetrationChance &&
            Math.random() < proj.weapon.wallPenetrationChance;

          if (canPenetrate) {
            // Rifle penetrates the wall!
            proj.hasPenetrated = true;
            // Reduce damage after penetration
            proj.damage = Math.floor(proj.damage * 0.7);
            // Create penetration effect
            io.emit("wallPenetration", {
              x: proj.x,
              y: proj.y,
              angle: proj.angle,
            });
            // Continue through the wall
            break;
          } else {
            // Hit wall - create wall impact
            io.emit("wallImpact", {
              x: proj.x,
              y: proj.y,
              angle: proj.angle,
            });
            hitSomething = true;
            break;
          }
        }
      }

      if (hitSomething) {
        gameState.projectiles.splice(i, 1);
        continue;
      }

      // Check crate collisions
      for (const crate of CRATES) {
        if (
          circleRectCollision(
            proj.x,
            proj.y,
            PROJECTILE_RADIUS,
            crate.x,
            crate.y,
            crate.size,
            crate.size,
          )
        ) {
          // Hit crate - create wall impact
          io.emit("wallImpact", {
            x: proj.x,
            y: proj.y,
            angle: proj.angle,
          });
          hitSomething = true;
          break;
        }
      }

      if (hitSomething) {
        gameState.projectiles.splice(i, 1);
        continue;
      }

      // Check player collisions
      for (const [id, player] of gameState.players) {
        if (id === proj.shooterId || player.health <= 0) continue;

        const dx = player.x - proj.x;
        const dy = player.y - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < GAME_CONFIG.PLAYER_RADIUS + PROJECTILE_RADIUS) {
          // Hit player - check if headshot
          const headshotRadius =
            GAME_CONFIG.PLAYER_RADIUS * GAME_CONFIG.HEADSHOT_RADIUS_RATIO;
          const isHeadshot = dist <= headshotRadius;
          const finalDamage = isHeadshot
            ? proj.damage * GAME_CONFIG.HEADSHOT_DAMAGE_MULTIPLIER
            : proj.damage;

          const killed = damagePlayer(player, finalDamage, proj.shooterId);
          io.emit("hit", {
            shooterId: proj.shooterId,
            targetId: player.id,
            damage: finalDamage,
            headshot: isHeadshot,
            killed,
          });
          hitSomething = true;
          break;
        }
      }

      if (hitSomething) {
        gameState.projectiles.splice(i, 1);
        continue;
      }

      // Check bot collisions
      for (const [id, bot] of gameState.bots) {
        if (id === proj.shooterId || bot.health <= 0) continue;

        const dx = bot.x - proj.x;
        const dy = bot.y - proj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < GAME_CONFIG.PLAYER_RADIUS + PROJECTILE_RADIUS) {
          // Hit bot - check if headshot
          const headshotRadius =
            GAME_CONFIG.PLAYER_RADIUS * GAME_CONFIG.HEADSHOT_RADIUS_RATIO;
          const isHeadshot = dist <= headshotRadius;
          const finalDamage = isHeadshot
            ? proj.damage * GAME_CONFIG.HEADSHOT_DAMAGE_MULTIPLIER
            : proj.damage;

          const killed = damagePlayer(bot, finalDamage, proj.shooterId);
          io.emit("hit", {
            shooterId: proj.shooterId,
            targetId: bot.id,
            damage: finalDamage,
            headshot: isHeadshot,
            killed,
          });
          hitSomething = true;
          break;
        }
      }

      if (hitSomething) {
        gameState.projectiles.splice(i, 1);
        continue;
      }
    }

    // Update bots AI
    for (const [id, bot] of gameState.bots) {
      // Track current target info (persists outside think block for area check)
      let nearestTarget = bot.currentTarget || null;
      let nearestDist = bot.currentTargetDist || Infinity;

      if (bot.health <= 0) {
        // Handle bot respawn
        if (bot.respawnAt && now >= bot.respawnAt) {
          const spawn = getSpawnPoint(gameState.players);
          bot.x = spawn.x;
          bot.y = spawn.y;
          bot.health = GAME_CONFIG.PLAYER_MAX_HEALTH;
          bot.armor = GAME_CONFIG.PLAYER_START_ARMOR;
          bot.weapon = "pistol";
          bot.ammo = WEAPONS.pistol.mag;
          bot.maxAmmo = WEAPONS.pistol.mag;
          bot.invulnerable = now + GAME_CONFIG.SPAWN_INVULN_TIME;
          bot.respawnAt = null;
          bot.reloading = false;
          bot.wanderAngle = Math.random() * Math.PI * 2;
          bot.currentTarget = null;
          bot.currentTargetDist = Infinity;
        }
        continue;
      }

      // Simple bot AI - think every 200ms
      if (now > bot.thinkTimer) {
        bot.thinkTimer = now + 200;

        // Try to purchase a mod if bot has enough credits
        tryPurchaseModForBot(bot);

        // LISTEN for sounds (gunshots and footsteps)
        let heardGunshot = null;
        for (const sound of gameState.soundEvents) {
          if (sound.sourceId === id) continue; // Don't hear own sounds

          const dx = sound.x - bot.x;
          const dy = sound.y - bot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Check if sound is within hearing range
          const hearingRange =
            sound.type === "gunshot"
              ? SOUND_CONFIG.GUNSHOT_RANGE
              : SOUND_CONFIG.FOOTSTEP_RANGE;

          if (dist < hearingRange) {
            // Prioritize gunshots over footsteps
            if (sound.type === "gunshot") {
              if (!heardGunshot || dist < heardGunshot.dist) {
                heardGunshot = {
                  x: sound.x,
                  y: sound.y,
                  dist,
                  type: sound.type,
                };
              }
            }
          }
        }

        // Gunshots always override current investigation
        if (heardGunshot) {
          bot.lastHeardSound = heardGunshot;
        }

        // Assess bot state for decision making
        const healthPercent = bot.health / GAME_CONFIG.PLAYER_MAX_HEALTH;
        const isLowHealth = healthPercent < 0.35; // More aggressive threshold
        const hasArmor = bot.armor > 20; // Lower armor threshold for aggression
        const isAggressive = hasArmor || healthPercent > 0.6; // More likely to be aggressive

        // Find nearest VISIBLE target (human players or other bots)
        let nearestTarget = null;
        let nearestDist = Infinity;
        const VISION_RANGE = 900; // Increased from 600 for more action

        // Also track nearest target behind wall (for rifle wall penetration)
        let nearestBehindWall = null;
        let nearestBehindWallDist = Infinity;
        let wallPenetrationInfo = null;

        // Check human players - only if bot can see them
        for (const player of gameState.players.values()) {
          if (player.health <= 0) continue;
          const dx = player.x - bot.x;
          const dy = player.y - bot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Check if visible
          if (
            dist < VISION_RANGE &&
            hasLineOfSight(bot.x, bot.y, player.x, player.y)
          ) {
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestTarget = player;
            }
          }
          // Check if behind single wall (for rifle penetration)
          else if (dist < VISION_RANGE && bot.weapon === "rifle") {
            const penetrationCheck = canShootThroughWall(
              bot.x,
              bot.y,
              player.x,
              player.y,
              VISION_RANGE,
            );
            if (penetrationCheck && dist < nearestBehindWallDist) {
              nearestBehindWallDist = dist;
              nearestBehindWall = player;
              wallPenetrationInfo = penetrationCheck;
            }
          }
        }

        // Check other bots - only if bot can see them
        for (const [otherId, otherBot] of gameState.bots) {
          if (otherId === id || otherBot.health <= 0) continue;
          const dx = otherBot.x - bot.x;
          const dy = otherBot.y - bot.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Check if visible
          if (
            dist < VISION_RANGE &&
            hasLineOfSight(bot.x, bot.y, otherBot.x, otherBot.y)
          ) {
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestTarget = otherBot;
            }
          }
          // Check if behind single wall (for rifle penetration)
          else if (dist < VISION_RANGE && bot.weapon === "rifle") {
            const penetrationCheck = canShootThroughWall(
              bot.x,
              bot.y,
              otherBot.x,
              otherBot.y,
              VISION_RANGE,
            );
            if (penetrationCheck && dist < nearestBehindWallDist) {
              nearestBehindWallDist = dist;
              nearestBehindWall = otherBot;
              wallPenetrationInfo = penetrationCheck;
            }
          }
        }

        // Remember last known enemy position for hunting
        if (nearestTarget) {
          bot.lastKnownEnemy = {
            x: nearestTarget.x,
            y: nearestTarget.y,
            time: now,
          };
        } else if (nearestBehindWall) {
          // Also remember enemies behind walls
          bot.lastKnownEnemy = {
            x: nearestBehindWall.x,
            y: nearestBehindWall.y,
            time: now,
            behindWall: true,
          };
        }

        // BEHAVIOR: Low health - retreat to find health
        if (isLowHealth && !nearestTarget) {
          const healthPickup = findBestPickup(bot);
          if (healthPickup && healthPickup.type.startsWith("health")) {
            const dx = healthPickup.x - bot.x;
            const dy = healthPickup.y - bot.y;
            const distToHealth = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            // Move fast and directly when health is close and visible
            if (
              distToHealth < 200 &&
              hasLineOfSight(bot.x, bot.y, healthPickup.x, healthPickup.y)
            ) {
              const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.85;
              bot.vx = Math.cos(angle) * moveSpeed;
              bot.vy = Math.sin(angle) * moveSpeed;
              bot.aimAngle = angle;
            } else {
              // Navigate around obstacles to reach health
              const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.75;
              bot.vx = Math.cos(angle) * moveSpeed;
              bot.vy = Math.sin(angle) * moveSpeed;
              bot.aimAngle = angle;
              bot.wanderAngle = angle; // Help wall sliding continue in right direction
            }
          } else {
            // No health nearby, just retreat from last known danger
            if (bot.lastHeardSound) {
              const dx = bot.x - bot.lastHeardSound.x;
              const dy = bot.y - bot.lastHeardSound.y;
              const retreatAngle = Math.atan2(dy, dx);
              const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.7;
              bot.vx = Math.cos(retreatAngle) * moveSpeed;
              bot.vy = Math.sin(retreatAngle) * moveSpeed;
              bot.aimAngle = retreatAngle + Math.PI; // Look behind while retreating
            }
          }
        }
        // BEHAVIOR: Low health WITH visible target - engage defensively
        else if (isLowHealth && nearestTarget) {
          const dx = nearestTarget.x - bot.x;
          const dy = nearestTarget.y - bot.y;
          bot.aimAngle = Math.atan2(dy, dx);

          // Keep distance and retreat while shooting
          const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.6;
          bot.vx = -Math.cos(bot.aimAngle) * moveSpeed;
          bot.vy = -Math.sin(bot.aimAngle) * moveSpeed;

          // Shoot if in range
          if (nearestDist <= 400 && Math.random() < 0.4) {
            if (
              hasLineOfSight(bot.x, bot.y, nearestTarget.x, nearestTarget.y)
            ) {
              handleShoot(bot);
            }
          }
        }
        // BEHAVIOR: Target in range, engage tactically
        else if (nearestTarget) {
          // Get weapon-specific tactical ranges
          const weaponData = WEAPONS[bot.weapon];
          const canEngage = nearestDist <= weaponData.maxEngageRange;

          if (canEngage) {
            const dx = nearestTarget.x - bot.x;
            const dy = nearestTarget.y - bot.y;
            bot.aimAngle = Math.atan2(dy, dx);

            // Weapon-specific combat ranges
            const optimalMin = weaponData.optimalRange.min;
            const optimalMax = weaponData.optimalRange.max;
            const minRange = weaponData.minEngageRange;

            // Adjust ranges based on aggression
            const aggressionFactor = isAggressive ? 0.8 : 1.0;
            const effectiveOptimalMin = optimalMin * aggressionFactor;
            const effectiveOptimalMax = optimalMax * aggressionFactor;

            // Movement logic based on weapon and distance
            if (nearestDist < minRange) {
              // Too close - back away while shooting
              const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.65;
              bot.vx = -Math.cos(bot.aimAngle) * moveSpeed;
              bot.vy = -Math.sin(bot.aimAngle) * moveSpeed;
            } else if (nearestDist < effectiveOptimalMin) {
              // Approaching optimal range - back up slightly
              const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.5;
              bot.vx = -Math.cos(bot.aimAngle) * moveSpeed;
              bot.vy = -Math.sin(bot.aimAngle) * moveSpeed;
            } else if (nearestDist > effectiveOptimalMax) {
              // Too far - move closer aggressively
              const moveSpeed =
                GAME_CONFIG.PLAYER_SPEED * (isAggressive ? 0.75 : 0.6);
              bot.vx = Math.cos(bot.aimAngle) * moveSpeed;
              bot.vy = Math.sin(bot.aimAngle) * moveSpeed;
            } else {
              // In optimal range - strafe perpendicular to enemy
              const strafeAngle = bot.aimAngle + Math.PI / 2;
              // Strafe consistently in one direction until changing
              if (!bot.strafeDir || Math.random() < 0.05) {
                bot.strafeDir = Math.random() > 0.5 ? 1 : -1;
              }
              const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.5;
              bot.vx = Math.cos(strafeAngle) * moveSpeed * bot.strafeDir;
              bot.vy = Math.sin(strafeAngle) * moveSpeed * bot.strafeDir;
            }

            // Shoot when in effective range - very aggressive
            const shootChance = isAggressive ? 0.9 : 0.75;
            if (
              nearestDist >= minRange &&
              nearestDist <= weaponData.maxEngageRange &&
              Math.random() < shootChance
            ) {
              if (
                hasLineOfSight(bot.x, bot.y, nearestTarget.x, nearestTarget.y)
              ) {
                handleShoot(bot);
              }
            }
          }
        }
        // BEHAVIOR: Rifle wall penetration - shoot through walls!
        else if (
          nearestBehindWall &&
          bot.weapon === "rifle" &&
          wallPenetrationInfo
        ) {
          // We have a rifle and detected an enemy behind exactly one wall
          const dx = nearestBehindWall.x - bot.x;
          const dy = nearestBehindWall.y - bot.y;
          const angleToTarget = Math.atan2(dy, dx);
          bot.aimAngle = angleToTarget;

          // Get weapon data for range checks
          const weaponData = WEAPONS[bot.weapon];
          const minRange = weaponData.minEngageRange;

          // Tactical movement - strafe while maintaining aim through wall
          if (nearestBehindWallDist > weaponData.optimalRange.max) {
            // Move closer to optimal range
            const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.7;
            bot.vx = Math.cos(angleToTarget) * moveSpeed;
            bot.vy = Math.sin(angleToTarget) * moveSpeed;
          } else if (nearestBehindWallDist < minRange) {
            // Too close - back away
            const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.6;
            bot.vx = -Math.cos(angleToTarget) * moveSpeed;
            bot.vy = -Math.sin(angleToTarget) * moveSpeed;
          } else {
            // In good range - strafe perpendicular to maintain position
            const strafeAngle = angleToTarget + Math.PI / 2;
            const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.4;
            bot.vx = Math.cos(strafeAngle) * moveSpeed * bot.strafeDir;
            bot.vy = Math.sin(strafeAngle) * moveSpeed * bot.strafeDir;
          }

          // Shoot through wall - high probability when in good range
          // Bot knows there's only one wall and rifle can penetrate
          const wallShootChance = isAggressive ? 0.85 : 0.7;
          if (
            nearestBehindWallDist >= minRange &&
            nearestBehindWallDist <= weaponData.maxEngageRange &&
            Math.random() < wallShootChance
          ) {
            // Shoot through the wall!
            handleShoot(bot);
          }
        }
        // BEHAVIOR: Hunt last known enemy position
        else if (bot.lastKnownEnemy && now - bot.lastKnownEnemy.time < 8000) {
          // Hunt toward last known position for 8 seconds
          const dx = bot.lastKnownEnemy.x - bot.x;
          const dy = bot.lastKnownEnemy.y - bot.y;
          const distToLastKnown = Math.sqrt(dx * dx + dy * dy);

          if (distToLastKnown > 100) {
            const angleToEnemy = Math.atan2(dy, dx);
            const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.8; // Hunt aggressively
            bot.vx = Math.cos(angleToEnemy) * moveSpeed;
            bot.vy = Math.sin(angleToEnemy) * moveSpeed;
            bot.aimAngle = angleToEnemy;
            bot.wanderAngle = angleToEnemy;

            // If we have rifle and enemy was behind wall, try shooting through it
            if (
              bot.weapon === "rifle" &&
              bot.lastKnownEnemy.behindWall &&
              now - bot.lastKnownEnemy.time < 3000
            ) {
              // Recent enemy behind wall - try wall penetration shot
              const penetrationCheck = canShootThroughWall(
                bot.x,
                bot.y,
                bot.lastKnownEnemy.x,
                bot.lastKnownEnemy.y,
                VISION_RANGE,
              );
              if (penetrationCheck && Math.random() < 0.6) {
                // 60% chance to shoot at last known position through wall
                handleShoot(bot);
              }
            }
          } else {
            // Reached last known position, clear it
            bot.lastKnownEnemy = null;
          }
        }
        // BEHAVIOR: Heard gunshot - run toward it
        else if (
          bot.lastHeardSound &&
          bot.lastHeardSound.type === "gunshot" &&
          bot.lastHeardSound.dist > 50
        ) {
          const dx = bot.lastHeardSound.x - bot.x;
          const dy = bot.lastHeardSound.y - bot.y;
          const angleToSound = Math.atan2(dy, dx);

          const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.8; // Run fast toward gunfire
          bot.vx = Math.cos(angleToSound) * moveSpeed;
          bot.vy = Math.sin(angleToSound) * moveSpeed;
          bot.aimAngle = angleToSound;

          // Clear heard sound once we're close to the location
          if (bot.lastHeardSound.dist < 50) {
            bot.lastHeardSound = null;
          }
        }
        // BEHAVIOR: Seek valuable pickups (armor/weapons) or control strategic positions
        else {
          bot.lastHeardSound = null; // Clear old sound

          // Prioritize armor and weapon pickups
          const bestPickup = findBestPickup(bot);
          const shouldSeekPickup =
            bestPickup &&
            (bestPickup.type.startsWith("armor") ||
              bestPickup.type.startsWith("weapon") ||
              (bestPickup.type.startsWith("health") && bot.health < 70));

          if (shouldSeekPickup) {
            // Seek valuable pickup
            const dx = bestPickup.x - bot.x;
            const dy = bestPickup.y - bot.y;
            const distToPickup = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.75;
            bot.vx = Math.cos(angle) * moveSpeed;
            bot.vy = Math.sin(angle) * moveSpeed;
            bot.aimAngle = angle;
            bot.wanderAngle = angle;
          } else {
            // No valuable pickups - control strategic waypoints
            // Change waypoint every 5-8 seconds or when reached
            if (!bot.strategicWaypoint || now > bot.waypointTimer) {
              bot.strategicWaypoint = getStrategicWaypoint(bot.x, bot.y);
              bot.waypointTimer = now + 5000 + Math.random() * 3000;
            }

            if (bot.strategicWaypoint) {
              const dx = bot.strategicWaypoint.x - bot.x;
              const dy = bot.strategicWaypoint.y - bot.y;
              const distToWaypoint = Math.sqrt(dx * dx + dy * dy);

              if (distToWaypoint < 100) {
                // Reached waypoint, pick a new one
                bot.strategicWaypoint = getStrategicWaypoint(bot.x, bot.y);
                bot.waypointTimer = now + 5000 + Math.random() * 3000;
              } else {
                // Move toward strategic waypoint
                const angle = Math.atan2(dy, dx);
                const moveSpeed = GAME_CONFIG.PLAYER_SPEED * 0.7;
                bot.vx = Math.cos(angle) * moveSpeed;
                bot.vy = Math.sin(angle) * moveSpeed;
                bot.aimAngle = angle;
                bot.wanderAngle = angle;
              }
            }
          }
        }

        // Store target info for use outside think block
        bot.currentTarget = nearestTarget;
        bot.currentTargetDist = nearestDist;
      }

      // Freeze bots during countdown
      if (gameState.countdownStartTime !== null) {
        bot.vx = 0;
        bot.vy = 0;
      }

      // Move bot with collision detection and wall sliding
      const newX = bot.x + bot.vx * dt;
      const newY = bot.y + bot.vy * dt;

      let moved = false;
      const hitX = checkWallCollision(newX, bot.y, GAME_CONFIG.PLAYER_RADIUS);
      const hitY = checkWallCollision(bot.x, newY, GAME_CONFIG.PLAYER_RADIUS);

      // Try to move on both axes
      if (!hitX) {
        bot.x = newX;
        moved = true;
      }

      if (!hitY) {
        bot.y = newY;
        moved = true;
      }

      // End spawn protection when bot moves
      if (moved && bot.invulnerable > now) {
        bot.invulnerable = 0;
      }

      // Wall sliding behavior - if we hit on one axis but not the other, keep sliding
      if (hitX && !hitY) {
        // Hit wall on X, but can slide along Y
        bot.y = newY;
        moved = true;
      } else if (hitY && !hitX) {
        // Hit wall on Y, but can slide along X
        bot.x = newX;
        moved = true;
      }

      // Corner detection - stuck on both axes
      if (hitX && hitY) {
        // We're in a corner or stuck - track how long we've been stuck
        if (!bot.stuckTimer) {
          bot.stuckTimer = now;
        } else if (now - bot.stuckTimer > 300) {
          // Been stuck for 300ms - strafe away from the corner
          bot.wanderAngle = Math.random() * Math.PI * 2;

          // Try moving perpendicular to current direction
          const escapeAngle =
            bot.wanderAngle +
            (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
          const escapeSpeed = GAME_CONFIG.PLAYER_SPEED * 0.9;
          bot.vx = Math.cos(escapeAngle) * escapeSpeed;
          bot.vy = Math.sin(escapeAngle) * escapeSpeed;

          bot.stuckTimer = null; // Reset stuck timer

          // If we're stuck while trying to reach a pickup, give up on it
          if (bot.targetPickupId) {
            bot.targetPickupId = null;
            bot.pickupCommitTime = null;
            console.log(`🤖 ${bot.name} gave up on unreachable pickup`);
          }
        }
      } else {
        // Not stuck, reset timer
        bot.stuckTimer = null;
      }

      // Create footstep sounds when bot moves (every 300ms)
      if (
        moved &&
        (bot.vx !== 0 || bot.vy !== 0) &&
        now - bot.lastFootstepSound > 300
      ) {
        createSoundEvent(bot.x, bot.y, "footstep", bot.id);
        bot.lastFootstepSound = now;
      }

      // Clamp to world bounds
      bot.x = Math.max(
        GAME_CONFIG.PLAYER_RADIUS,
        Math.min(GAME_CONFIG.WORLD_WIDTH - GAME_CONFIG.PLAYER_RADIUS, bot.x),
      );
      bot.y = Math.max(
        GAME_CONFIG.PLAYER_RADIUS,
        Math.min(GAME_CONFIG.WORLD_HEIGHT - GAME_CONFIG.PLAYER_RADIUS, bot.y),
      );

      // Track distance moved to detect if bot is stuck in an area
      const distThisFrame = Math.sqrt(
        Math.pow(bot.x - bot.lastAreaCheckPos.x, 2) +
          Math.pow(bot.y - bot.lastAreaCheckPos.y, 2),
      );
      bot.totalDistanceMoved += distThisFrame;
      bot.lastAreaCheckPos = { x: bot.x, y: bot.y };

      // Check every 3 seconds if bot has made meaningful progress
      if (now - bot.areaCheckTimer > 3000) {
        // If bot hasn't moved at least 200 pixels in 3 seconds, force relocation
        // Exception: if bot is in combat, low health retreating, or just collected pickup
        const hasTarget = nearestTarget && nearestDist < 450;
        const isRetreating = bot.health < GAME_CONFIG.PLAYER_MAX_HEALTH * 0.4;

        if (bot.totalDistanceMoved < 200 && !hasTarget && !isRetreating) {
          // Bot is stuck in an area - pick a random new destination far away
          const targetX = Math.random() * (GAME_CONFIG.WORLD_WIDTH - 400) + 200;
          const targetY =
            Math.random() * (GAME_CONFIG.WORLD_HEIGHT - 400) + 200;

          const angleToTarget = Math.atan2(targetY - bot.y, targetX - bot.x);
          bot.wanderAngle = angleToTarget;
          bot.wanderTimer = now + 5000; // Keep this direction for 5 seconds

          // Clear any heard sounds to force movement
          bot.lastHeardSound = null;

          console.log(`🤖 ${bot.name} stuck in area, forcing relocation`);
        }

        // Reset tracking
        bot.areaCheckTimer = now;
        bot.totalDistanceMoved = 0;
      }

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

            // Clear pickup target so bot picks a new one
            bot.targetPickupId = null;
            bot.pickupCommitTime = null;
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
        player.weapon = "pistol";
        player.ammo = WEAPONS.pistol.mag;
        player.maxAmmo = WEAPONS.pistol.mag;
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
      const xBlocked = checkWallCollision(
        newX,
        player.y,
        GAME_CONFIG.PLAYER_RADIUS,
      );
      if (!xBlocked) {
        player.x = newX;
        playerMoved = true;
      }

      // Check Y axis collision
      const yBlocked = checkWallCollision(
        player.x,
        newY,
        GAME_CONFIG.PLAYER_RADIUS,
      );
      if (!yBlocked) {
        player.y = newY;
        playerMoved = true;
      }

      // Create footstep sounds when player moves (every 300ms)
      if (
        playerMoved &&
        (player.vx !== 0 || player.vy !== 0) &&
        now - player.lastFootstepSound > 300
      ) {
        createSoundEvent(player.x, player.y, "footstep", player.id);
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
      ...Array.from(gameState.bots.values()),
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
          reloadFinish: p.reloadFinish,
          invulnerable: p.invulnerable > now,
        })),
        pickups: gameState.pickups.map((p) => ({
          id: p.id,
          x: p.x,
          y: p.y,
          type: p.type,
          active: p.active,
        })),
        projectiles: gameState.projectiles.map((p) => ({
          id: p.id,
          x: Math.round(p.x),
          y: Math.round(p.y),
          angle: Math.round(p.angle * 100) / 100,
        })),
      };

      const stateString = JSON.stringify(state);
      performanceMonitor.recordMessage(Buffer.byteLength(stateString, "utf8"));
      io.emit("state", state);
    }

    // Execute active persistent mods
    executeActiveMods(now);

    // Update performance metrics
    performanceMonitor.updateGameState({
      players: gameState.players.size,
      bots: gameState.bots.size,
      projectiles: gameState.projectiles.length,
      pickups: gameState.pickups.filter((p) => p.active).length,
    });
    performanceMonitor.updateConnectionCount(io.engine.clientsCount);

    // Record tick time
    const tickEndTime = Date.now();
    const tickDuration = tickEndTime - tickStartTime;
    performanceMonitor.recordTick(tickDuration);
  } catch (error) {
    console.error("❌ Error in game loop:", error);
    console.error("Stack:", error.stack);
    // Don't crash - continue next tick
  }
}

// Initialize and start server
initializePickups();
maintainBotCount(); // Spawn initial bots

// Start the first warmup after a short delay
setTimeout(() => {
  startWarmup();
}, 2000);

// Clean up expired active mods every 10 seconds
setInterval(() => {
  cleanupExpiredMods();
}, 10000);

setInterval(gameLoop, TICK_INTERVAL);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
  console.log(`🤖 ${gameState.bots.size} bots ready`);
});
