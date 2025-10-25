# Counter-Strike Sound System Implementation

## Overview

Your game now has a complete Counter-Strike style sound system! This implementation replaces the Pac-Man sounds with authentic FPS shooter sounds.

---

## What's Been Implemented

### 1. **Weapon-Specific Sounds**
Located in: `public/assets/sounds/public/mods/sound-effects.js:76-91`

Each weapon type now has distinct CS-style sounds:
- **Pistols:** Desert Eagle, USP, Glock
- **Rifles:** AK-47, M4A1
- **SMGs:** MP5, P90
- **Snipers:** AWP, Scout
- **Shotgun:** Maintains heavy sound

**Mapping:**
```javascript
pistol → Desert Eagle (heavy punch)
rifle → AK-47 (iconic CS sound)
smg → P90 (rapid futuristic)
sniper → AWP (powerful boom)
shotgun → Original Fire5 (heavy blast)
```

### 2. **Reload System Ready**
Located in: `public/assets/sounds/public/mods/sound-effects.js:96-100`

Reload sounds preloaded for:
- Pistol reloads
- Rifle reloads
- Shotgun reloads
- SMG reloads
- Sniper reloads

*Note: Reload hooks need to be implemented when you add reload mechanics to game*

### 3. **Enhanced Hit Detection**
Located in: `public/assets/sounds/public/mods/sound-effects.js:309-331`

Different sounds for different hit types:
- **Headshot hit:** Distinct headshot sound
- **Body hit:** Regular impact sound
- **Armor hit:** Metallic armor deflection (low damage)

**Shooter feedback:** When you get a headshot, you hear a subtle confirmation sound!

### 4. **CS-Style Death Sounds**
Located in: `public/assets/sounds/public/mods/sound-effects.js:113-114`

Replaced Pac-Man "Game Over" sound with:
- Regular death sound
- Headshot-specific death sound

### 5. **Footstep System**
Located in: `public/assets/sounds/public/mods/sound-effects.js:247-289`

**Features:**
- Plays footsteps when player moves
- 4 footstep variations for realism
- Cycles through sounds to avoid repetition
- Interval-based (every 300ms when moving)
- Only plays for local player

**Tunable parameters:**
```javascript
FOOTSTEP_INTERVAL = 300; // ms between steps
distance > 5 // Minimum movement to trigger sound
```

### 6. **Shell Ejection Sounds**
Located in: `public/assets/sounds/public/mods/sound-effects.js:291-304`

**Features:**
- Plays subtle shell casing sound after each shot
- 100ms delay for realism (shell drops after shot)
- Only for your own shots (not other players)
- Very quiet (0.25 volume) to not overpower gunfire

### 7. **Spatial Audio (Distance Attenuation)**
Located in: `public/assets/sounds/public/mods/sound-effects.js:195-221`

**Features:**
- Sounds fade with distance
- Maximum hearing range: 800 pixels
- Own shots always full volume
- Enemy shots fade based on distance
- Minimum volume: 0.2x (20%)

**Formula:**
```javascript
if (distance > 800) → No sound (too far)
if (distance > 100) → Volume fades: 1.0 - (distance / 800)
if (distance < 100) → Full volume
Own shots → Always full volume
```

### 8. **Sound Pooling System**
Located in: `public/assets/sounds/public/mods/sound-effects.js:6-66`

**Performance optimization:**
- Multiple audio instances per sound (prevents lag)
- Pool sizes optimized per sound type:
  - Weapon fires: 5-6 instances (rapid fire)
  - Footsteps: 8 instances (frequent)
  - Hit sounds: 3-4 instances
  - Shell drops: 6 instances

---

## File Structure

```
public/assets/sounds/
├── cs/                          # CS sound directory (NEW)
│   ├── CHECKLIST.md            # Download checklist
│   ├── ak47.mp3                # [To download]
│   ├── m4a1.mp3                # [To download]
│   ├── awp.mp3                 # [To download]
│   ├── deagle.mp3              # [To download]
│   ├── ...                     # [29 total files]
│   └── footstep4.mp3           # [To download]
│
├── Fire 1.mp3                  # Fallback sounds (kept)
├── Fire 2-5.mp3                # Fallback sounds (kept)
├── Hit 1.mp3                   # Fallback hit sound
└── Game Over.mp3               # Old Pac-Man death sound (kept as fallback)
```

---

## Sound Events & Hooks

### Current Hook System:

| Hook | Trigger | Sounds Played |
|------|---------|---------------|
| `onShoot` | Player fires weapon | Weapon fire sound (distance-based) |
| `onShoot` | Player fires weapon | Shell drop sound (100ms delay) |
| `onHit` | Player takes damage | Hit sound (headshot/body/armor variants) |
| `onKill` | Player dies | Death sound (regular/headshot variants) |
| `onUpdate` | Every frame (if moving) | Footstep sounds (4 variations) |

### Hook Parameters:

```javascript
onShoot(data)
  - data.x, data.y: Shot position
  - data.weapon: Weapon type (pistol/rifle/smg/shotgun/sniper)
  - data.playerId: Who shot
  - data.angle: Shot direction

onHit(shooterId, targetId, damage, isHeadshot)
  - shooterId: Attacker ID
  - targetId: Victim ID
  - damage: Damage amount
  - isHeadshot: Boolean (headshot detection)

onKill(killerId, victimId)
  - killerId: Who got the kill
  - victimId: Who died

onUpdate()
  - Runs every frame
  - Used for movement tracking
```

