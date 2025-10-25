// Simple hacker-style mod terminal
import { GeminiClient } from "./geminiClient.js";
import { ModHUD } from "./modHUD.js";

export class ModEditor {
  constructor(modSystem) {
    this.modSystem = modSystem;
    this.visible = false;
    this.geminiClient = new GeminiClient();
    this.modHUD = new ModHUD();
    this.playerName = "Unknown";
    this.createUI();
  }

  async createUI() {
    // Create simple terminal window
    this.container = document.createElement("div");
    this.container.id = "modEditor";
    this.container.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 800px;
      max-width: 90vw;
      background: rgba(10, 10, 20, 0.98);
      border: 2px solid #00ff00;
      border-bottom: none;
      border-radius: 8px 8px 0 0;
      display: none;
      flex-direction: column;
      z-index: 9999;
      box-shadow: 0 -4px 40px rgba(0, 255, 0, 0.5), inset 0 0 20px rgba(0, 255, 0, 0.1);
      font-family: 'Courier New', monospace;
    `;

    // ASCII art banner
    const banner = document.createElement("pre");
    banner.style.cssText = `
      color: #00ff00;
      padding: 15px;
      margin: 0;
      font-size: 10px;
      line-height: 1.2;
      text-align: center;
      border-bottom: 1px solid #00ff00;
      background: rgba(0, 255, 0, 0.05);
      opacity: 0;
      animation: fadeIn 0.3s forwards;
    `;
    banner.textContent = `
 ███╗   ███╗ ██████╗ ██████╗     ████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗
 ████╗ ████║██╔═══██╗██╔══██╗    ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║
 ██╔████╔██║██║   ██║██║  ██║       ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║
 ██║╚██╔╝██║██║   ██║██║  ██║       ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║
 ██║ ╚═╝ ██║╚██████╔╝██████╔╝       ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗
 ╚═╝     ╚═╝ ╚═════╝ ╚═════╝        ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝
                                   [AI-POWERED MOD GENERATOR v2.0]
    `;

    // Header with close button
    const header = document.createElement("div");
    header.style.cssText = `
      background: rgba(0, 255, 0, 0.1);
      padding: 8px 15px;
      border-bottom: 1px solid #00ff00;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <div style="color: #00ff00; font-size: 12px; opacity: 0.8;">
        Press \` to close | ENTER to execute
      </div>
      <button id="closeModEditor" style="
        background: transparent;
        border: 1px solid #00ff00;
        color: #00ff00;
        padding: 4px 12px;
        cursor: pointer;
        font-family: monospace;
        font-size: 12px;
        transition: all 0.2s;
      " onmouseover="this.style.background='#00ff00'; this.style.color='#000'"
         onmouseout="this.style.background='transparent'; this.style.color='#00ff00'">
        [ESC]
      </button>
    `;

    // Input area
    const inputArea = document.createElement("div");
    inputArea.style.cssText = `
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 15px;
    `;

    // Prompt label
    const promptLabel = document.createElement("div");
    promptLabel.style.cssText = `
      color: #00ff00;
      font-size: 14px;
      opacity: 0.8;
    `;
    promptLabel.textContent = "// Enter your request and press ENTER";

    // Input field
    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.placeholder = "e.g., give me god mode, heal me, make me fly...";
    this.input.style.cssText = `
      width: 100%;
      background: rgba(0, 255, 0, 0.05);
      border: 1px solid #00ff00;
      color: #00ff00;
      padding: 15px;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      border-radius: 3px;
      outline: none;
      box-shadow: inset 0 0 10px rgba(0, 255, 0, 0.1);
    `;
    this.input.addEventListener("focus", () => {
      this.input.style.boxShadow =
        "inset 0 0 20px rgba(0, 255, 0, 0.2), 0 0 10px rgba(0, 255, 0, 0.3)";
    });
    this.input.addEventListener("blur", () => {
      this.input.style.boxShadow = "inset 0 0 10px rgba(0, 255, 0, 0.1)";
    });

    // Status display
    this.status = document.createElement("div");
    this.status.style.cssText = `
      min-height: 24px;
      color: #00ff00;
      font-size: 13px;
      padding: 8px;
      border-radius: 3px;
      opacity: 0.9;
    `;

    inputArea.appendChild(promptLabel);
    inputArea.appendChild(this.input);
    inputArea.appendChild(this.status);

    this.container.appendChild(header);
    this.container.appendChild(inputArea);
    document.body.appendChild(this.container);

    // Event listeners
    document
      .getElementById("closeModEditor")
      .addEventListener("click", () => this.hide());

    this.input.addEventListener("keydown", (e) => {
      // Only allow ESC and ENTER - block all other hotkeys
      if (e.key === "Enter" && !this.isGenerating) {
        e.preventDefault();
        e.stopPropagation();
        this.handleSubmit();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
        return;
      }
      // Allow normal typing (letters, numbers, space, backspace, etc.)
      // But prevent propagation to stop game hotkeys
      e.stopPropagation();
    });

    // Global keyboard shortcut (backtick key like Quake console)
    document.addEventListener("keydown", (e) => {
      if (e.key === "`" || e.key === "~") {
        e.preventDefault();
        if (!document.querySelector("input:focus, textarea:focus")) {
          this.toggle();
        }
      }
    });
  }

