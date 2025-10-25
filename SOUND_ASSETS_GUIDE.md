# Counter-Strike Sound Assets Guide

This guide will help you download and install authentic Counter-Strike style sounds for your game.

## Directory Structure

Create this directory structure in your project:

```
public/assets/sounds/cs/
```

Run this command to create the directory:
```bash
mkdir -p public/assets/sounds/cs
```

## Required Sound Files

You need to download the following sound files and place them in `public/assets/sounds/cs/`:

### Weapon Fire Sounds (9 files)
- `ak47.mp3` - AK-47 rifle sound (deep, heavy)
- `m4a1.mp3` - M4A1 rifle sound (crisp, tactical)
- `awp.mp3` - AWP sniper sound (loud, powerful boom)
- `deagle.mp3` - Desert Eagle pistol (heavy pistol)
- `usp.mp3` - USP pistol (suppressed, quiet)
- `glock.mp3` - Glock pistol (light, rapid)
- `mp5.mp3` - MP5 SMG (classic SMG sound)
- `p90.mp3` - P90 SMG (futuristic, rapid)
- `scout.mp3` - Scout sniper (lighter sniper sound)

### Reload Sounds (5 files)
- `reload-pistol.mp3` - Pistol magazine reload
- `reload-rifle.mp3` - Rifle magazine reload
- `reload-shotgun.mp3` - Shotgun shell loading
- `reload-smg.mp3` - SMG magazine reload
- `reload-sniper.mp3` - Sniper rifle reload

### Hit & Damage Sounds (3 files)
- `hit-body.mp3` - Bullet impact on flesh
- `headshot.mp3` - Headshot hit marker
- `hit-armor.mp3` - Bullet hitting armor/vest

### Death Sounds (2 files)
- `death.mp3` - Player death sound
- `death-headshot.mp3` - Death from headshot

### Movement Sounds (4 files)
- `footstep1.mp3` - Footstep variation 1
- `footstep2.mp3` - Footstep variation 2
- `footstep3.mp3` - Footstep variation 3
- `footstep4.mp3` - Footstep variation 4

### Misc Sounds (3 files)
- `shell-drop.mp3` - Empty shell casing hitting ground
- `weapon-switch.mp3` - Weapon switching sound
- `empty-click.mp3` - Empty gun click sound

---

## Where to Download Free/Legal CS-Style Sounds

### Option 1: Freesound.org (Best for individual sounds)

