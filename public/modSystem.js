// Live-coding mod system
export class ModSystem {
  constructor(game) {
    this.game = game;
    this.mods = new Map();
    this.hooks = {
      onPlayerDraw: [],
      onHit: [],
      onKill: [],
      onPickup: [],
      onShoot: [],
      onUpdate: [],
      onRender: [],
    };
    this.modsEnabled = this.checkModsEnabled();

    // Enhanced error handling and safety
    this.failedMods = new Map(); // Track mods that failed to load
    this.disabledMods = new Set(); // Mods disabled due to errors
    this.hookSnapshots = new Map(); // Store hook state before loading mods
    this.executionTimeouts = new Map(); // Track hook execution times
    this.MAX_HOOK_EXECUTION_TIME = 100; // ms - prevent infinite loops
    this.MAX_CONSECUTIVE_ERRORS = 3; // Auto-disable after this many errors
    this.errorCounts = new Map(); // Track errors per mod
  }

  // Check if mods are enabled via URL parameter
  checkModsEnabled() {
    const params = new URLSearchParams(window.location.search);
    const modsParam = params.get("mods");
    if (modsParam === "false" || modsParam === "0") {
      console.log("🚫 Mods disabled via URL parameter");
      return false;
    }
    return true;
  }

  // Create a snapshot of current hook state (for rollback on error)
  createHookSnapshot() {
    const snapshot = {};
    for (const hookName in this.hooks) {
      snapshot[hookName] = [...this.hooks[hookName]];
    }
    return snapshot;
  }

  // Restore hooks from a snapshot
  restoreHookSnapshot(snapshot) {
    for (const hookName in snapshot) {
      this.hooks[hookName] = [...snapshot[hookName]];
    }
  }

  // Validate mod code before execution (basic checks)
  validateModCode(code, name) {
    const validationErrors = [];

    // Check for obviously dangerous patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/g, message: "eval() is not allowed" },
      { pattern: /Function\s*\(/g, message: "Function constructor is not allowed" },
      { pattern: /import\s+/g, message: "dynamic imports are not allowed" },
      { pattern: /require\s*\(/g, message: "require() is not allowed" },
    ];

    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(code)) {
        validationErrors.push(message);
      }
    }

    // Check for syntax errors by attempting to parse
    try {
      new Function(code);
    } catch (error) {
      validationErrors.push(`Syntax error: ${error.message}`);
    }

