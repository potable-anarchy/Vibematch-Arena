import io from "socket.io-client";

console.log("🚀 Starting test...");

const socket = io("http://localhost:5500");

console.log("📡 Socket created, attempting to connect...");

socket.on("connect", () => {
  console.log("✅ Connected to server:", socket.id);
  console.log("👤 Joining game as TestPlayer...");
  socket.emit("join", "TestPlayer");
  console.log("📤 Join event emitted");
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error);
  process.exit(1);
});

socket.on("init", (data) => {
  console.log("✅ Received init event");
  console.log(`   Player ID: ${data.playerId}`);

  const targetBotId = "bot_1";
  console.log(`\n🎯 Activating god mode for bot: ${targetBotId} (TestDummy)`);

  const godModeCode = `
// God Mode - Keeps bot invulnerable
const bot = api.getPlayer('${targetBotId}');

if (bot && bot.health > 0) {
  api.setInvulnerable('${targetBotId}', true);
  api.setHealth('${targetBotId}', 100);
  api.setArmor('${targetBotId}', 100);
}
`;

  console.log("📤 Emitting activatePersistentMod event...");
  socket.emit("activatePersistentMod", {
    code: godModeCode,
    durationMs: 30000,
    name: "God Mode for TestDummy",
    description: `Makes bot_1 invulnerable for 30 seconds`,
  });
  console.log("✅ Event emitted, waiting for response...");
});

socket.on("persistentModResult", (result) => {
  console.log(
    "📥 Received persistentModResult:",
    JSON.stringify(result, null, 2),
  );

  if (result.success) {
    console.log("\n✅ SUCCESS! Persistent mod activated!");
    console.log(`   Mod ID: ${result.modId}`);
    console.log(`   Duration: ${result.duration}ms`);
    console.log("\n🛡️  bot_1 (TestDummy) is now invulnerable!");

    setTimeout(() => {
      console.log("\n✅ Test complete - disconnecting");
      socket.disconnect();
      process.exit(0);
    }, 3000);
  } else {
    console.log("\n❌ FAILED:", result.error);
    socket.disconnect();
    process.exit(1);
  }
});

socket.on("disconnect", () => {
  console.log("🔌 Disconnected from server");
});

socket.on("error", (error) => {
  console.error("❌ Socket error:", error);
});

// Timeout if nothing happens
setTimeout(() => {
  console.log("⏰ Test timed out - no response received");
  process.exit(1);
}, 12000);
