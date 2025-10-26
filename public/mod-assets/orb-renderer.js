/**
 * Reusable Orb Rendering Assets for AI-Generated Mods
 *
 * This module provides rendering utilities for creating colored orb pickups
 * that can be used as building blocks for AI-generated game mods.
 *
 * Features:
 * - Pulsing animation effect
 * - Customizable colors
 * - Shadow/glow effects
 * - Symbol overlay support
 */

/**
 * Draw a pulsing orb with optional symbol overlay
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context to draw on
 * @param {number} screenX - X position on screen
 * @param {number} screenY - Y position on screen
 * @param {Object} options - Rendering options
 * @param {string} options.color - Hex color (e.g., "#ff6699")
 * @param {number} options.baseRadius - Base radius in pixels (default: 15)
 * @param {number} options.pulseSpeed - Pulse animation speed in ms (default: 200)
 * @param {number} options.pulseIntensity - How much the orb pulses (default: 0.2)
 * @param {string} options.symbol - Optional text symbol to display (e.g., "+", "O", "X")
 * @param {string} options.symbolColor - Color of the symbol (default: "#000")
 * @param {number} options.glowIntensity - Shadow blur amount (default: 20)
 */
export function drawPulsingOrb(ctx, screenX, screenY, options = {}) {
  const {
    color = "#ffffff",
    baseRadius = 15,
    pulseSpeed = 200,
    pulseIntensity = 0.2,
    symbol = null,
    symbolColor = "#000",
    glowIntensity = 20,
  } = options;

  // Calculate pulse effect
  const pulse = Math.sin(Date.now() / pulseSpeed) * pulseIntensity + 1;
  const radius = baseRadius * pulse;

  // Save context state
  ctx.save();

  // Draw orb with glow
  ctx.shadowColor = color;
  ctx.shadowBlur = glowIntensity;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Reset shadow for symbol
  ctx.shadowBlur = 0;

  // Draw symbol if provided
  if (symbol) {
    ctx.fillStyle = symbolColor;
    ctx.font = `bold ${baseRadius * 0.8}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, screenX, screenY);
  }

  // Restore context state
  ctx.restore();
}

/**
 * Predefined orb color presets
 * These can be used as examples or references for AI-generated mods
 */
export const OrbPresets = {
  // Removed presets (available for AI mods)
  orange: {
    color: "#ffaa00",
    symbol: "O",
    description: "Orange orb - previously used for ammo",
  },
  purple: {
    color: "#9966ff",
    symbol: "S",
    description: "Purple orb - previously used for SMG weapon",
  },
  darkOrange: {
    color: "#ff9933",
    symbol: "SG",
    description: "Dark orange orb - previously used for shotgun weapon",
  },
  brown: {
    color: "#cc6633",
    symbol: "R",
    description: "Brown orb - previously used for rifle weapon",
  },

  // Active presets (in use by game)
  healthSmall: {
    color: "#ff6699",
    symbol: "+",
    description: "Pink orb - small health pickup",
  },
  healthBig: {
    color: "#ff3366",
    symbol: "++",
    description: "Dark pink orb - big health pickup",
  },
  armorLight: {
    color: "#99ddff",
    symbol: "A",
    description: "Light blue orb - light armor",
  },
  armorHeavy: {
    color: "#66ccff",
    symbol: "A+",
    description: "Blue orb - heavy armor",
  },

  // Generic presets
  white: {
    color: "#ffffff",
    symbol: "?",
    description: "White orb - default/unknown type",
  },
  green: {
    color: "#66ff66",
    symbol: null,
    description: "Green orb - generic positive item",
  },
  red: {
    color: "#ff3333",
    symbol: null,
    description: "Red orb - generic dangerous/power item",
  },
  yellow: {
    color: "#ffff66",
    symbol: null,
    description: "Yellow orb - generic collectible",
  },
};

/**
 * Draw an orb using a preset configuration
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} screenX - X position on screen
 * @param {number} screenY - Y position on screen
 * @param {string} presetName - Name of preset from OrbPresets
 * @param {Object} overrides - Optional overrides for preset values
 */
export function drawPresetOrb(ctx, screenX, screenY, presetName, overrides = {}) {
  const preset = OrbPresets[presetName] || OrbPresets.white;
  drawPulsingOrb(ctx, screenX, screenY, { ...preset, ...overrides });
}

/**
 * Example usage in a mod:
 *
 * import { drawPulsingOrb, drawPresetOrb, OrbPresets } from './mod-assets/orb-renderer.js';
 *
 * // In your mod's render hook:
 * onRender({ ctx, gameState }) {
 *   // Draw custom orb
 *   drawPulsingOrb(ctx, 100, 100, {
 *     color: "#ff00ff",
 *     baseRadius: 20,
 *     symbol: "X",
 *     pulseSpeed: 300,
 *   });
 *
 *   // Draw preset orb
 *   drawPresetOrb(ctx, 200, 200, "orange");
 * }
 */
