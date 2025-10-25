// HUD display for active mods with countdown timers
export class ModHUD {
  constructor() {
    this.activeMods = new Map(); // modName -> { playerName, expiresAt, element }
    this.createUI();
    this.startUpdateLoop();
  }

  createUI() {
    // Create container for active mods list
    this.container = document.createElement("div");
    this.container.id = "modHUD";
    this.container.style.cssText = `
      position: fixed;
      top: 120px;
      right: 20px;
      width: 280px;
      background: rgba(10, 10, 20, 0.85);
      border: 2px solid rgba(102, 204, 255, 0.5);
      border-radius: 8px;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      display: none;
      box-shadow: 0 0 20px rgba(102, 204, 255, 0.2);
    `;

    // Header
    const header = document.createElement("div");
    header.style.cssText = `
      color: #66ccff;
      font-weight: bold;
      margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid rgba(102, 204, 255, 0.3);
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <span>ACTIVE MODS</span>
      <span id="modCount" style="
        background: rgba(102, 204, 255, 0.2);
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 11px;
      ">0</span>
    `;

    // Mods list container
    this.listContainer = document.createElement("div");
    this.listContainer.id = "modList";
    this.listContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    this.container.appendChild(header);
    this.container.appendChild(this.listContainer);
    document.body.appendChild(this.container);
  }

  addMod(modName, playerName, durationMs = 30000) {
    const expiresAt = Date.now() + durationMs;

    // Create mod entry element
    const modElement = document.createElement("div");
    modElement.style.cssText = `
      background: rgba(102, 204, 255, 0.1);
      border-left: 3px solid #66ccff;
      padding: 8px;
      border-radius: 3px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;

    // Mod name
    const nameDiv = document.createElement("div");
    nameDiv.style.cssText = `
      color: #66ff66;
      font-weight: bold;
      font-size: 11px;
    `;
    nameDiv.textContent = modName;

    // Player name
    const playerDiv = document.createElement("div");
    playerDiv.style.cssText = `
      color: #ffaa00;
      font-size: 10px;
    `;
    playerDiv.textContent = `By: ${playerName}`;

    // Timer bar and text container
    const timerContainer = document.createElement("div");
    timerContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    `;

    // Timer text
    const timerText = document.createElement("div");
    timerText.className = "modTimer";
    timerText.style.cssText = `
      color: #66ccff;
      font-size: 10px;
      min-width: 30px;
    `;

    // Timer progress bar
    const progressBar = document.createElement("div");
    progressBar.style.cssText = `
      flex: 1;
      height: 4px;
      background: rgba(102, 204, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
    `;

    const progressFill = document.createElement("div");
    progressFill.className = "modProgressFill";
    progressFill.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #66ccff 0%, #66ff66 100%);
      width: 100%;
      transition: width 0.1s linear;
    `;

    progressBar.appendChild(progressFill);
    timerContainer.appendChild(timerText);
    timerContainer.appendChild(progressBar);

    modElement.appendChild(nameDiv);
    modElement.appendChild(playerDiv);
    modElement.appendChild(timerContainer);

    this.listContainer.appendChild(modElement);

    // Store mod data
    this.activeMods.set(modName, {
      playerName,
      expiresAt,
      element: modElement,
      timerText,
      progressFill,
      durationMs,
    });

    this.updateVisibility();
    this.updateCount();
  }

  addGeneratingMod(modId, prompt, playerName) {
    // Create mod entry element with generating state
    const modElement = document.createElement("div");
    modElement.style.cssText = `
      background: rgba(255, 170, 0, 0.1);
      border-left: 3px solid #ffaa00;
      padding: 8px;
      border-radius: 3px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;

    // Mod name with loading animation
    const nameDiv = document.createElement("div");
    nameDiv.style.cssText = `
      color: #ffaa00;
      font-weight: bold;
      font-size: 11px;
    `;
    nameDiv.textContent = prompt;

    // Status
    const statusDiv = document.createElement("div");
    statusDiv.style.cssText = `
      color: #ffaa00;
      font-size: 10px;
      font-style: italic;
    `;
    statusDiv.textContent = "⚡ Generating with AI...";

    modElement.appendChild(nameDiv);
    modElement.appendChild(statusDiv);

    this.listContainer.insertBefore(modElement, this.listContainer.firstChild);

    // Store temporary mod data
    this.activeMods.set(modId, {
      playerName,
      element: modElement,
      isGenerating: true,
    });

    this.updateVisibility();
    this.updateCount();
  }

