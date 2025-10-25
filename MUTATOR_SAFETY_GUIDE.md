# Mutator Safety & Error Handling Guide

## Overview

The Vibe-Kanban mutator system has been enhanced with comprehensive error handling and safety features to ensure that broken or buggy mods **never crash the server or client**. The system provides automatic failsafes, validation, rollback, and auto-disable functionality.

## Key Features

### 1. **Validation Before Loading**
Mods are validated before execution to catch common errors:
- Syntax errors detected
- Dangerous patterns blocked (eval, Function constructor, dynamic imports)
- Validation failures prevent mod from loading entirely

### 2. **Hook State Snapshots**
- Before loading any mod, the system takes a snapshot of all registered hooks
- If the mod fails to load, hooks are automatically rolled back to the previous state
- Prevents partial/corrupted mod registrations

### 3. **Timeout Protection**
- Each hook execution is monitored for performance
- Default timeout: 100ms per hook call
- Warnings issued for hooks taking >50ms
- Auto-disable after 2x timeout (200ms)
- Prevents infinite loops from freezing the game

### 4. **Error Recovery & Auto-Disable**
- Errors in hooks are caught and logged
- Mods track consecutive error counts
- After 3 consecutive errors, mod is automatically disabled
- Disabled mods stop executing but remain loaded for inspection

### 5. **Hot-Reload Support**
- File watching enabled with 2-second polling
- Mods reload automatically when files change
- All safety features apply to reloaded mods
- Failed reloads don't crash the game

### 6. **Detailed Status Tracking**
- Track loaded, failed, and disabled mods separately
- Error counts per mod
- Timestamps for load/fail events
- Full status available via `modSystem.getModStatus()`

## How It Works

### Loading Process

```javascript
// 1. Validation
const validation = modSystem.validateModCode(code, name);
if (!validation.valid) {
  // Mod blocked - validation errors logged
  return { success: false, message: "Validation failed" };
}

// 2. Snapshot current state
const snapshot = modSystem.createHookSnapshot();

// 3. Attempt to load
try {
  // Execute mod code
  modFunction(modContext);
  // Success - mod loaded
} catch (error) {
  // 4. Rollback on error
  modSystem.restoreHookSnapshot(snapshot);
  // Mod not loaded - error logged
}
```

### Hook Execution with Safety

```javascript
// For each hook call
for (const hook of activeHooks) {
  try {
    // Start timeout timer
    const startTime = performance.now();
    const timeoutId = setTimeout(() => {
      console.error("Hook timeout!");
    }, MAX_HOOK_EXECUTION_TIME);

    // Execute hook
    hook.fn(...args);

    // Check execution time
    clearTimeout(timeoutId);
    const executionTime = performance.now() - startTime;

    // Warn about slow hooks
    if (executionTime > 50) {
      console.warn("Slow hook detected!");
    }

  } catch (error) {
    // Record error
    const wasDisabled = modSystem.recordModError(hook.name, error);

    if (wasDisabled) {
      // Mod auto-disabled after 3 errors
      console.error("Mod disabled due to errors");
    }
  }
}
```

## Usage Examples

### Writing Safe Mods

```javascript
// ✅ GOOD: Simple, fast hook
registerHook("onKill", (killerId, victimId) => {
  console.log(`Kill: ${killerId} -> ${victimId}`);
});

// ⚠️ WARNING: Slow hook (will trigger warnings)
registerHook("onUpdate", (dt) => {
  // This loop takes too long
  for (let i = 0; i < 1000000; i++) {
    // Heavy computation
  }
});

// ❌ BAD: Infinite loop (will auto-disable mod)
registerHook("onUpdate", (dt) => {
  while (true) {
    // This will timeout and disable the mod
  }
});

// ✅ GOOD: Error handling within mod
registerHook("onHit", (shooterId, targetId, damage) => {
  try {
    // Potentially risky operation
    const player = game.getState().players.find(p => p.id === targetId);
    if (player) {
      console.log(`${player.name} took ${damage} damage`);
    }
  } catch (error) {
    // Handle error gracefully
    console.error("Error in onHit:", error);
  }
});
```

### Checking Mod Status

```javascript
// Get comprehensive status
const status = modSystem.getModStatus();
console.log(status);
// {
//   loaded: [{ name: "mod1", loadedAt: 123456, disabled: false, errorCount: 0 }],
//   failed: [{ name: "mod2", error: "Syntax error", failedAt: 123457 }],
//   disabled: [{ name: "mod3", errorCount: 3 }],
//   enabled: true
// }

// Check if a specific mod is disabled
if (modSystem.isModDisabled("my-mod")) {
  console.log("Mod is disabled");
}

// Re-enable a disabled mod
modSystem.enableMod("my-mod");
```

### Testing Error Handling

