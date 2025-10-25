// Test script to demonstrate god mode persistent mod
// This shows what code would be sent via socket.emit("activatePersistentMod")

const godModeCode = `
// God Mode - Keeps player invulnerable
const player = api.getMyPlayer();

if (player && player.health > 0) {
  // Set invulnerable flag
  api.setInvulnerable(player.id, true);

  // Also keep health and armor maxed
  api.setHealth(player.id, 100);
  api.setArmor(player.id, 100);
}
`;

// Example of how to activate it from client:
const exampleUsage = {
  event: "activatePersistentMod",
  data: {
    code: godModeCode,
    durationMs: 60000, // 1 minute
    name: "God Mode",
    description: "Makes player invulnerable for 60 seconds",
  },
};

console.log("=== God Mode Persistent Mod Example ===\n");
console.log("Socket event:", exampleUsage.event);
console.log("\nData to send:");
console.log(JSON.stringify(exampleUsage.data, null, 2));
console.log("\n=== How it works ===");
console.log("1. Client emits 'activatePersistentMod' with the code");
console.log("2. Server adds it to active_mods table with expiration time");
console.log("3. executeActiveMods() runs this code every game tick (60Hz)");
console.log("4. Player becomes invulnerable and stays at full health/armor");
console.log("5. Mod automatically expires after duration ends");
console.log("6. Expired mods cleaned up every 10 seconds");
