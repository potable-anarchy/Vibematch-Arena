// Server-side Mod Editor
// Allows writing and executing mods that run on the server

class ServerModEditor {
  constructor() {
    this.socket = null;
    this.createUI();
  }

  setSocket(socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on("serverModResult", (data) => {
      if (data.error) {
        this.showStatus(`❌ Error: ${data.error}`, "#ff3366");
        console.error("Server mod error:", data.stack);
      } else {
        this.showStatus(`✅ ${data.result}`, "#00ff88");
      }
    });

    this.socket.on("serverModMessage", (data) => {
      this.showStatus(`📢 ${data.message}`, "#ffaa00");
    });

    this.socket.on("serverModAction", (data) => {
      // Display server mod actions to all players
      const msg = `🔧 ${data.action}: ${data.targetName}`;
      this.showStatus(msg, "#00aaff");
    });
  }

  createUI() {
    // Create container
    const container = document.createElement("div");
    container.id = "serverModEditor";
    container.style.cssText = `
      position: fixed;
      right: 20px;
      top: 20px;
      width: 400px;
      background: rgba(20, 20, 30, 0.95);
      border: 2px solid #00ff88;
      border-radius: 8px;
      padding: 15px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      color: #00ff88;
      z-index: 10000;
      display: none;
    `;

    // Title
    const title = document.createElement("div");
    title.textContent = "Server Mod Console";
    title.style.cssText = `
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
      text-align: center;
      color: #00ff88;
    `;

    // Code textarea
    const textarea = document.createElement("textarea");
    textarea.id = "serverModCode";
    textarea.placeholder = `// Example: Give yourself god mode
const players = api.getAllPlayers();
const me = players.find(p => p.id === "${this.socket?.id || 'YOUR_ID'}");
if (me) {
  // Set health to max repeatedly (simulates god mode)
  setInterval(() => {
    api.setHealth(me.id, 100);
  }, 100);
  api.log("God mode enabled!");
  return "God mode active";
}`;
    textarea.style.cssText = `
      width: 100%;
      height: 200px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #00ff88;
      border-radius: 4px;
      padding: 8px;
      color: #00ff88;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      resize: vertical;
      margin-bottom: 10px;
    `;

    // Buttons container
    const buttonsDiv = document.createElement("div");
    buttonsDiv.style.cssText = `
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    `;

    // Execute button
    const executeBtn = document.createElement("button");
    executeBtn.textContent = "Execute";
    executeBtn.style.cssText = `
      flex: 1;
      padding: 8px;
      background: #00ff88;
      color: #000;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 13px;
    `;
    executeBtn.onclick = () => this.executeCode();

    // Clear button
    const clearBtn = document.createElement("button");
    clearBtn.textContent = "Clear";
    clearBtn.style.cssText = `
      flex: 1;
      padding: 8px;
      background: #ff3366;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 13px;
    `;
    clearBtn.onclick = () => {
      textarea.value = "";
      this.showStatus("Code cleared", "#ffaa00");
    };

    // API Reference button
    const apiBtn = document.createElement("button");
    apiBtn.textContent = "API";
    apiBtn.style.cssText = `
      padding: 8px 12px;
      background: #0088ff;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 13px;
    `;
    apiBtn.onclick = () => this.toggleAPIReference();

    buttonsDiv.appendChild(executeBtn);
    buttonsDiv.appendChild(clearBtn);
    buttonsDiv.appendChild(apiBtn);

    // Status display
    const status = document.createElement("div");
    status.id = "serverModStatus";
    status.style.cssText = `
      padding: 8px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #00ff88;
      border-radius: 4px;
      min-height: 30px;
      max-height: 100px;
      overflow-y: auto;
      font-size: 12px;
      margin-bottom: 10px;
    `;
    status.textContent = "Ready to execute server mods";

    // API Reference (hidden by default)
    const apiRef = document.createElement("div");
    apiRef.id = "serverModAPIRef";
    apiRef.style.cssText = `
      display: none;
      padding: 10px;
      background: rgba(0, 0, 0, 0.7);
      border: 1px solid #0088ff;
      border-radius: 4px;
      font-size: 11px;
      max-height: 300px;
      overflow-y: auto;
      margin-top: 10px;
    `;
    apiRef.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px; color: #0088ff;">Server Mod API Reference</div>
      <div style="line-height: 1.6;">
        <strong>api.getGameState()</strong> - Get all game state<br>
        <strong>api.getAllPlayers()</strong> - Get all players and bots<br>
        <strong>api.setHealth(id, health)</strong> - Set player health (0-100)<br>
        <strong>api.setArmor(id, armor)</strong> - Set player armor (0-100)<br>
        <strong>api.teleportPlayer(id, x, y)</strong> - Teleport player<br>
        <strong>api.giveWeapon(id, weapon)</strong> - Give weapon (pistol, smg, shotgun, rifle)<br>
        <strong>api.spawnPickup(x, y, type)</strong> - Spawn pickup<br>
        <strong>api.killPlayer(id)</strong> - Kill a player<br>
        <strong>api.log(...args)</strong> - Log to server console<br>
        <strong>api.broadcast(msg)</strong> - Send message to all players<br>
      </div>
    `;

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 25px;
      height: 25px;
      background: #ff3366;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 18px;
      line-height: 20px;
      padding: 0;
    `;
    closeBtn.onclick = () => this.hide();

    container.appendChild(closeBtn);
    container.appendChild(title);
    container.appendChild(textarea);
    container.appendChild(buttonsDiv);
    container.appendChild(status);
    container.appendChild(apiRef);

    document.body.appendChild(container);
    this.container = container;
    this.textarea = textarea;
    this.status = status;
    this.apiRef = apiRef;
  }

  toggleAPIReference() {
    if (this.apiRef.style.display === "none") {
      this.apiRef.style.display = "block";
    } else {
      this.apiRef.style.display = "none";
    }
  }

  executeCode() {
    const code = this.textarea.value.trim();
    if (!code) {
      this.showStatus("⚠️ No code to execute", "#ffaa00");
      return;
    }

    if (!this.socket) {
      this.showStatus("❌ Not connected to server", "#ff3366");
      return;
    }

    this.showStatus("⏳ Executing...", "#ffaa00");
    this.socket.emit("executeServerMod", { code });
  }

  showStatus(message, color = "#00ff88") {
    this.status.style.color = color;
    this.status.textContent = message;
  }

  show() {
    this.container.style.display = "block";
  }

  hide() {
    this.container.style.display = "none";
  }

  toggle() {
    if (this.container.style.display === "none") {
      this.show();
    } else {
      this.hide();
    }
  }
}

// Export for use in main game
window.ServerModEditor = ServerModEditor;
