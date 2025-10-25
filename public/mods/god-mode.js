// SERVER
// God Mode - Makes you invulnerable by constantly healing to full health
// Note: This is a test mod to demonstrate server-side mod capabilities

// Set up an interval to keep health at maximum
const healInterval = setInterval(() => {
  // Get current player
  const players = api.getAllPlayers();
  const me = players.find(p => p.id === api.myId);

  if (me && me.health > 0) {
    // Keep health at maximum
    api.setHealth(api.myId, 100);
    // Also keep armor maxed
    api.setArmor(api.myId, 100);
  }
}, 100); // Check every 100ms

api.log("🛡️ God Mode activated! You are now invulnerable.");
api.broadcast(`${api.getAllPlayers().find(p => p.id === api.myId)?.name || 'A player'} activated God Mode!`);

// Return a message
return "God Mode active - you will be healed to full health continuously";
