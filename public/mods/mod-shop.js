// Mod Shop System
// Players can purchase and activate mods using credits earned from kills

// Shop state
let shopOpen = false;
let purchasedMods = new Set(); // Track which mods have been purchased

// Available mods for purchase
const SHOP_MODS = [
  {
    id: "better-hud-v2",
    name: "Better HUD v2",
    description: "Enhanced HUD with FPS counter, ammo warnings, and speed indicator",
    cost: 10,
    file: "better-hud-v2.js",
  },
  {
    id: "minimap-v2",
    name: "Minimap v2",
    description: "Tactical minimap showing players and pickups",
    cost: 10,
    file: "minimap-v2.js",
  },
  {
    id: "damage-numbers",
    name: "Damage Numbers",
    description: "Shows floating damage numbers when you hit enemies",
    cost: 10,
    file: "example-damage-numbers.js",
  },
  {
    id: "rainbow-trail",
    name: "Rainbow Trail",
    description: "Adds a colorful particle trail behind your player",
    cost: 10,
    file: "example-rainbow-trail.js",
  },
];

// Create shop UI
function createShopUI() {
  const shopContainer = document.createElement("div");
  shopContainer.id = "modShop";
  shopContainer.style.position = "fixed";
  shopContainer.style.top = "50%";
  shopContainer.style.left = "50%";
  shopContainer.style.transform = "translate(-50%, -50%)";
  shopContainer.style.width = "600px";
  shopContainer.style.maxHeight = "80vh";
  shopContainer.style.backgroundColor = "rgba(0, 0, 0, 0.95)";
  shopContainer.style.border = "3px solid #66ccff";
  shopContainer.style.borderRadius = "10px";
  shopContainer.style.padding = "20px";
  shopContainer.style.zIndex = "10000";
  shopContainer.style.display = "none";
  shopContainer.style.fontFamily = "monospace";
  shopContainer.style.color = "#ffffff";
  shopContainer.style.overflowY = "auto";

  // Header
  const header = document.createElement("div");
  header.style.fontSize = "28px";
  header.style.fontWeight = "bold";
  header.style.color = "#66ccff";
  header.style.marginBottom = "15px";
  header.style.textAlign = "center";
  header.textContent = "MOD SHOP";

  // Credits display
  const creditsDisplay = document.createElement("div");
  creditsDisplay.id = "shopCredits";
  creditsDisplay.style.fontSize = "18px";
  creditsDisplay.style.color = "#ffd700";
  creditsDisplay.style.marginBottom = "20px";
  creditsDisplay.style.textAlign = "center";
  creditsDisplay.textContent = "Credits: 0";

  // Close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "CLOSE [B]";
  closeButton.style.position = "absolute";
  closeButton.style.top = "20px";
  closeButton.style.right = "20px";
  closeButton.style.padding = "8px 15px";
  closeButton.style.backgroundColor = "#ff3366";
  closeButton.style.color = "#ffffff";
  closeButton.style.border = "none";
  closeButton.style.borderRadius = "5px";
  closeButton.style.cursor = "pointer";
  closeButton.style.fontFamily = "monospace";
  closeButton.style.fontSize = "12px";
  closeButton.onclick = toggleShop;

  // Mod list
  const modList = document.createElement("div");
  modList.id = "modList";

  shopContainer.appendChild(header);
  shopContainer.appendChild(closeButton);
  shopContainer.appendChild(creditsDisplay);
  shopContainer.appendChild(modList);
  document.body.appendChild(shopContainer);

  return shopContainer;
}