1. Go to [freesound.org](https://freesound.org/)
2. Search for these terms:
   - "ak47 shot" or "rifle shot"
   - "pistol gunshot"
   - "sniper rifle"
   - "shell casing drop"
   - "footsteps concrete"
   - "reload gun"
   - "bullet impact"

3. Filter by **License: Creative Commons 0** (public domain) for no attribution
4. Or use **CC-BY** (requires attribution in your credits)
5. Download as MP3 or convert WAV to MP3

### Option 2: Zapsplat.com (Great weapon sounds)

1. Go to [zapsplat.com](https://www.zapsplat.com/)
2. Create free account
3. Search categories:
   - "Weapons & Explosions" → "Guns"
   - "Foley" → "Footsteps"
   - "Game Sounds" → "Impacts"
4. Download sounds (free with attribution)

### Option 3: OpenGameArt.org (Game-ready assets)

1. Go to [opengameart.org](https://opengameart.org/)
2. Search for:
   - "gun sounds"
   - "weapon sound pack"
   - "fps sounds"
3. Filter by license (CC0, CC-BY, etc.)

### Option 4: Use Free Sound Effect Packs

**Recommended Free Packs:**

1. **Sonniss Game Audio GDC Bundles** (free)
   - [Sonniss GDC Audio](https://sonniss.com/gameaudiogdc)
   - Huge professional sound libraries, completely free
   - Search for weapon sounds in the downloaded ZIP

2. **Boom Library Free Sounds**
   - [Boom Library](https://www.boomlibrary.com/free-sound-effects/)
   - Professional quality, some free packs

3. **Pro Sound Effects Free Library**
   - High quality game sounds
   - Registration required

---

## Quick Start with Placeholder Sounds

If you want to test the system before finding perfect sounds, you can:

1. Use AI sound generators:
   - [ElevenLabs Sound Effects](https://elevenlabs.io/sound-effects)
   - Describe the sound you want (e.g., "AK-47 gunshot")

2. Use text-to-speech for testing:
   - Temporary placeholder sounds just to test the system

3. Record your own sounds:
   - Use a smartphone and make mouth sounds (classic game dev technique!)

---

## Installation Steps

1. **Create the directory:**
   ```bash
   mkdir -p public/assets/sounds/cs
   ```

2. **Download your chosen sounds** from the sources above

3. **Rename files** to match the required filenames:
   - `ak47.mp3`, `deagle.mp3`, etc.

4. **Place files** in `public/assets/sounds/cs/`

5. **Verify file structure:**
   ```bash
   ls -la public/assets/sounds/cs/
   ```

   You should see all 29 sound files listed.

6. **Test in game** - The sounds will automatically load when you start the game!

---

## Sound Specifications

For best results, ensure your sounds meet these specs:

- **Format:** MP3 (widely supported)
- **Sample Rate:** 44.1 kHz or 48 kHz
- **Bit Rate:** 128-192 kbps (good quality, small size)
- **Channels:** Mono or Stereo
- **Duration:**
  - Gunshots: 0.1-0.5 seconds
  - Reloads: 1-2 seconds
  - Footsteps: 0.2-0.4 seconds
  - Shell drops: 0.3-0.6 seconds

---

## Converting Audio Files

If you download WAV files, convert to MP3 using:

### Online Converters:
- [CloudConvert](https://cloudconvert.com/wav-to-mp3)
- [Online-Convert](https://audio.online-convert.com/convert-to-mp3)

### Command Line (FFmpeg):
```bash
# Install ffmpeg first (Mac)
brew install ffmpeg

# Convert single file
ffmpeg -i input.wav -b:a 192k output.mp3

# Batch convert all WAV files in a folder
for f in *.wav; do ffmpeg -i "$f" -b:a 192k "${f%.wav}.mp3"; done
```

---

## Fallback Behavior

The sound system includes fallback sounds:

- If CS sounds aren't found, it uses the existing `Fire 1-5.mp3` sounds
- The game will still work even if some sounds are missing
- Check browser console for warnings about missing sounds

---

## Attribution (if required)

If you use CC-BY licensed sounds, add credits to your game:

Create a `CREDITS.md` file:

```markdown
# Sound Credits

## Weapon Sounds
- AK-47 sound by [Author] from Freesound.org (CC-BY 4.0)
- AWP sound by [Author] from Zapsplat.com

## Footstep Sounds
- Footsteps by [Author] from OpenGameArt.org (CC-BY 3.0)

[Add all attribution as required by licenses]
```

---

## Testing Your Sounds

After installation, test each sound type:

1. **Weapon sounds** - Fire different weapons (pistol, rifle, SMG, shotgun)
2. **Footsteps** - Move your character around
3. **Hit sounds** - Get hit by enemies (body shots, headshots)
4. **Death sound** - Die in game
5. **Shell drops** - Listen after firing (subtle sound)

---

## Troubleshooting

**Sounds not playing?**
- Check browser console (F12) for errors
- Verify file paths match exactly (case-sensitive!)
- Ensure files are MP3 format
- Check file permissions (readable)

**Sounds too loud/quiet?**
- Adjust volumes in `sound-effects.js` (lines 76-132)
- Change the volume parameter in `soundManager.preload()`

**Performance issues?**
- Reduce pool sizes in preload calls
- Compress audio files to lower bitrate
- Use mono instead of stereo

---

## Next Steps

Once sounds are installed, you can:

1. Fine-tune volumes in `sound-effects.js`
2. Adjust distance attenuation for spatial audio
3. Add more weapon types with unique sounds
4. Implement reload mechanics with reload sounds
5. Add radio commands / voice lines

---

## Legal Note

**IMPORTANT:** Do not use copyrighted sounds from actual Counter-Strike game files.
Only use:
- Public domain (CC0) sounds
- Creative Commons licensed sounds (with attribution)
- Royalty-free sound packs
- Your own recordings

Using official CS:GO sounds without permission violates Valve's copyright.

---

Happy sound hunting! 🎵
