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
    type TEXT NOT NULL CHECK(type IN ('client', 'server')),
    user_prompt TEXT,
    created_at INTEGER NOT NULL,
    player_id TEXT,
    UNIQUE(name, player_id)
  )
`);

// Create index for faster lookups
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_mods_player_created
  ON mods(player_id, created_at DESC)
`);

console.log("✅ Mod database initialized");

// Helper functions
export function saveMod(name, code, type, userPrompt = null, playerId = null) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO mods (name, code, type, user_prompt, created_at, player_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name,
    code,
    type,
    userPrompt,
    Date.now(),
    playerId,
  );

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

export default {
  saveMod,
  getModsByPlayer,
  getAllMods,
  getModStats,
  deleteMod,
  closeDatabase,
};
