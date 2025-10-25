# Mods Directory

This directory contains game mods that can be loaded at runtime.

## How It Works

- Place `.js` files in this directory
- Each mod file is automatically discovered and can be loaded
- Mods are sandboxed and run client-side only
- To disable all mods, rename this directory or use `?mods=false` URL parameter

## File Structure

```
public/mods/
├── README.md                      (this file)
├── example-killcounter.js         (shows kill count)
├── example-rainbow-trail.js       (rainbow particle trail)
├── example-damage-numbers.js      (floating damage numbers)
└── your-custom-mod.js             (your mods here!)
```

## Creating a Mod

1. Create a new `.js` file in this directory
2. Use `registerHook()` to hook into game events
3. Load it in-game using the mod editor (press `)
4. Or auto-load it by adding to the mod list

## Example Mod

```javascript
// my-mod.js
console.log('My mod loaded!');

registerHook('onKill', (killer, victim) => {
  console.log('Someone died!');
});
```

## Available Hooks

See `../MODS.md` for complete documentation of all available hooks and the game API.

## Disabling Mods

**Option 1: URL Parameter**
Add `?mods=false` to the URL: `http://localhost:5500?mods=false`

**Option 2: Rename Directory**
Rename this folder to `mods.disabled` to prevent auto-loading

**Option 3: Delete Files**
Remove specific mod files you don't want
