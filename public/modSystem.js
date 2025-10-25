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
      console.log(`✅ Mod loaded: ${name}`);
      return { success: true, message: `Mod "${name}" loaded successfully` };
    } catch (error) {
      console.error(`❌ Error loading mod "${name}":`, error);
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

  // Call all hooks for a specific event
  callHook(hookName, ...args) {
    if (!this.hooks[hookName]) return;

    for (const hook of this.hooks[hookName]) {
      try {
        hook.fn(...args);
      } catch (error) {
        console.error(`Error in mod "${hook.name}" hook "${hookName}":`, error);
      }
    }
  }

  // Get list of loaded mods
  getLoadedMods() {
    return Array.from(this.mods.entries()).map(([name, data]) => ({
      name,
      loadedAt: data.loaded,
    }));
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
