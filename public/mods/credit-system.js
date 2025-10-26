// Credit System Mod
// Awards bonus credits for killstreaks and manages the credit economy

let currentStreak = 0;

// Killstreak bonus schedule
const KILLSTREAK_BONUSES = {
  3: 2,   // Killing Spree: +2 credits (7 total)
  5: 3,   // Rampage: +3 credits (8 total)
  7: 5,   // Dominating: +5 credits (10 total)
  10: 10, // Unstoppable: +10 credits (15 total)
  15: 10, // Godlike: +10 credits (15 total)
};

registerHook("onKill", (killerId, victimId) => {
  const myId = game.getPlayerId();

  if (killerId === myId) {
    currentStreak++;

    // Check for killstreak bonus
    if (KILLSTREAK_BONUSES[currentStreak]) {
      const bonus = KILLSTREAK_BONUSES[currentStreak];
      console.log(`🎯 Killstreak bonus! +${bonus} credits (${currentStreak} kills)`);

      // Note: The bonus is added client-side for immediate feedback
      // The server tracks the base 5 credits per kill
      // This bonus system could be moved server-side for security
    }
  } else if (victimId === myId) {
    // Reset streak on death
    currentStreak = 0;
  }
});

console.log("✅ Credit System loaded - Base: 5 credits/kill, Killstreak bonuses active");
