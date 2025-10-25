// Test mod to demonstrate robust error handling
// This mod intentionally has errors to test the failsafe system

console.log("🧪 Test Error Handling Mod Loading...");

// Example 1: Syntax error test (uncomment to test)
// This will be caught by validation and prevent loading
// const broken = {

// Example 2: Runtime error in hook
let errorCount = 0;
registerHook("onUpdate", (dt) => {
  errorCount++;

  // Throw error on 3rd call to test error recovery
  if (errorCount === 3) {
    throw new Error("Intentional test error in onUpdate hook");
  }

  // This should continue working after error is handled
  if (errorCount % 100 === 0) {
    console.log(`✅ Test mod still running, count: ${errorCount}`);
  }
});

// Example 3: Slow hook to test timeout warnings
registerHook("onRender", (ctx, camera, dt) => {
  // Simulate slow operation
  const start = performance.now();

  // Busy wait for 60ms (will trigger warning at 50ms threshold)
  while (performance.now() - start < 60) {
    // Intentionally slow
  }
});

// Example 4: Normal hook that works fine
registerHook("onKill", (killerId, victimId) => {
  console.log(`✅ Test mod: Kill recorded ${killerId} -> ${victimId}`);
});

console.log("✅ Test Error Handling Mod Loaded");
