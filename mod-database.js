import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize SQLite database
const db = new Database(join(__dirname, "mods.db"));

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");

// Create mods table
db.exec(`
  CREATE TABLE IF NOT EXISTS mods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('client', 'server', 'persistent')),
    user_prompt TEXT,
    created_at INTEGER NOT NULL,
    player_id TEXT,
    failed INTEGER DEFAULT 0,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    UNIQUE(name, player_id)
  )
`);

// Create index for faster lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_mods_player_created
  ON mods(player_id, created_at DESC)
`);

// Create active_mods table for persistent game tick execution
db.exec(`
  CREATE TABLE IF NOT EXISTS active_mods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    name TEXT,
    description TEXT,
    target_scope TEXT DEFAULT 'player',
    target_player_id TEXT,
    target_player_name TEXT
  )
`);

// Migration: Add new columns if they don't exist
// Check if target_scope column exists
const tableInfo = db.pragma('table_info(active_mods)');
const hasTargetScope = tableInfo.some(col => col.name === 'target_scope');

if (!hasTargetScope) {
  console.log("🔄 Migrating active_mods table to add new columns...");
  db.exec(`
    ALTER TABLE active_mods ADD COLUMN target_scope TEXT DEFAULT 'player';
  `);
  db.exec(`
    ALTER TABLE active_mods ADD COLUMN target_player_id TEXT;
  `);
  db.exec(`
    ALTER TABLE active_mods ADD COLUMN target_player_name TEXT;
  `);
  console.log("✅ Migration completed");
}

// Create index for active mods queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_active_mods_expiry
  ON active_mods(expires_at)
`);

console.log("✅ Mod database initialized");

// Helper functions
export function saveMod(name, code, type, userPrompt = null, playerId = null) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO mods (name, code, type, user_prompt, created_at, player_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(name, code, type, userPrompt, Date.now(), playerId);

  console.log(`💾 Saved mod "${name}" (type: ${type}) to database`);
  return result.lastInsertRowid;
}

export function getModsByPlayer(playerId, limit = 50) {
  const stmt = db.prepare(`
    SELECT * FROM mods
    WHERE player_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  return stmt.all(playerId, limit);
}

export function getAllMods(limit = 100) {
  const stmt = db.prepare(`
    SELECT * FROM mods
    ORDER BY created_at DESC
    LIMIT ?
  `);

  return stmt.all(limit);
}

export function getModStats() {
  const totalMods = db.prepare("SELECT COUNT(*) as count FROM mods").get();
  const clientMods = db
    .prepare("SELECT COUNT(*) as count FROM mods WHERE type = 'client'")
    .get();
  const serverMods = db
    .prepare("SELECT COUNT(*) as count FROM mods WHERE type = 'server'")
    .get();
  const uniquePlayers = db
    .prepare("SELECT COUNT(DISTINCT player_id) as count FROM mods")
    .get();

  return {
    total: totalMods.count,
    client: clientMods.count,
    server: serverMods.count,
    uniquePlayers: uniquePlayers.count,
  };
}

export function deleteMod(id) {
  const stmt = db.prepare("DELETE FROM mods WHERE id = ?");
  return stmt.run(id);
}

export function closeDatabase() {
  db.close();
}

// Active mod management functions
export function addActiveMod(
  playerId,
  code,
  durationMs,
  name = null,
  description = null,
  targetScope = 'player',
  targetPlayerId = null,
  targetPlayerName = null,
) {
  const stmt = db.prepare(`
    INSERT INTO active_mods (player_id, code, created_at, expires_at, name, description, target_scope, target_player_id, target_player_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  const result = stmt.run(
    playerId,
    code,
    now,
    now + durationMs,
    name,
    description,
    targetScope,
    targetPlayerId,
    targetPlayerName,
  );

  console.log(
    `⚡ Added active mod for player ${playerId}, scope: ${targetScope}, expires in ${durationMs / 1000}s`,
  );
  return result.lastInsertRowid;
}

export function getActiveMods() {
  const stmt = db.prepare(`
    SELECT * FROM active_mods
    WHERE expires_at > ?
    ORDER BY created_at ASC
  `);

  return stmt.all(Date.now());
}

export function cleanupExpiredMods() {
  const stmt = db.prepare(`
    DELETE FROM active_mods
    WHERE expires_at <= ?
  `);

  const result = stmt.run(Date.now());
  if (result.changes > 0) {
    console.log(`🧹 Cleaned up ${result.changes} expired active mods`);
  }
  return result.changes;
}

export function removePlayerActiveMods(playerId) {
  const stmt = db.prepare(`
    DELETE FROM active_mods
    WHERE player_id = ?
  `);

  return stmt.run(playerId);
}

// Save a failed mod generation attempt
export function saveFailedMod(userPrompt, errorMessage, retryCount = 0, playerId = null) {
  const stmt = db.prepare(`
    INSERT INTO mods (name, code, type, user_prompt, created_at, player_id, failed, error_message, retry_count)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const modName = `failed_${Date.now()}`;
  const result = stmt.run(modName, '', 'client', userPrompt, Date.now(), playerId, errorMessage, retryCount);

  console.log(`❌ Logged failed mod generation: ${errorMessage} (retry: ${retryCount})`);
  return result.lastInsertRowid;
}

// Get a random working mod from the database
export function getRandomWorkingMod() {
  const stmt = db.prepare(`
    SELECT * FROM mods
    WHERE failed = 0 AND code != ''
    ORDER BY RANDOM()
    LIMIT 1
  `);

  return stmt.get();
}

export default {
  saveMod,
  getModsByPlayer,
  getAllMods,
  getModStats,
  deleteMod,
  closeDatabase,
  addActiveMod,
  getActiveMods,
  cleanupExpiredMods,
  removePlayerActiveMods,
  saveFailedMod,
  getRandomWorkingMod,
};