  async handleSubmit() {
    const prompt = this.input.value.trim();

    if (!prompt) {
      this.showStatus("// Enter a request first", "#ff3366");
      return;
    }

    if (!this.socket) {
      this.showStatus("// ERROR: Not connected to server", "#ff3366");
      return;
    }

    // Hide terminal immediately
    this.hide();

    // Add mod to HUD with "generating" status
    const tempModId = `generating_${Date.now()}`;
    this.modHUD.addGeneratingMod(tempModId, prompt, this.playerName);

    try {
      this.isGenerating = true;

      // Generate code with AI
      const result = await this.geminiClient.generateModCode(prompt);

      // Remove the "generating" entry
      this.modHUD.removeMod(tempModId);

      // Check for backfire and play alarm
      if (result.backfire) {
        // Play alarm sound
        try {
          const audio = new Audio(
            "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg",
          );
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch (e) {}

        console.log("🎲 BACKFIRE! Activating anyway...");
      }

      // Auto-activate based on type (even if backfire)
      this.activateMod(result, prompt);
    } catch (error) {
      console.error("Generation error:", error);
      // Remove generating entry and show error in HUD
      this.modHUD.removeMod(tempModId);
      this.modHUD.addErrorMod(prompt, error.message);
    } finally {
      this.isGenerating = false;
    }
  }

  activateMod(result, originalPrompt) {
    const modName = `mod_${Date.now()}`;

    if (result.type === "server") {
      // One-time server action
      this.socket.emit("executeServerMod", {
        code: result.code,
        name: modName,
      });
      this.socket.once("serverModResult", (res) => {
        if (res.success) {
          // Server mods are instant, show brief notification in HUD
          this.modHUD.addMod(originalPrompt, this.playerName, 3000);
        } else {
          this.modHUD.addErrorMod(originalPrompt, res.error);
        }
      });
    } else if (result.type === "persistent") {
      // Continuous server effect
      this.socket.emit("activatePersistentMod", {
        code: result.code,
        durationMs: 30000,
        name: modName,
        description: originalPrompt,
      });

      this.socket.once("persistentModResult", (res) => {
        if (res.success) {
          this.modHUD.addMod(originalPrompt, this.playerName, res.duration);
        } else {
          this.modHUD.addErrorMod(originalPrompt, res.error);
        }
      });
    } else {
      // Client-side mod
      const loadResult = this.modSystem.loadMod(modName, result.code);
      if (loadResult.success) {
        this.modHUD.addMod(originalPrompt, this.playerName, 30000);
      } else {
        this.modHUD.addErrorMod(originalPrompt, loadResult.message);
      }
    }
  }

  showBackfireWarning(result, originalPrompt) {
    // Create dramatic backfire warning
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 0, 0, 0.3);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: backfireFlash 0.5s ease-in-out;
    `;

    const warningBox = document.createElement("div");
    warningBox.style.cssText = `
      background: linear-gradient(135deg, #660000 0%, #cc0000 100%);
      border: 4px solid #ff3366;
      border-radius: 8px;
      padding: 40px;
      max-width: 500px;
      box-shadow: 0 0 50px rgba(255, 0, 0, 0.8);
      animation: backfireShake 0.5s ease-in-out;
      text-align: center;
      font-family: monospace;
    `;

    warningBox.innerHTML = `
      <div style="font-size: 80px; margin-bottom: 20px; animation: backfireSpin 1s ease-in-out;">⚠️</div>
      <h2 style="color: #ffff00; font-size: 32px; margin: 0 0 20px 0; letter-spacing: 3px;">
        BACKFIRE!
      </h2>
      <p style="color: #ffcccc; font-size: 16px; margin: 0 0 20px 0; line-height: 1.6;">
        ${result.backfireMessage || "Your mod went terribly wrong!"}
      </p>
      <p style="color: #ffaaaa; font-size: 14px; margin: 0 0 30px 0; font-style: italic;">
        This will probably not do what you expected...
      </p>
      <button id="acknowledgeBackfire" style="
        background: linear-gradient(135deg, #ff3366 0%, #ff6699 100%);
        border: 2px solid #ffaaaa;
        color: white;
        padding: 15px 40px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        border-radius: 6px;
        font-family: monospace;
        box-shadow: 0 4px 15px rgba(255, 51, 102, 0.4);
        transition: all 0.3s;
      " onmouseover="this.style.transform='scale(1.05)'"
         onmouseout="this.style.transform='scale(1)'">
        ACTIVATE ANYWAY
      </button>
    `;

    overlay.appendChild(warningBox);
    document.body.appendChild(overlay);

    // Add animations
    const style = document.createElement("style");
    style.textContent = `
      @keyframes backfireFlash {
        0%, 100% { background: rgba(255, 0, 0, 0); }
        50% { background: rgba(255, 0, 0, 0.5); }
      }
      @keyframes backfireShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px) rotate(-2deg); }
        75% { transform: translateX(10px) rotate(2deg); }
      }
      @keyframes backfireSpin {
        0% { transform: rotate(0deg) scale(0.5); opacity: 0; }
        50% { transform: rotate(180deg) scale(1.2); }
        100% { transform: rotate(360deg) scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    // Play alarm sound
    try {
      const audio = new Audio(
        "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg",
      );
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}

    // Handle acknowledgment
    document
      .getElementById("acknowledgeBackfire")
      .addEventListener("click", () => {
        overlay.remove();
        style.remove();
        this.showStatus("// [WARNING] Backfire mod activating...", "#ff6600");
        setTimeout(() => {
          this.activateMod(result, originalPrompt);
        }, 500);
      });

    // Click overlay to dismiss
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        document.getElementById("acknowledgeBackfire").click();
      }
    });

    // Reset input state
    this.isGenerating = false;
    this.input.disabled = false;
    this.input.style.opacity = "1";
  }

  showStatus(message, color = "#00ff00") {
    this.status.textContent = message;
    this.status.style.color = color;
  }

  show() {
    this.container.style.display = "flex";
    this.visible = true;
    this.input.focus();
    this.showStatus("// Ready", "#00ff00");
  }

  hide() {
    this.container.style.display = "none";
    this.visible = false;
    this.input.value = "";
    this.input.disabled = false;
    this.input.style.opacity = "1";
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
  }

  setPlayerName(name) {
    this.playerName = name;
  }
}