// Update shop content
function updateShop() {
  const state = game.getState();
  const myId = game.getPlayerId();
  const player = state.players.find((p) => p.id === myId);

  if (!player) return;

  const creditsDisplay = document.getElementById("shopCredits");
  const modList = document.getElementById("modList");

  if (creditsDisplay) {
    creditsDisplay.textContent = `Credits: ${player.credits || 0}`;
  }

  if (modList) {
    modList.innerHTML = "";

    SHOP_MODS.forEach((mod) => {
      const modItem = document.createElement("div");
      modItem.style.backgroundColor = "rgba(102, 204, 255, 0.1)";
      modItem.style.border = "2px solid #66ccff";
      modItem.style.borderRadius = "5px";
      modItem.style.padding = "15px";
      modItem.style.marginBottom = "10px";

      const modName = document.createElement("div");
      modName.style.fontSize = "20px";
      modName.style.fontWeight = "bold";
      modName.style.color = "#66ccff";
      modName.style.marginBottom = "8px";
      modName.textContent = mod.name;

      const modDesc = document.createElement("div");
      modDesc.style.fontSize = "14px";
      modDesc.style.color = "#cccccc";
      modDesc.style.marginBottom = "12px";
      modDesc.textContent = mod.description;

      const modFooter = document.createElement("div");
      modFooter.style.display = "flex";
      modFooter.style.justifyContent = "space-between";
      modFooter.style.alignItems = "center";

      const modCost = document.createElement("div");
      modCost.style.fontSize = "16px";
      modCost.style.color = "#ffd700";
      modCost.textContent = `Cost: ${mod.cost} credits`;

      const buyButton = document.createElement("button");
      const isPurchased = purchasedMods.has(mod.id);
      const canAfford = player.credits >= mod.cost;

      if (isPurchased) {
        buyButton.textContent = "OWNED";
        buyButton.style.backgroundColor = "#66cc66";
        buyButton.disabled = true;
      } else if (!canAfford) {
        buyButton.textContent = "INSUFFICIENT CREDITS";
        buyButton.style.backgroundColor = "#666666";
        buyButton.disabled = true;
      } else {
        buyButton.textContent = "PURCHASE";
        buyButton.style.backgroundColor = "#66ccff";
        buyButton.onclick = () => purchaseMod(mod, player);
      }

      buyButton.style.padding = "8px 15px";
      buyButton.style.color = "#ffffff";
      buyButton.style.border = "none";
      buyButton.style.borderRadius = "5px";
      buyButton.style.cursor = isPurchased || !canAfford ? "not-allowed" : "pointer";
      buyButton.style.fontFamily = "monospace";
      buyButton.style.fontSize = "14px";

      modFooter.appendChild(modCost);
      modFooter.appendChild(buyButton);

      modItem.appendChild(modName);
      modItem.appendChild(modDesc);
      modItem.appendChild(modFooter);

      modList.appendChild(modItem);
    });
  }
}

// Purchase a mod
async function purchaseMod(mod, player) {
  if (player.credits < mod.cost) {
    console.log("Not enough credits!");
    return;
  }

  if (purchasedMods.has(mod.id)) {
    console.log("Already purchased!");
    return;
  }

  // Deduct credits locally (server doesn't track this yet - could be added)
  player.credits -= mod.cost;

  // Mark as purchased
  purchasedMods.add(mod.id);

  // Load the mod
  try {
    const modSystem = window.modSystem || game.modSystem;
    if (modSystem && modSystem.loadModFromFile) {
      const result = await modSystem.loadModFromFile(mod.file);
      if (result.success) {
        console.log(`✅ Purchased and loaded: ${mod.name}`);
      } else {
        console.error(`Failed to load mod: ${mod.name}`);
        // Refund on failure
        player.credits += mod.cost;
        purchasedMods.delete(mod.id);
      }
    }
  } catch (error) {
    console.error("Error purchasing mod:", error);
    // Refund on error
    player.credits += mod.cost;
    purchasedMods.delete(mod.id);
  }

  updateShop();
}

// Toggle shop
function toggleShop() {
  shopOpen = !shopOpen;
  const shopContainer = document.getElementById("modShop");
  if (shopContainer) {
    shopContainer.style.display = shopOpen ? "block" : "none";
    if (shopOpen) {
      updateShop();
    }
  }
}

// Create UI on load
createShopUI();

// B key to toggle shop
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "b") {
    toggleShop();
  }
});

// Update shop when it's open
registerHook("onUpdate", () => {
  if (shopOpen) {
    updateShop();
  }
});

console.log("✅ Mod Shop loaded - Press B to open shop");
