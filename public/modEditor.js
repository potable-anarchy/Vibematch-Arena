// In-game mod editor (non-intrusive)
import { GeminiClient } from "./geminiClient.js";

export class ModEditor {
  constructor(modSystem) {
    this.modSystem = modSystem;
    this.visible = false;
    this.currentMod = "";
    this.geminiClient = new GeminiClient();
    this.isGenerating = false;
    this.createUI();
  }

  async createUI() {
    // Create floating editor window
    this.container = document.createElement("div");
    this.container.id = "modEditor";
    this.container.style.cssText = `
      position: fixed;
      top: 20%;
      right: 20px;
      width: 500px;
      height: 400px;
      background: rgba(10, 10, 20, 0.95);
      border: 2px solid #66ccff;
      border-radius: 8px;
      display: none;
      z-index: 9999;
      flex-direction: column;
      box-shadow: 0 0 30px rgba(102, 204, 255, 0.3);
    `;

    // Header
    const header = document.createElement("div");
    header.style.cssText = `
      background: #1a1a2e;
      padding: 10px;
      border-bottom: 1px solid #66ccff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
    `;
    header.innerHTML = `
      <div style="display: flex; gap: 10px; align-items: center;">
        <span style="color: #66ccff; font-family: monospace; font-weight: bold;">MOD EDITOR</span>
        <span id="modTypeIndicator" style="
          background: rgba(102, 204, 255, 0.2);
          border: 1px solid #66ccff;
          color: #66ccff;
          padding: 5px 12px;
          border-radius: 3px;
          font-family: monospace;
          font-weight: bold;
          font-size: 11px;
        ">AUTO-DETECT</span>
      </div>
      <button id="closeModEditor" style="
        background: #ff3366;
        border: none;
        color: white;
        padding: 5px 10px;
        cursor: pointer;
        border-radius: 3px;
        font-family: monospace;
      ">✕</button>
    `;

    this.detectedModType = null;

    // Mod name input
    const nameInput = document.createElement("div");
    nameInput.style.cssText = `
      padding: 10px;
      border-bottom: 1px solid rgba(102, 204, 255, 0.2);
    `;
    nameInput.innerHTML = `
      <input
        type="text"
        id="modName"
        placeholder="Mod name..."
        value="myMod"
        style="
          width: 100%;
          background: #1a1a2e;
          border: 1px solid #66ccff;
          color: #fff;
          padding: 8px;
          font-family: monospace;
          border-radius: 3px;
        "
      />
    `;

    // Code editor
    const editorWrapper = document.createElement("div");
    editorWrapper.style.cssText = `
      flex: 1;
      overflow: hidden;
      position: relative;
    `;

    this.textarea = document.createElement("textarea");
    this.textarea.id = "modCode";
    this.textarea.style.cssText = `
      width: 100%;
      height: 100%;
      background: #0a0a14;
      border: none;
      color: #66ff66;
      padding: 10px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      resize: none;
      outline: none;
    `;
    this.textarea.placeholder = '// Describe what you want the mod to do, then click GENERATE CODE\n// Example: "Add screen shake when I shoot"\n// AI will automatically detect if the code should run on client or server';
    editorWrapper.appendChild(this.textarea);

    // Generate Code button overlay
    const generateButton = document.createElement("button");
    generateButton.id = "generateCode";
    generateButton.innerHTML = "🤖 GENERATE CODE";
    generateButton.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      padding: 8px 15px;
      cursor: pointer;
      border-radius: 5px;
      font-family: monospace;
      font-weight: bold;
      font-size: 12px;
      box-shadow: 0 2px 10px rgba(102, 126, 234, 0.4);
      transition: all 0.2s;
      z-index: 10;
    `;
    generateButton.onmouseover = () => {
      generateButton.style.transform = "translateY(-2px)";
      generateButton.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.6)";
    };
    generateButton.onmouseout = () => {
      generateButton.style.transform = "translateY(0)";
      generateButton.style.boxShadow = "0 2px 10px rgba(102, 126, 234, 0.4)";
    };
    editorWrapper.appendChild(generateButton);

    // File browser
    const fileBrowser = document.createElement("div");
    fileBrowser.style.cssText = `
      padding: 10px;
      border-top: 1px solid rgba(102, 204, 255, 0.2);
      display: flex;
      gap: 10px;
    `;
    fileBrowser.innerHTML = `
      <select id="modFileList" style="
        flex: 1;
        background: #1a1a2e;
        border: 1px solid #ffaa00;
        color: #fff;
        padding: 8px;
        font-family: monospace;
        border-radius: 3px;
        cursor: pointer;
      ">
        <option value="">-- Load from file --</option>
      </select>
      <button id="loadFromFile" style="
        background: #ffaa00;
        border: none;
        color: #0a0a14;
        padding: 8px 15px;
        cursor: pointer;
        border-radius: 3px;
        font-family: monospace;
        font-weight: bold;
      ">LOAD FILE</button>
    `;

    // Buttons
    const buttonBar = document.createElement("div");
    buttonBar.style.cssText = `
      padding: 10px;
      border-top: 1px solid rgba(102, 204, 255, 0.2);
      display: flex;
      gap: 10px;
    `;
    buttonBar.innerHTML = `
      <button id="loadMod" style="
        flex: 1;
        background: #66ccff;
        border: none;
        color: #0a0a14;
        padding: 10px;
        cursor: pointer;
        border-radius: 3px;
        font-family: monospace;
        font-weight: bold;
      ">LOAD MOD</button>
      <button id="reloadMod" style="
        flex: 1;
        background: #ffaa00;
        border: none;
        color: #0a0a14;
        padding: 10px;
        cursor: pointer;
        border-radius: 3px;
        font-family: monospace;
        font-weight: bold;
      ">RELOAD</button>
      <button id="unloadMod" style="
        background: #ff3366;
        border: none;
        color: white;
        padding: 10px 20px;
        cursor: pointer;
        border-radius: 3px;
        font-family: monospace;
        font-weight: bold;
      ">UNLOAD</button>
    `;

    // Status message
    this.statusDiv = document.createElement("div");
    this.statusDiv.id = "modStatus";
    this.statusDiv.style.cssText = `
      padding: 8px;
      background: #1a1a2e;
      color: #66ccff;
      font-family: monospace;
      font-size: 12px;
      border-top: 1px solid rgba(102, 204, 255, 0.2);
      min-height: 24px;
    `;

    // Assemble
    this.container.appendChild(header);
    this.container.appendChild(nameInput);
    this.container.appendChild(editorWrapper);
    this.container.appendChild(fileBrowser);
    this.container.appendChild(buttonBar);
    this.container.appendChild(this.statusDiv);
    document.body.appendChild(this.container);

    // Load available mods
    this.loadAvailableMods();

    // Event listeners
    document
      .getElementById("closeModEditor")
      .addEventListener("click", () => this.hide());
    document
      .getElementById("loadMod")
      .addEventListener("click", () => this.loadCurrentMod());
    document
      .getElementById("reloadMod")
      .addEventListener("click", () => this.reloadCurrentMod());
    document
      .getElementById("unloadMod")
      .addEventListener("click", () => this.unloadCurrentMod());
    document
      .getElementById("loadFromFile")
      .addEventListener("click", () => this.loadSelectedFile());
    document
      .getElementById("generateCode")
      .addEventListener("click", () => this.generateCode());

    // Make draggable
    this.makeDraggable(header);

    // Keyboard shortcut to toggle (backtick key)
    document.addEventListener("keydown", (e) => {
      if (e.key === "`" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        this.toggle();
      }
      // Ctrl+Enter to reload mod
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && this.visible) {
        e.preventDefault();
        this.reloadCurrentMod();
      }
    });
  }

  makeDraggable(header) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    header.addEventListener("mousedown", (e) => {
      isDragging = true;
      initialX = e.clientX - this.container.offsetLeft;
      initialY = e.clientY - this.container.offsetTop;
    });

    document.addEventListener("mousemove", (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        this.container.style.left = currentX + "px";
        this.container.style.top = currentY + "px";
        this.container.style.right = "auto";
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  show() {
    this.visible = true;
    this.container.style.display = "flex";
  }

  hide() {
    this.visible = false;
    this.container.style.display = "none";
  }

  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  setSocket(socket) {
    this.socket = socket;
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on("serverModResult", (data) => {
      if (data.error) {
        this.showStatus(`❌ Server Error: ${data.error}`, "#ff3366");
        console.error("Server mod error:", data.stack);
      } else {
        this.showStatus(`✅ ${data.result}`, "#66ff66");
      }
    });

    this.socket.on("serverModMessage", (data) => {
      this.showStatus(`📢 ${data.message}`, "#ffaa00");
    });

    this.socket.on("serverModAction", (data) => {
      const msg = `🔧 ${data.action}: ${data.targetName}`;
      this.showStatus(msg, "#00aaff");
    });
  }

  updateModTypeIndicator(type) {
    const indicator = document.getElementById("modTypeIndicator");
    if (!indicator) return;

    if (type === "client") {
      indicator.textContent = "CLIENT";
      indicator.style.background = "#66ccff";
      indicator.style.color = "#0a0a14";
      indicator.style.border = "none";
    } else if (type === "server") {
      indicator.textContent = "SERVER";
      indicator.style.background = "#ff9500";
      indicator.style.color = "#0a0a14";
      indicator.style.border = "none";
    } else {
      indicator.textContent = "AUTO-DETECT";
      indicator.style.background = "rgba(102, 204, 255, 0.2)";
      indicator.style.color = "#66ccff";
      indicator.style.border = "1px solid #66ccff";
    }
  }

  loadCurrentMod() {
    const name = document.getElementById("modName").value.trim();
    const code = this.textarea.value;

    if (!name) {
      this.showStatus("❌ Please enter a mod name", "#ff3366");
      return;
    }

    // Use detected mod type from AI generation
    if (this.detectedModType === "server") {
      // Execute server-side mod
      if (!this.socket) {
        this.showStatus("❌ Not connected to server", "#ff3366");
        return;
      }

      this.showStatus("⏳ Executing server mod...", "#ffaa00");
      this.socket.emit("executeServerMod", { code, name });
    } else {
      // Load client-side mod (default if not specified)
      const result = this.modSystem.loadMod(name, code);
      if (result.success) {
        this.showStatus(`✅ ${result.message}`, "#66ff66");

        // Start 30-second auto-disable timer
        this.startModTimer(name);

        // Save to server database for tracking
        if (this.socket) {
          this.socket.emit("saveClientMod", { name, code });
        }
      } else {
        this.showStatus(`❌ ${result.message}`, "#ff3366");
      }
    }
  }

  reloadCurrentMod() {
    const name = document.getElementById("modName").value.trim();
    const code = this.textarea.value;

    if (!name) {
      this.showStatus("❌ Please enter a mod name", "#ff3366");
      return;
    }

    if (this.detectedModType === "server") {
      // Re-execute server-side mod
      if (!this.socket) {
        this.showStatus("❌ Not connected to server", "#ff3366");
        return;
      }

      this.showStatus("⏳ Re-executing server mod...", "#ffaa00");
      this.socket.emit("executeServerMod", { code, name });
    } else {
      // Reload client-side mod
      const result = this.modSystem.reloadMod(name, code);
      if (result.success) {
        this.showStatus(`🔄 Mod "${name}" reloaded`, "#ffaa00");

        // Restart 30-second auto-disable timer
        this.startModTimer(name);
      } else {
        this.showStatus(`❌ ${result.message}`, "#ff3366");
      }
    }
  }

  startModTimer(name) {
    // Clear existing timer if any
    if (this.modTimers && this.modTimers[name]) {
      clearTimeout(this.modTimers[name]);
    }

    // Initialize timers map if needed
    if (!this.modTimers) {
      this.modTimers = {};
    }

    // Set 30-second timer to auto-disable the mod
    this.modTimers[name] = setTimeout(() => {
      this.modSystem.unloadMod(name);
      this.showStatus(`⏱️ Mod "${name}" auto-disabled after 30 seconds`, "#ffaa00");
      delete this.modTimers[name];
    }, 30000);

    console.log(`⏱️ Mod "${name}" will auto-disable in 30 seconds`);
  }

  unloadCurrentMod() {
    const name = document.getElementById("modName").value.trim();

    if (!name) {
      this.showStatus("❌ Please enter a mod name", "#ff3366");
      return;
    }

    if (this.detectedModType === "server") {
      this.showStatus(
        "⚠️ Server mods cannot be unloaded (restart required)",
        "#ffaa00",
      );
    } else {
      // Clear timer if exists
      if (this.modTimers && this.modTimers[name]) {
        clearTimeout(this.modTimers[name]);
        delete this.modTimers[name];
      }

      this.modSystem.unloadMod(name);
      this.showStatus(`🗑️ Mod "${name}" unloaded`, "#66ccff");
    }
  }

  showStatus(message, color = "#66ccff") {
    this.statusDiv.textContent = message;
    this.statusDiv.style.color = color;
  }

  async loadAvailableMods() {
    try {
      const response = await fetch("/mods/mods.json");
      if (!response.ok) return;

      const data = await response.json();
      const select = document.getElementById("modFileList");

      data.mods.forEach((mod) => {
        const option = document.createElement("option");
        option.value = mod.file;
        option.textContent = `${mod.name} - ${mod.description}`;
        select.appendChild(option);
      });
    } catch (error) {
      console.log("Could not load mods manifest:", error);
    }
  }

  async loadSelectedFile() {
    const select = document.getElementById("modFileList");
    const filename = select.value;

    if (!filename) {
      this.showStatus("❌ Please select a mod file", "#ff3366");
      return;
    }

    try {
      const response = await fetch(`/mods/${filename}`);
      if (!response.ok) {
        throw new Error("Failed to load mod file");
      }

      const code = await response.text();
      const modName = filename.replace(".js", "");

      // Update UI
      document.getElementById("modName").value = modName;
      this.textarea.value = code;

      // Load the mod
      const result = this.modSystem.loadMod(modName, code);
      if (result.success) {
        this.showStatus(`✅ Loaded ${modName} from file`, "#66ff66");
      } else {
        this.showStatus(`❌ ${result.message}`, "#ff3366");
      }
    } catch (error) {
      this.showStatus(`❌ Error loading file: ${error.message}`, "#ff3366");
    }
  }

  async generateCode() {
    if (this.isGenerating) {
      this.showStatus("⏳ Already generating code...", "#ffaa00");
      return;
    }

    const userPrompt = this.textarea.value.trim();

    if (!userPrompt) {
      this.showStatus(
        "❌ Please enter a description of what you want the mod to do",
        "#ff3366",
      );
      return;
    }

    const generateButton = document.getElementById("generateCode");
    const originalButtonText = generateButton.innerHTML;

    try {
      this.isGenerating = true;

      // Update button state
      generateButton.innerHTML = "⏳ GENERATING...";
      generateButton.style.background =
        "linear-gradient(135deg, #ffaa00 0%, #ff8800 100%)";
      generateButton.disabled = true;
      generateButton.style.cursor = "not-allowed";

      this.showStatus("🤖 Generating code with AI...", "#ffaa00");

      // Call Gemini API
      const result = await this.geminiClient.generateModCode(userPrompt);

      // Update textarea with generated code
      this.textarea.value = result.code;

      // Store detected mod type
      this.detectedModType = result.type;
      this.updateModTypeIndicator(result.type);

      this.showStatus(
        `✅ Code generated successfully! Detected as ${result.type.toUpperCase()} mod. Click LOAD MOD to test.`,
        "#66ff66",
      );
    } catch (error) {
      console.error("Code generation error:", error);

      // Show the actual error message from the server
      this.showStatus(`❌ ${error.message}`, "#ff3366");
    } finally {
      this.isGenerating = false;

      // Restore button state
      generateButton.innerHTML = originalButtonText;
      generateButton.style.background =
        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
      generateButton.disabled = false;
      generateButton.style.cursor = "pointer";
    }
  }
}