```javascript
// Test mod that will error on 3rd call
let count = 0;
registerHook("onUpdate", (dt) => {
  count++;
  if (count === 3) {
    throw new Error("Test error");
  }
});
// This mod will error once, log it, then continue
// On 3rd error, it will be auto-disabled
```

## Configuration

### Timeout Settings
```javascript
// In modSystem constructor
this.MAX_HOOK_EXECUTION_TIME = 100; // ms - adjust for your needs
this.MAX_CONSECUTIVE_ERRORS = 3;    // errors before auto-disable
```

### Hot-Reload Interval
```javascript
// In game.js
modSystem.enableHotReload(2000); // Poll every 2 seconds
```

## Error Messages

### Validation Errors
```
❌ Mod "my-mod": Validation failed: Syntax error: Unexpected token
❌ Mod "bad-mod": Validation failed: eval() is not allowed
```

### Load Errors
```
❌ Error loading mod "my-mod": ReferenceError: undefined variable
🔄 Rolled back hooks due to error in mod "my-mod"
```

### Runtime Errors
```
❌ Error in mod "buggy-mod" hook "onUpdate": TypeError: Cannot read property
⏱️ Mod "slow-mod" hook "onRender" exceeded timeout (100ms)
⚠️ Mod "slow-mod" hook "onUpdate" is slow (75.23ms)
```

### Auto-Disable
```
🚫 Mod "broken-mod" auto-disabled after 3 consecutive errors
   Last error: TypeError: Cannot read property 'x' of undefined
🚫 Force-disabling mod "infinite-loop" due to severe timeout (250.45ms)
```

## Console Commands

```javascript
// Get all loaded mods
modSystem.getLoadedMods()

// Get failed mods
modSystem.getFailedMods()

// Get disabled mods
modSystem.getDisabledMods()

// Get full status
modSystem.getModStatus()

// Re-enable a disabled mod
modSystem.enableMod("mod-name")

// Check if disabled
modSystem.isModDisabled("mod-name")

// Clear error count
modSystem.clearModErrors("mod-name")
```

## Best Practices

### 1. Keep Hooks Fast
- Hooks are called frequently (onUpdate: 60fps, onRender: 60fps)
- Avoid heavy computation in hooks
- Use throttling/debouncing for expensive operations

### 2. Handle Errors Gracefully
- Wrap risky operations in try-catch
- Check for undefined/null before accessing properties
- Validate input parameters

### 3. Test Incrementally
- Start with simple hooks
- Test each hook type separately
- Add complexity gradually

### 4. Monitor Performance
- Watch console for slow hook warnings
- Profile your mod code
- Optimize hot paths

### 5. Use Hot-Reload
- Edit mods while server is running
- Changes apply automatically
- No need to restart server

## Troubleshooting

### Mod Won't Load
- Check console for validation errors
- Look for syntax errors in your code
- Verify no dangerous patterns (eval, Function)
- Check file is in `/mods/` directory

### Mod Keeps Getting Disabled
- Reduce error frequency (fix bugs)
- Add error handling within hooks
- Check for undefined access
- Verify game state exists before accessing

### Mod is Slow
- Profile your code execution time
- Remove heavy computations from hooks
- Cache results where possible
- Use throttling for expensive operations

### Hot-Reload Not Working
- Verify `enableHotReload()` is called
- Check browser console for errors
- Ensure mod is in `mods.json` with `enabled: true`
- Clear browser cache if needed

## Technical Details

### Validation Patterns Blocked
```javascript
const dangerousPatterns = [
  { pattern: /eval\s*\(/g, message: "eval() is not allowed" },
  { pattern: /Function\s*\(/g, message: "Function constructor is not allowed" },
  { pattern: /import\s+/g, message: "dynamic imports are not allowed" },
  { pattern: /require\s*\(/g, message: "require() is not allowed" },
];
```

### Hook Context
```javascript
const modContext = {
  game: this.game,           // Game state accessor
  registerHook: (name, fn),  // Hook registration
  console: console,          // Console access
  Math: Math,                // Math utilities
  Date: Date,                // Date utilities
};
```

### Available Hooks
- `onPlayerDraw(ctx, player, camera)` - Called when drawing each player
- `onHit(shooterId, targetId, damage)` - Called when player is hit
- `onKill(killerId, victimId)` - Called when player is killed
- `onPickup(playerId, pickup)` - Called when pickup is collected
- `onShoot(data)` - Called when weapon is fired
- `onUpdate(dt)` - Called every frame (60fps)
- `onRender(ctx, camera, dt)` - Called every render frame

## Summary

The enhanced mutator system provides robust protection against:
- ✅ Syntax errors (blocked before loading)
- ✅ Runtime errors (caught and logged)
- ✅ Infinite loops (timeout protection)
- ✅ Repeated failures (auto-disable)
- ✅ Partial loads (rollback on error)
- ✅ Hot-reload crashes (full error handling)

**Result**: Mods can be written and tested live while the server is running, with complete confidence that errors won't crash the game.
