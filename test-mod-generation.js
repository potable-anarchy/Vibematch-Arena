// Test script to generate a mod and verify the flow works correctly
const SERVER_URL = "http://localhost:5500";

async function testModGeneration() {
  console.log("🧪 Testing mod generation flow...\n");

  try {
    // Test 1: Generate a simple mod
    console.log('1️⃣ Testing mod generation: "heal me"');
    const response = await fetch(`${SERVER_URL}/api/generate-mod`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "heal me" }),
    });

    if (!response.ok) {
      console.error(`❌ API returned status ${response.status}`);
      const text = await response.text();
      console.error("Response:", text);
      return;
    }

    const result = await response.json();
    console.log("✅ Mod generated successfully!");
    console.log("   Type:", result.type);
    console.log("   Backfire:", result.backfire || false);
    console.log("   Code length:", result.code.length, "characters");
    console.log("   First 200 chars:", result.code.substring(0, 200));

    // Test 2: Generate another mod to test multiple generations
    console.log('\n2️⃣ Testing second mod generation: "give me speed boost"');
    const response2 = await fetch(`${SERVER_URL}/api/generate-mod`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "give me speed boost" }),
    });

    const result2 = await response2.json();
    console.log("✅ Second mod generated successfully!");
    console.log("   Type:", result2.type);
    console.log("   Backfire:", result2.backfire || false);

    // Test 3: Generate a mod that might backfire (run multiple times to increase chance)
    console.log("\n3️⃣ Testing backfire chance (running 5 times)...");
    let backfireCount = 0;
    for (let i = 0; i < 5; i++) {
      const response3 = await fetch(`${SERVER_URL}/api/generate-mod`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "make me invincible" }),
      });
      const result3 = await response3.json();
      if (result3.backfire) {
        backfireCount++;
        console.log(`   🎲 Attempt ${i + 1}: BACKFIRE!`);
      } else {
        console.log(`   ✓ Attempt ${i + 1}: Normal`);
      }
    }
    console.log(`   Backfire rate: ${backfireCount}/5 (expected ~10%)`);

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
  }
}

testModGeneration();
