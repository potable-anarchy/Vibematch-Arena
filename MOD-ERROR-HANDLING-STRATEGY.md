# Mod Error Handling Strategy

## Failure Scenarios & Solutions

### 1. Generation Failures (AI Level)

**When it happens:**
- Gemini API error/timeout
- Invalid API response (no candidates)
- Inappropriate/blocked content

**Current behavior:**
- ❌ Server crashes (line 437 error)
- ❌ Returns generic error message

**Proposed solution:**

```javascript
// In /api/generate-mod endpoint
try {
  const response = await fetch(geminiEndpoint);
  const data = await response.json();
  
  // Better error handling
  if (!data.candidates || data.candidates.length === 0) {
    // Check if content was blocked
    if (data.promptFeedback?.blockReason) {
      return res.status(400).json({
        error: "Cannot generate this mod",
        reason: "Content policy violation",
        userMessage: "Your request was blocked by content filters. Try rephrasing your request.",
        canRetry: true
      });
    }
    
    // Generic failure
    return res.status(500).json({
      error: "AI generation failed",
      reason: "No code generated",
      userMessage: "The AI couldn't generate code for this request. Please try a different prompt or simplify your request.",
      canRetry: true
    });
  }
  
  const generatedText = data.candidates[0].content.parts[0].text;
  
} catch (error) {
  return res.status(500).json({
    error: "AI service error",
    reason: error.message,
    userMessage: "The AI service is temporarily unavailable. Please try again in a moment.",
    canRetry: true
  });
}
```

**User Experience:**
- Show friendly error message in UI
- Offer "Try Again" button
- Suggest alternative phrasings
- Don't crash the server!

---

### 2. Syntax Errors (Compilation Level)

**When it happens:**
- Generated code has JavaScript syntax errors
- Invalid code structure

**Current behavior:**
- ⚠️ No validation before saving/executing

**Proposed solution:**

```javascript
// Validate code before saving
function validateModCode(code, type) {
  try {
    // Try to create a function from the code
    if (type === 'client') {
      // Client mods might use different syntax
      new Function(code);
    } else if (type === 'server' || type === 'persistent') {
      // Server/persistent mods use the API parameter
      new Function('api', code);
    }
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error.message,
      type: 'SYNTAX_ERROR'
    };
  }
}

// In /api/generate-mod
const validation = validateModCode(code, modType);
if (!validation.valid) {
  // Log for debugging
  console.error('Generated invalid code:', validation.error);
  console.error('Code:', code);
  
  return res.status(500).json({
    error: "Generated code has syntax errors",
    reason: validation.error,
    userMessage: "The AI generated code with errors. Please try again or rephrase your request.",
    canRetry: true,
    debugInfo: process.env.NODE_ENV === 'development' ? { code } : undefined
  });
}
```

**User Experience:**
- Catch before it ever reaches the user
- Automatically retry or ask user to retry
- Log for developer debugging

---

### 3. Runtime Errors (Execution Level)

**When it happens:**
- Code executes but throws error
- Accessing undefined API methods
- Logic errors during execution

**Current behavior:**
- ✅ Persistent mods already have try/catch in `executeActiveMods()`
- ⚠️ Server mods might crash
- ⚠️ Client mods crash in browser console

**Proposed solution:**

