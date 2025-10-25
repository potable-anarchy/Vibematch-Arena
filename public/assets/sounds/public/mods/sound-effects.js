/**
 * Sound Effects Mod
 * Adds essential game sounds for shooting, hits, and deaths
 */

// Sound manager with pooling for better performance
class SoundManager {
  constructor() {
    this.sounds = {};
    this.pools = {};
    this.masterVolume = 0.3;
  }

  // Preload a sound and create a pool
  preload(name, path, poolSize = 3, volume = 1.0) {
    this.pools[name] = {
      sounds: [],
      volume: volume,
      currentIndex: 0,
    };

    for (let i = 0; i < poolSize; i++) {
      const audio = new Audio(path);
      audio.volume = this.masterVolume * volume;
      audio.preload = 'auto';
      this.pools[name].sounds.push(audio);
    }
  }

  // Play a sound from the pool
  play(name) {
    const pool = this.pools[name];
    if (!pool) {
      console.warn(`Sound '${name}' not found`);
      return;
    }

    const sound = pool.sounds[pool.currentIndex];
    pool.currentIndex = (pool.currentIndex + 1) % pool.sounds.length;

    // Reset sound if it's already playing
    sound.currentTime = 0;
    sound.play().catch((e) => {
      // Ignore errors (usually autoplay policy)
    });
  }

  // Play with specific volume override
  playWithVolume(name, volumeMultiplier = 1.0) {
    const pool = this.pools[name];
    if (!pool) return;

    const sound = pool.sounds[pool.currentIndex];
    pool.currentIndex = (pool.currentIndex + 1) % pool.sounds.length;

    const originalVolume = sound.volume;
    sound.volume = this.masterVolume * pool.volume * volumeMultiplier;
    sound.currentTime = 0;
    sound.play().catch(() => {});

    // Restore original volume after playing
    setTimeout(() => {
      sound.volume = originalVolume;
    }, 100);
  }
}

// Initialize sound manager
const soundManager = new SoundManager();

// Preload all sounds with appropriate pool sizes and volumes
// Gun sounds - we need more pool size since these fire rapidly
soundManager.preload('fire1', '/assets/sounds/Fire 1.mp3', 5, 0.6);
soundManager.preload('fire2', '/assets/sounds/Fire 2.mp3', 5, 0.6);
soundManager.preload('fire3', '/assets/sounds/Fire 3.mp3', 5, 0.7);
soundManager.preload('fire4', '/assets/sounds/Fire 4.mp3', 5, 0.5);
soundManager.preload('fire5', '/assets/sounds/Fire 5.mp3', 5, 0.8);
soundManager.preload('fire6', '/assets/sounds/Fire 6.mp3', 5, 0.6);

// Hit and death sounds
soundManager.preload('hit', '/assets/sounds/Hit 1.mp3', 4, 0.8);
soundManager.preload('death', '/assets/sounds/Game Over.mp3', 3, 0.7);

// Map weapons to specific sounds
const weaponSounds = {
  pistol: 'fire1',
  smg: 'fire4',      // Lighter, faster sound
  shotgun: 'fire5',  // Heavier sound
  rifle: 'fire3',    // Medium punch
};

// Track last shot time per player to avoid sound spam
const lastShotTimes = new Map();
const SHOT_SOUND_COOLDOWN = 50; // ms - minimum time between shot sounds

// Register hook for shooting
registerHook('onShoot', (data) => {
  const now = Date.now();
  const lastShot = lastShotTimes.get(data.playerId) || 0;

  // Throttle shot sounds to prevent audio overlap spam
  if (now - lastShot < SHOT_SOUND_COOLDOWN) {
    return;
  }

  lastShotTimes.set(data.playerId, now);

  // Play appropriate weapon sound
  const soundName = weaponSounds[data.weapon] || 'fire1';

  // Calculate distance from player for volume falloff
  const playerId = game.getPlayerId();
  const state = game.getState();
  const localPlayer = state.players.find((p) => p.id === playerId);

  if (localPlayer) {
    const dx = data.x - localPlayer.x;
    const dy = data.y - localPlayer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Volume falloff based on distance (max hearing range ~800 pixels)
    const maxHearingRange = 800;
    let volumeMultiplier = 1.0;

    if (distance > maxHearingRange) {
      return; // Too far, don't play
    } else if (distance > 100) {
      volumeMultiplier = Math.max(0.2, 1.0 - distance / maxHearingRange);
    }

    // Always play own shots at full volume
    if (data.playerId === playerId) {
      volumeMultiplier = 1.0;
    }

    soundManager.playWithVolume(soundName, volumeMultiplier);
  }
});

// Register hook for player hit
registerHook('onHit', (shooterId, targetId, damage) => {
  const playerId = game.getPlayerId();

  // Only play hit sound if we are the one who got hit
  if (targetId === playerId) {
    soundManager.play('hit');
  }
});

// Register hook for player death
registerHook('onKill', (killerId, victimId) => {
  const playerId = game.getPlayerId();

  // Play death sound if we died
  if (victimId === playerId) {
    soundManager.play('death');
  }
});

console.log('Sound effects mod loaded!');
