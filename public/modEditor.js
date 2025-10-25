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
      <span style="color: #66ccff; font-family: monospace; font-weight: bold;">MOD EDITOR</span>
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
    this.textarea.placeholder =
      '// Write your mod code here...\n// Example:\nregisterHook("onHit", (player, target) => {\n  console.log("Hit!", player, target);\n});';
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

  loadCurrentMod() {
    const name = document.getElementById("modName").value.trim();
    const code = this.textarea.value;

    if (!name) {
      this.showStatus("❌ Please enter a mod name", "#ff3366");
      return;
    }

    const result = this.modSystem.loadMod(name, code);
    if (result.success) {
      this.showStatus(`✅ ${result.message}`, "#66ff66");
    } else {
      this.showStatus(`❌ ${result.message}`, "#ff3366");
    }
  }

  reloadCurrentMod() {
    const name = document.getElementById("modName").value.trim();
    const code = this.textarea.value;

    if (!name) {
      this.showStatus("❌ Please enter a mod name", "#ff3366");
      return;
    }

    const result = this.modSystem.reloadMod(name, code);
    if (result.success) {
      this.showStatus(`🔄 Mod "${name}" reloaded`, "#ffaa00");
    } else {
      this.showStatus(`❌ ${result.message}`, "#ff3366");
    }
  }

  unloadCurrentMod() {
    const name = document.getElementById("modName").value.trim();

    if (!name) {
      this.showStatus("❌ Please enter a mod name", "#ff3366");
      return;
    }

    this.modSystem.unloadMod(name);
    this.showStatus(`🗑️ Mod "${name}" unloaded`, "#66ccff");
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
      const generatedCode = await this.geminiClient.generateModCode(userPrompt);

      // Update textarea with generated code
      this.textarea.value = generatedCode;

      this.showStatus(
        "✅ Code generated successfully! Review and click LOAD MOD to test.",
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