  addErrorMod(prompt, errorMessage) {
    // Create mod entry element with error state
    const modElement = document.createElement("div");
    modElement.style.cssText = `
      background: rgba(255, 51, 102, 0.1);
      border-left: 3px solid #ff3366;
      padding: 8px;
      border-radius: 3px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    `;

    // Mod name
    const nameDiv = document.createElement("div");
    nameDiv.style.cssText = `
      color: #ff3366;
      font-weight: bold;
      font-size: 11px;
    `;
    nameDiv.textContent = prompt;

    // Error message
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
      color: #ff6699;
      font-size: 10px;
    `;
    errorDiv.textContent = `❌ ${errorMessage}`;

    modElement.appendChild(nameDiv);
    modElement.appendChild(errorDiv);

    this.listContainer.insertBefore(modElement, this.listContainer.firstChild);

    // Store error mod data with 5 second auto-remove
    const errorId = `error_${Date.now()}`;
    const expiresAt = Date.now() + 5000;
    this.activeMods.set(errorId, {
      element: modElement,
      expiresAt,
      isError: true,
    });

    this.updateVisibility();
    this.updateCount();
  }

  removeMod(modName) {
    const modData = this.activeMods.get(modName);
    if (modData) {
      // Fade out animation
      modData.element.style.transition = "opacity 0.3s";
      modData.element.style.opacity = "0";

      setTimeout(() => {
        if (modData.element.parentNode) {
          modData.element.parentNode.removeChild(modData.element);
        }
        this.activeMods.delete(modName);
        this.updateVisibility();
        this.updateCount();
      }, 300);
    }
  }

  updateVisibility() {
    if (this.activeMods.size > 0) {
      this.container.style.display = "block";
    } else {
      this.container.style.display = "none";
    }
  }

  updateCount() {
    const countElement = document.getElementById("modCount");
    if (countElement) {
      countElement.textContent = this.activeMods.size;
    }
  }

  startUpdateLoop() {
    // Update every 100ms for smooth countdown
    setInterval(() => {
      const now = Date.now();
      const toRemove = [];

      this.activeMods.forEach((modData, modName) => {
        // Skip generating mods (no timer)
        if (modData.isGenerating) {
          return;
        }

        // Handle error mods with expiration
        if (modData.isError) {
          const remaining = modData.expiresAt - now;
          if (remaining <= 0) {
            toRemove.push(modName);
          }
          return;
        }

        // Handle normal mods with timers
        const remaining = modData.expiresAt - now;

        if (remaining <= 0) {
          toRemove.push(modName);
        } else {
          // Update timer text
          const seconds = Math.ceil(remaining / 1000);
          modData.timerText.textContent = `${seconds}s`;

          // Update progress bar
          const progress = (remaining / modData.durationMs) * 100;
          modData.progressFill.style.width = `${progress}%`;

          // Change color when time is running out
          if (remaining < 10000) {
            // Less than 10 seconds - orange
            modData.progressFill.style.background =
              "linear-gradient(90deg, #ffaa00 0%, #ff8800 100%)";
            modData.timerText.style.color = "#ffaa00";
          }
          if (remaining < 5000) {
            // Less than 5 seconds - red
            modData.progressFill.style.background =
              "linear-gradient(90deg, #ff3366 0%, #ff0000 100%)";
            modData.timerText.style.color = "#ff3366";
          }
        }
      });

      // Remove expired mods
      toRemove.forEach((modName) => this.removeMod(modName));
    }, 100);
  }

  clearAllMods() {
    this.activeMods.forEach((modData, modName) => {
      this.removeMod(modName);
    });
  }
}