#### A. Persistent Mods (already has basic handling)
```javascript
// In executeActiveMods() - enhance existing try/catch
for (const mod of activeMods) {
  try {
    const modFunction = new Function("api", mod.code);
    modFunction(modAPI);
  } catch (error) {
    console.error(`❌ Error executing persistent mod ${mod.id} (${mod.name}):`, error.message);
    
    // Track error count
    if (!mod.errorCount) mod.errorCount = 0;
    mod.errorCount++;
    
    // If mod fails too many times, deactivate it
    if (mod.errorCount > 100) { // ~1.6 seconds at 60Hz
      console.error(`🚫 Deactivating broken mod ${mod.id} (${mod.name}) after ${mod.errorCount} errors`);
      removeActiveMod(mod.id);
      
      // Notify the player
      const player = gameState.players.get(mod.player_id);
      if (player) {
        io.to(mod.player_id).emit('modError', {
          modId: mod.id,
          modName: mod.name,
          error: 'Mod deactivated due to repeated errors',
          userMessage: `Your mod "${mod.name}" was deactivated because it kept failing. The code might be using methods that don't exist.`
        });
      }
    }
  }
}
```

#### B. Server Mods (one-time execution)
```javascript
// In executeServerMod socket handler
socket.on("executeServerMod", (data) => {
  try {
    const { code } = data;
    const playerId = socket.id;
    const player = gameState.players.get(playerId);

    if (!player) {
      return socket.emit("serverModResult", { 
        error: "Player not found",
        userMessage: "You must be in the game to run mods."
      });
    }

    // Validate first
    const validation = validateModCode(code, 'server');
    if (!validation.valid) {
      return socket.emit("serverModResult", {
        error: "Invalid code",
        reason: validation.error,
        userMessage: "The mod code has errors and cannot be executed."
      });
    }

    try {
      // Execute with API context
      const modAPI = createServerModAPI(playerId);
      const modFunction = new Function("api", code);
      modFunction(modAPI);

      socket.emit("serverModResult", { 
        success: true,
        message: "Mod executed successfully" 
      });
    } catch (executionError) {
      console.error("Server mod runtime error:", executionError);
      
      socket.emit("serverModResult", {
        error: "Runtime error",
        reason: executionError.message,
        userMessage: "The mod ran into an error during execution. It might be using features that don't exist.",
        canRetry: false
      });
    }
  } catch (error) {
    console.error("❌ Error in executeServerMod handler:", error);
    socket.emit("serverModResult", { 
      error: error.message,
      userMessage: "An unexpected error occurred."
    });
  }
});
```

#### C. Client Mods (browser-side)
```javascript
// In the client-side mod loading code
function loadClientMod(code, modName) {
  try {
    // Wrap in try/catch for runtime protection
    const wrappedCode = `
      try {
        ${code}
      } catch (error) {
        console.error('Error in client mod "${modName}":', error);
        window.showModError('${modName}', error.message);
      }
    `;
    
    eval(wrappedCode);
  } catch (error) {
    console.error(\`Failed to load client mod "\${modName}":\`, error);
    window.showModError(modName, 'Failed to load mod: ' + error.message);
  }
}

// Add UI notification function
window.showModError = function(modName, errorMessage) {
  // Show a toast/notification in the game UI
  const notification = document.createElement('div');
  notification.className = 'mod-error-notification';
  notification.innerHTML = \`
    <strong>Mod Error: \${modName}</strong>
    <p>\${errorMessage}</p>
    <button onclick="this.parentElement.remove()">Dismiss</button>
  \`;
  document.body.appendChild(notification);
  
  // Auto-dismiss after 10 seconds
  setTimeout(() => notification.remove(), 10000);
};
```

**User Experience:**
- Persistent mods: Silently fail a few times, then deactivate and notify
- Server mods: Immediate error notification
- Client mods: Toast notification in-game

---

### 4. Silent Failures (Wrong but doesn't crash)

**When it happens:**
- AI chose wrong mod type
- Uses API methods that don't exist (no error, just no effect)
- Code logic is wrong

**Current behavior:**
- ⚠️ Mod "works" but does nothing
- User has no idea why

**Proposed solution:**

#### A. API method validation
```javascript
// Create a proxy for the mod API that logs unknown method calls
function createValidatedModAPI(baseAPI, modId, modName) {
  const validMethods = new Set([
    'getMyPlayer', 'getPlayer', 'setHealth', 'setArmor', 
    'setInvulnerable', 'teleport'
  ]);
  
  return new Proxy(baseAPI, {
    get(target, prop) {
      if (!validMethods.has(prop)) {
        console.warn(\`⚠️  Mod "\${modName}" tried to use unknown API method: api.\${prop}()\`);
        console.warn(\`   Available methods: \${Array.from(validMethods).join(', ')}\`);
        
        // Return a no-op function instead of undefined
        return function() {
          console.warn(\`   api.\${prop}() does nothing - this method doesn't exist\`);
          return undefined;
        };
      }
      return target[prop];
    }
  });
}

// Use in executeActiveMods
const modAPI = createValidatedModAPI(baseModAPI, mod.id, mod.name);
```

#### B. Success feedback
```javascript
// For persistent mods, track if they're actually doing anything
function executeActiveMods(now) {
  const activeMods = getActiveMods();

  for (const mod of activeMods) {
    try {
      // Track API calls
      let apiCallCount = 0;
      const trackedAPI = new Proxy(modAPI, {
        get(target, prop) {
          const value = target[prop];
          if (typeof value === 'function') {
            return function(...args) {
              apiCallCount++;
              return value.apply(target, args);
            };
          }
          return value;
        }
      });

      const modFunction = new Function("api", mod.code);
      modFunction(trackedAPI);
      
      // If mod never calls any API methods, it's probably broken
      if (!mod.everCalledAPI && apiCallCount === 0) {
        mod.ticksSinceLastCall = (mod.ticksSinceLastCall || 0) + 1;
        
        // After 3 seconds of no API calls, warn
        if (mod.ticksSinceLastCall === 180) { // 3 seconds at 60Hz
          io.to(mod.player_id).emit('modWarning', {
            modId: mod.id,
            modName: mod.name,
            message: \`Your mod "\${mod.name}" hasn't done anything yet. It might not be working correctly.\`
          });
        }
      } else {
        mod.everCalledAPI = true;
        mod.ticksSinceLastCall = 0;
      }
      
    } catch (error) {
      // ... error handling ...
    }
  }
}
```

**User Experience:**
- Warnings in console for developers
- Optional notifications if mod seems inactive
- Graceful no-op instead of crashes

---

## Error Message Guidelines

### For Users (in-game UI):
- ✅ **Friendly, non-technical**
- ✅ **Actionable** (what can they do?)
- ✅ **Clear about retry** (can they try again?)

**Examples:**
- ❌ "TypeError: Cannot read properties of undefined (reading '0')"
- ✅ "The AI couldn't generate code for your request. Try rephrasing it or using a simpler description."

- ❌ "Runtime error in mod execution"
- ✅ "Your mod ran into an error and was deactivated. It might be using features that don't exist in the game yet."

### For Developers (console logs):
- ✅ **Technical details**
- ✅ **Stack traces**
- ✅ **Mod code for debugging**

---

## Implementation Priority

### High Priority (fix crashes):
1. ✅ Fix line 437 crash (Gemini response validation)
2. ✅ Add try/catch to server mod execution
3. ✅ Validate generated code before saving

### Medium Priority (better UX):
4. ⚠️ Auto-deactivate failing persistent mods
5. ⚠️ Client-side error notifications
6. ⚠️ Friendly error messages

### Low Priority (nice-to-have):
7. 💡 API method validation with Proxy
8. 💡 Track if mods are actually working
9. 💡 Suggest fixes for common errors
10. 💡 "Mod debugger" UI for developers

---

## Testing Error Scenarios

```javascript
// Test cases for error handling
const errorTestCases = [
  {
    name: "Syntax error",
    prompt: "make me invincible",
    inject: "}}}}}", // Force syntax error
    expectedError: "SYNTAX_ERROR"
  },
  {
    name: "Unknown API method",
    code: "api.doesNotExist();",
    expectedBehavior: "No-op, warning logged"
  },
  {
    name: "Runtime error",
    code: "const x = undefined; x.foo.bar;",
    expectedBehavior: "Caught, mod deactivated after threshold"
  },
  {
    name: "Gemini API timeout",
    mock: "timeout after 30s",
    expectedError: "AI service error, retry available"
  },
  {
    name: "Content blocked",
    prompt: "make everyone explode and die",
    expectedError: "Content policy violation, retry available"
  }
];
```

---

## Summary

**Key Principles:**
1. **Never crash the server** - Always catch errors
2. **Fail gracefully** - Deactivate broken mods, don't spam errors
3. **User-friendly messages** - Non-technical, actionable
4. **Developer-friendly logs** - Technical details in console
5. **Auto-recovery** - Retry when possible, deactivate when not

**Error Response Format:**
```javascript
{
  error: "Technical error type",
  reason: "Technical reason (optional)",
  userMessage: "Friendly message for the player",
  canRetry: true/false,
  debugInfo: { /* dev-only details */ }
}
```
