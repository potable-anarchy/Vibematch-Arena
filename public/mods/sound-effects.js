/**
 * Sound Effects Mod
 * Adds essential game sounds for shooting, hits, and deaths
 */

// Sound manager using Web Audio API for better performance
class SoundManager {
  constructor() {
    this.context = new (window.AudioContext || window.webkitAudioContext)();
    this.buffers = {};
    this.masterVolume = 0.3;
    this.ready = false;
    this.activeSources = new Set(); // Track active sources for Safari

    // Resume audio context on first user interaction to avoid autoplay restrictions
    const resumeAudio = async () => {
      if (this.context.state === "suspended") {
        await this.context.resume();
      }
      this.ready = true;
      document.removeEventListener("click", resumeAudio);
      document.removeEventListener("keydown", resumeAudio);
    };

    document.addEventListener("click", resumeAudio);
    document.addEventListener("keydown", resumeAudio);
  }

  // Preload a sound buffer
  async preload(name, path, poolSize = 1, volume = 1.0) {
    try {
      const response = await fetch(path);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

      this.buffers[name] = {
        buffer: audioBuffer,
        volume: volume,
      };
    } catch (e) {
      console.warn(`Failed to load sound: ${name}`, e);
    }
  }

  // Play a sound buffer
  play(name) {
    this.playWithVolume(name, 1.0);
  }

  // Play with specific volume override
  playWithVolume(name, volumeMultiplier = 1.0) {
    // Ensure audio context is resumed
    if (this.context.state === "suspended") {
      this.context.resume();
    }

    const soundData = this.buffers[name];
    if (!soundData) return;

    // Safari-specific: Limit concurrent AudioNodes to prevent crashes
    // Safari has a stricter limit (~32-64 active nodes) compared to Chrome
    if (this.activeSources.size > 30) {
      console.warn("Too many active audio sources, skipping sound:", name);
      return;
    }

    const source = this.context.createBufferSource();
    source.buffer = soundData.buffer;

    const gainNode = this.context.createGain();
    gainNode.gain.value =
      this.masterVolume * soundData.volume * volumeMultiplier;

    source.connect(gainNode);
    gainNode.connect(this.context.destination);

    // Track this source
    this.activeSources.add(source);

    // Clean up nodes after playback finishes to prevent memory leaks
    // This is critical for Safari which has stricter limits on active AudioNodes
    const cleanup = () => {
      this.activeSources.delete(source);
      try {
        gainNode.disconnect();
        source.disconnect();
      } catch (e) {
        // Ignore errors if already disconnected
      }
    };

    source.onended = cleanup;

    // Failsafe: cleanup after maximum possible duration
    // This ensures cleanup even if onended doesn't fire reliably
    const maxDuration = soundData.buffer.duration * 1000 + 100; // ms with buffer
    setTimeout(cleanup, maxDuration);

    try {
      source.start(0);
    } catch (e) {
      console.error("Failed to start audio source:", e);
      cleanup(); // Clean up immediately on error
    }
  }
}

// Initialize sound manager
const soundManager = new SoundManager();

// Preload sounds in background (non-blocking)
(async () => {
  console.log("Loading sounds in background...");

  // Load most common sounds first for quick playback
  const criticalSounds = [
    soundManager.preload("glock", "/assets/sounds/glock.mp3", 1, 0.6),
    soundManager.preload("hit", "/assets/sounds/Hit 1.mp3", 1, 0.5),
    soundManager.preload("click", "/assets/sounds/click.mp3", 1, 0.4),
  ];

  await Promise.all(criticalSounds);
  console.log("✅ Critical sounds loaded!");

  // Load remaining weapon sounds in background
  const remainingSounds = [
    soundManager.preload("deagle", "/assets/sounds/deagle.mp3", 1, 0.7),
    soundManager.preload("usp", "/assets/sounds/usp.mp3", 1, 0.5),
    soundManager.preload("mp5", "/assets/sounds/mp5.mp3", 1, 0.6),
    soundManager.preload("p90", "/assets/sounds/p90.mp3", 1, 0.6),
    soundManager.preload("ak47", "/assets/sounds/ak47.mp3", 1, 0.8),
    soundManager.preload("m4a1", "/assets/sounds/m4a1.mp3", 1, 0.7),
    soundManager.preload("awp", "/assets/sounds/awp.mp3", 1, 0.9),
    soundManager.preload("scout", "/assets/sounds/scout.mp3", 1, 0.7),
    soundManager.preload("shotgun", "/assets/sounds/shotgun.mp3", 1, 0.8),
    soundManager.preload("death", "/assets/sounds/Game Over.mp3", 1, 0.5),
  ];

  await Promise.all(remainingSounds);
  console.log("✅ All weapon sounds loaded!");
})();

