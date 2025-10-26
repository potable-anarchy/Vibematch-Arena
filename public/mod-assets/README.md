# Mod Assets - Building Blocks for AI-Generated Mods

This directory contains reusable rendering utilities and assets that can be used as building blocks for AI-generated game mods.

## Purpose

When generating mods with AI, having pre-built, well-tested visual components saves time and ensures consistency. These assets provide:

- **Quick prototyping** - AI can reference existing patterns instead of writing from scratch
- **Visual consistency** - Reusable components maintain the game's aesthetic
- **Tested code** - These utilities have been extracted from working game code
- **Documentation** - Clear examples for AI to understand usage patterns

## Available Assets

### Orb Renderer (`orb-renderer.js`)

A comprehensive system for rendering pulsing, glowing orb pickups with customizable colors and symbols.

#### Features:
- Pulsing animation effect (configurable speed and intensity)
- Glow/shadow effects
- Symbol overlay support
- Preset color schemes
- Screen-space rendering

#### Quick Start:

```javascript
import { drawPulsingOrb, drawPresetOrb, OrbPresets } from './mod-assets/orb-renderer.js';

// In your mod
export default {
  name: "My Custom Mod",

  hooks: {
    onRender({ ctx, gameState }) {
      // Draw custom orb
      drawPulsingOrb(ctx, 100, 100, {
        color: "#ff00ff",
        baseRadius: 20,
        symbol: "X",
        pulseSpeed: 300,
      });

      // Use a preset
      drawPresetOrb(ctx, 200, 200, "orange");
    }
  }
};
```

#### Available Presets:

**Removed from game (available for mods):**
- `orange` - Orange orb with "O" symbol (previously ammo)
- `purple` - Purple orb with "S" symbol (previously SMG)
- `darkOrange` - Dark orange orb with "SG" symbol (previously shotgun)
- `brown` - Brown orb with "R" symbol (previously rifle)

**Active in game (reference only):**
- `healthSmall` - Pink orb with "+"
- `healthBig` - Dark pink orb with "++"
- `armorLight` - Light blue orb with "A"
- `armorHeavy` - Blue orb with "A+"

**Generic presets:**
- `white` - Default/unknown type
- `green` - Generic positive item
- `red` - Generic dangerous/power item
- `yellow` - Generic collectible

#### Customization Options:

```javascript
drawPulsingOrb(ctx, x, y, {
  color: "#hexcolor",          // Orb color
  baseRadius: 15,              // Base size in pixels
  pulseSpeed: 200,             // Animation speed (ms)
  pulseIntensity: 0.2,         // How much it pulses (0-1)
  symbol: "X",                 // Text symbol to display
  symbolColor: "#000000",      // Symbol color
  glowIntensity: 20,           // Glow/shadow blur amount
});
```

## Adding New Assets

When adding new reusable components:

1. **Extract from working code** - Only add patterns that have been tested in the game
2. **Make it configurable** - Use options objects with sensible defaults
3. **Document thoroughly** - Include usage examples and parameter descriptions
4. **Export clearly** - Use named exports for discoverability
5. **Keep it generic** - Avoid game-specific logic; make it reusable

## For AI: How to Use These Assets

When generating mods, you can:

1. **Reference these files** to understand rendering patterns
2. **Import and use** the utilities directly in generated mods
3. **Extend or customize** the provided functions for specific needs
4. **Use presets** as starting points for new visual styles

Example AI generation prompt:
> "Create a mod that spawns collectible coins using the orange orb preset from mod-assets"

The AI can then generate:
```javascript
import { drawPresetOrb } from './mod-assets/orb-renderer.js';

export default {
  name: "Coin Collector",
  hooks: {
    onRender({ ctx, gameState }) {
      // Render coins as orange orbs
      gameState.coins?.forEach(coin => {
        const screenPos = worldToScreen(coin.x, coin.y);
        drawPresetOrb(ctx, screenPos.x, screenPos.y, "orange", {
          symbol: "$",
          pulseSpeed: 150,
        });
      });
    }
  }
};
```

## Best Practices

- **Screen vs World Coordinates**: These renderers expect screen coordinates. Convert world coordinates first if needed.
- **Performance**: Limit the number of orbs rendered per frame (use culling for off-screen objects)
- **Consistency**: Use existing presets when possible to maintain visual consistency
- **Context State**: All renderers use `ctx.save()` and `ctx.restore()` to avoid side effects

## Future Assets

Consider adding:
- Particle effects
- UI components (buttons, panels, bars)
- Animation helpers
- Geometric shape renderers
- Text rendering utilities
- Sound effect wrappers