---

## Volume Levels

Master volume: **0.3** (30%)

Individual sound volumes (relative to master):

| Sound Type | Volume | Effective Volume |
|------------|--------|------------------|
| AK-47 | 0.7 | 21% |
| AWP | 0.85 | 25.5% |
| Desert Eagle | 0.75 | 22.5% |
| Footsteps | 0.3 | 9% |
| Shell drops | 0.25 | 7.5% |
| Hit sounds | 0.6-0.9 | 18-27% |
| Death sounds | 0.7 | 21% |

---

## Next Steps

### 1. **Download Sounds** (Required)
Follow `SOUND_ASSETS_GUIDE.md` to download 29 sound files

Quick start:
1. Go to [freesound.org](https://freesound.org)
2. Search for sounds (see CHECKLIST.md)
3. Download as MP3
4. Rename to match required filenames
5. Place in `public/assets/sounds/cs/`

### 2. **Test the System**
```bash
# Verify sounds are present
cd public/assets/sounds/cs
ls -1 *.mp3 | wc -l  # Should show: 29

# Start your game
npm start  # or your normal start command
```

### 3. **Fine-Tune Settings** (Optional)

**Adjust volumes:**
Edit `sound-effects.js:76-132` - change volume parameter in preload

**Adjust footstep speed:**
Edit `sound-effects.js:251` - change `FOOTSTEP_INTERVAL`

**Adjust hearing distance:**
Edit `sound-effects.js:206` - change `maxHearingRange`

**Adjust movement threshold:**
Edit `sound-effects.js:279` - change `distance > 5` value

### 4. **Add Reload Functionality** (Optional)

To use reload sounds, add this hook when implementing reload:

```javascript
registerHook('onReload', (playerId, weaponType) => {
  if (playerId === game.getPlayerId()) {
    const reloadSounds = {
      pistol: 'reload-pistol',
      rifle: 'reload-rifle',
      smg: 'reload-smg',
      shotgun: 'reload-shotgun',
      sniper: 'reload-sniper',
    };
    soundManager.play(reloadSounds[weaponType] || 'reload-rifle');
  }
});
```

---

## Troubleshooting

### No sounds playing?
1. Check browser console (F12) for errors
2. Verify files exist: `ls public/assets/sounds/cs/*.mp3`
3. Check file permissions: `chmod 644 public/assets/sounds/cs/*.mp3`
4. Ensure files are valid MP3 format

### Sounds too loud/quiet?
1. Adjust master volume: `sound-effects.js:11` → `this.masterVolume = 0.3`
2. Adjust individual volumes: `sound-effects.js:76-132`
3. Check system volume and browser volume

### Footsteps too fast/slow?
1. Increase interval: `sound-effects.js:251` → `FOOTSTEP_INTERVAL = 400`
2. Adjust movement threshold: `sound-effects.js:279`

### Performance issues?
1. Reduce pool sizes: `sound-effects.js:76-132` (decrease 3rd parameter)
2. Compress MP3 files to lower bitrate (128kbps)
3. Convert stereo to mono

---

## Technical Details

### Sound Manager Class

**Methods:**
- `preload(name, path, poolSize, volume)` - Load sound into pool
- `play(name)` - Play sound from pool
- `playWithVolume(name, multiplier)` - Play with volume override

**Features:**
- Automatic sound pooling (prevents lag from creating new Audio objects)
- Volume normalization (all volumes relative to masterVolume)
- Graceful error handling (catches autoplay policy errors)
- Sound rotation (cycles through pool to prevent overlap)

### Performance Optimizations

1. **Sound pooling** - Pre-creates audio objects
2. **Throttling** - 50ms cooldown between shots per player
3. **Distance culling** - Don't play sounds beyond 800px
4. **Volume falloff** - Reduces CPU for distant sounds
5. **Single footstep tracker** - Only tracks local player

---

## Comparison: Before vs After

| Feature | Before (Pac-Man) | After (CS-Style) |
|---------|------------------|------------------|
| Weapon sounds | Generic Fire 1-6 | Specific per weapon (AK47, AWP, etc.) |
| Hit sounds | Single "Hit 1.mp3" | Headshot/body/armor variants |
| Death sound | "Game Over.mp3" | CS-style death sounds |
| Footsteps | None | 4 variations with distance |
| Shell ejection | None | Subtle post-shot sound |
| Reload sounds | None | Per-weapon reload ready |
| Spatial audio | Basic distance | Advanced falloff system |
| Headshot feedback | None | Audio confirmation for shooter |

---

## Credits

Implementation by: Claude Code
Sound system architecture: Original game + CS enhancements
Sounds to be sourced from: freesound.org, zapsplat.com, opengameart.org (see guide)

---

## License Note

**IMPORTANT:** Only use legally-sourced sounds:
- Public domain (CC0)
- Creative Commons (with attribution)
- Royalty-free licensed sounds
- Your own recordings

**DO NOT** use copyrighted Counter-Strike game files from Valve.

---

Ready to sound like Counter-Strike! 🎮🔫