// Map weapons to specific sounds
const weaponSounds = {
  pistol: "glock",
  smg: "mp5",
  shotgun: "shotgun",
  rifle: "ak47",
};

// Track last shot time per player to avoid sound spam
const lastShotTimes = new Map();
const SHOT_SOUND_COOLDOWN = 100; // ms - minimum time between shot sounds for other players
const LOCAL_SHOT_COOLDOWN = 50; // ms - minimal cooldown for local player to prevent triple-firing

// Register hook for shooting
registerHook("onShoot", (data) => {
  const playerId = game.getPlayerId();

  // Debug logging for local player shots
  if (data.playerId === playerId) {
    console.log("🔫 onShoot called:", data);
  }

  const state = game.getState();
  const localPlayer = state.players.find((p) => p.id === playerId);

  const now = Date.now();
  const lastShot = lastShotTimes.get(data.playerId) || 0;

  // Use shorter cooldown for local player, longer for others
  const cooldown =
    data.playerId === playerId ? LOCAL_SHOT_COOLDOWN : SHOT_SOUND_COOLDOWN;

  if (now - lastShot < cooldown) {
    if (data.playerId === playerId) {
      console.log("⏭️ Skipped shot due to cooldown");
    }
    return;
  }

  lastShotTimes.set(data.playerId, now);

  // Calculate volume based on distance from camera/player
  let volumeMultiplier = 1.0;

  if (localPlayer) {
    // Playing - calculate distance from local player
    const dx = data.x - localPlayer.x;
    const dy = data.y - localPlayer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Max hearing range
    const maxHearingRange = 600;

    if (distance > maxHearingRange) {
      return; // Too far, don't play
    }

    if (data.playerId === playerId) {
      // Always play own shots at full volume
      volumeMultiplier = 1.0;
    } else if (distance > 100) {
      // Volume falloff for other players (quieter as distance increases)
      volumeMultiplier = Math.max(0.2, 1.0 - distance / maxHearingRange);
    }
  } else {
    // Spectating - calculate distance from camera
    const camera = game.getCamera();
    const dx = data.x - camera.x;
    const dy = data.y - camera.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Max hearing range in spectate mode
    const maxHearingRange = 800; // Slightly larger range for spectators

    if (distance > maxHearingRange) {
      return; // Too far, don't play
    }

    // Volume falloff based on camera distance
    if (distance > 100) {
      volumeMultiplier = Math.max(0.3, 1.0 - distance / maxHearingRange);
    }
  }

  // Play appropriate weapon sound
  const soundName = weaponSounds[data.weapon] || "glock";

  if (!localPlayer) {
    // Debug spectator sounds
    console.log(
      "👻 Spectator shot:",
      soundName,
      "volume:",
      volumeMultiplier.toFixed(2),
    );
  }

  soundManager.playWithVolume(soundName, volumeMultiplier);
});

// Register hook for player hit
registerHook("onHit", (shooterId, targetId, damage) => {
  const playerId = game.getPlayerId();

  // Only play hit sound if we are the one who got hit
  if (targetId === playerId) {
    soundManager.play("hit");
  }
});

// Register hook for player death
registerHook("onKill", (killerId, victimId) => {
  const playerId = game.getPlayerId();

  // Play death sound if we died
  if (victimId === playerId) {
    soundManager.play("death");
  }
});

// Register hook for out of ammo click
registerHook("onOutOfAmmo", (data) => {
  const playerId = game.getPlayerId();

  // Only play click sound for the local player
  if (data.playerId === playerId) {
    soundManager.play("click");
  }
});

// Track if mod is loaded multiple times
if (window.soundEffectsModLoadCount) {
  console.warn(
    "⚠️ Sound effects mod loaded MULTIPLE times!",
    ++window.soundEffectsModLoadCount,
  );
} else {
  window.soundEffectsModLoadCount = 1;
  console.log("✅ Sound effects mod loaded!");
}