    return {
      valid: validationErrors.length === 0,
      errors: validationErrors,
    };
  }

  // Record a mod error and check if it should be auto-disabled
  recordModError(name, error) {
    const count = (this.errorCounts.get(name) || 0) + 1;
    this.errorCounts.set(name, count);

    if (count >= this.MAX_CONSECUTIVE_ERRORS) {
      this.disabledMods.add(name);
      console.error(
        `🚫 Mod "${name}" auto-disabled after ${count} consecutive errors`,
      );
      console.error(`   Last error: ${error.message}`);
      this.unloadMod(name);
      return true; // Mod was disabled
    }

    return false; // Mod still active
  }

  // Clear error count for a mod (called on successful execution)
  clearModErrors(name) {
    this.errorCounts.delete(name);
  }

  // Check if a mod is disabled
  isModDisabled(name) {
    return this.disabledMods.has(name);
  }

  // Re-enable a disabled mod
  enableMod(name) {
    this.disabledMods.delete(name);
    this.errorCounts.delete(name);
    console.log(`✅ Mod "${name}" re-enabled`);
  }

  // Load a mod from a file
  async loadModFromFile(filename, skipCache = false) {
    if (!this.modsEnabled) {
      return { success: false, message: "Mods are disabled" };
    }

    try {
      // Add cache-busting timestamp to force fresh fetch when needed
      const cacheBuster = skipCache ? `?t=${Date.now()}` : '';
      const response = await fetch(`/mods/${filename}${cacheBuster}`);
      if (!response.ok) {
        throw new Error(`Failed to load mod file: ${filename}`);
      }
      const code = await response.text();
      const modName = filename.replace(".js", "");
      return this.loadMod(modName, code);
    } catch (error) {
      console.error(`Error loading mod file "${filename}":`, error);
      return { success: false, message: error.message };
    }
  }

  // Discover available mods in the mods directory
  async discoverMods() {
    if (!this.modsEnabled) {
      return [];
    }

    try {
      // Try to fetch the mods directory listing
      // This requires the server to serve directory listings or a manifest file
      const response = await fetch("/mods/");
      const text = await response.text();

      // Simple HTML parsing to find .js files
      const matches = text.match(/href="([^"]+\.js)"/g) || [];
      return matches
        .map((m) => m.match(/href="([^"]+)"/)[1])
        .filter((f) => f.endsWith(".js"));
    } catch (error) {
      console.log("Could not discover mods automatically");
      return [];
    }
  }

  // Load a mod from code string
  loadMod(name, code) {
    if (!this.modsEnabled) {
      return { success: false, message: "Mods are disabled" };
    }

    // Check if mod is disabled due to previous errors
    if (this.isModDisabled(name)) {
      const message = `Mod "${name}" is disabled due to previous errors. Use enableMod("${name}") to re-enable.`;
      console.warn(`⚠️ ${message}`);
      return { success: false, message };
    }

    // Validate mod code before loading
    const validation = this.validateModCode(code, name);
    if (!validation.valid) {
      const message = `Validation failed: ${validation.errors.join(", ")}`;
      console.error(`❌ Mod "${name}": ${message}`);
      this.failedMods.set(name, {
        code,
        error: message,
        timestamp: Date.now(),
      });
      return { success: false, message };
    }

    // Create snapshot before loading (for rollback if needed)
    const snapshot = this.createHookSnapshot();

    try {
      // Create mod context with access to game state
      const modContext = {
        game: this.game,
        registerHook: (hookName, fn) => {
          if (this.hooks[hookName]) {
            this.hooks[hookName].push({ name, fn });
          }
        },
        console: console,
        Math: Math,
        Date: Date,
      };

      // Execute mod code in sandboxed context
      const modFunction = new Function(
        "ctx",
        `
        with (ctx) {
          ${code}
        }
        `,
      );

      modFunction(modContext);

      this.mods.set(name, { code, loaded: Date.now() });
      this.failedMods.delete(name); // Clear any previous failure
      this.clearModErrors(name); // Clear error count on successful load
      console.log(`✅ Mod loaded: ${name}`);
      return { success: true, message: `Mod "${name}" loaded successfully` };
    } catch (error) {
      console.error(`❌ Error loading mod "${name}":`, error);

      // Rollback hooks to previous state
      this.restoreHookSnapshot(snapshot);
      console.warn(`🔄 Rolled back hooks due to error in mod "${name}"`);

      // Record the failure
      this.failedMods.set(name, {
        code,
        error: error.message,
        timestamp: Date.now(),
      });

      return { success: false, message: error.message };
    }
  }

  // Unload a mod
  unloadMod(name) {
    // Remove all hooks from this mod
    for (const hookName in this.hooks) {
      this.hooks[hookName] = this.hooks[hookName].filter(
        (h) => h.name !== name,
      );
    }

    this.mods.delete(name);
    console.log(`🗑️ Mod unloaded: ${name}`);
  }

  // Reload a mod (useful for live-coding)
  reloadMod(name, code) {
    this.unloadMod(name);
    return this.loadMod(name, code);
  }

  // Call all hooks for a specific event with timeout protection
  callHook(hookName, ...args) {
    if (!this.hooks[hookName]) return;

    // Filter out hooks from disabled mods
    const activeHooks = this.hooks[hookName].filter(
      (hook) => !this.isModDisabled(hook.name),
    );

    for (const hook of activeHooks) {
      try {
        // Execute with timeout protection
        const startTime = performance.now();

        // Create a timeout detector
        let timeoutOccurred = false;
        const timeoutId = setTimeout(() => {
          timeoutOccurred = true;
          console.error(
            `⏱️ Mod "${hook.name}" hook "${hookName}" exceeded timeout (${this.MAX_HOOK_EXECUTION_TIME}ms)`,
          );
        }, this.MAX_HOOK_EXECUTION_TIME);

        // Execute the hook
        hook.fn(...args);

        // Clear timeout and check execution time
        clearTimeout(timeoutId);
        const executionTime = performance.now() - startTime;

        // If timeout occurred, record error and potentially disable mod
        if (timeoutOccurred) {
          const error = new Error(
            `Hook execution timeout (>${this.MAX_HOOK_EXECUTION_TIME}ms)`,
          );
          const wasDisabled = this.recordModError(hook.name, error);
          if (!wasDisabled && executionTime > this.MAX_HOOK_EXECUTION_TIME * 2) {
            // If it took more than 2x the timeout, force disable immediately
            console.error(
              `🚫 Force-disabling mod "${hook.name}" due to severe timeout (${executionTime.toFixed(2)}ms)`,
            );
            this.disabledMods.add(hook.name);
            this.unloadMod(hook.name);
          }
        } else {
          // Successful execution - clear error count
          this.clearModErrors(hook.name);

          // Warn about slow hooks (but don't error)
          if (executionTime > this.MAX_HOOK_EXECUTION_TIME * 0.5) {
            console.warn(
              `⚠️ Mod "${hook.name}" hook "${hookName}" is slow (${executionTime.toFixed(2)}ms)`,
            );
          }
        }
      } catch (error) {
        console.error(`❌ Error in mod "${hook.name}" hook "${hookName}":`, error);

        // Record the error and potentially auto-disable the mod
        const wasDisabled = this.recordModError(hook.name, error);

        if (wasDisabled) {
          // Remove this hook from the active list so it doesn't run again
          this.hooks[hookName] = this.hooks[hookName].filter(
            (h) => h.name !== hook.name,
          );
        }
      }
    }
  }

  // Get list of loaded mods
  getLoadedMods() {
    return Array.from(this.mods.entries()).map(([name, data]) => ({
      name,
      loadedAt: data.loaded,
      disabled: this.isModDisabled(name),
      errorCount: this.errorCounts.get(name) || 0,
    }));
  }

  // Get list of failed mods
  getFailedMods() {
    return Array.from(this.failedMods.entries()).map(([name, data]) => ({
      name,
      error: data.error,
      failedAt: data.timestamp,
    }));
  }

  // Get list of disabled mods
  getDisabledMods() {
    return Array.from(this.disabledMods).map((name) => ({
      name,
      errorCount: this.errorCounts.get(name) || 0,
    }));
  }

  // Get detailed status of all mods
  getModStatus() {
    return {
      loaded: this.getLoadedMods(),
      failed: this.getFailedMods(),
      disabled: this.getDisabledMods(),
      enabled: this.modsEnabled,
    };
  }

  // Enable live-coding hot-reload (watches for file changes)
  async enableHotReload(pollInterval = 2000) {
    if (!this.modsEnabled) return;

    console.log("🔥 Hot-reload enabled - mods will auto-update on file changes");

    // Store file hashes to detect changes
    this.fileHashes = new Map();

    // Watch for changes to loaded mods
    setInterval(async () => {
      try {
        const response = await fetch(`/mods/mods.json?t=${Date.now()}`);
        if (!response.ok) return;

        const data = await response.json();
        const enabledMods = data.mods.filter((mod) => mod.enabled);

        for (const mod of enabledMods) {
          // Fetch with cache-busting to check if file changed
          const fileResponse = await fetch(`/mods/${mod.file}?t=${Date.now()}`);
          if (!fileResponse.ok) continue;

          const code = await fileResponse.text();
          const hash = this.simpleHash(code);
          const modName = mod.file.replace(".js", "");

          // Check if file changed
          const prevHash = this.fileHashes.get(modName);
          if (prevHash && prevHash !== hash) {
            console.log(`🔄 Hot-reloading: ${mod.name} (file changed)`);
            this.reloadMod(modName, code);
          }

          this.fileHashes.set(modName, hash);
        }
      } catch (error) {
        // Silently ignore polling errors
      }
    }, pollInterval);
  }

  // Simple hash function for detecting file changes
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}
