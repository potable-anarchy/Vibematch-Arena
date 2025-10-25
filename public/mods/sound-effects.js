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
  }

  // Preload a sound buffer
  async preload(name, path, poolSize = 1, volume = 1.0) {
    try {
      const response = await fetch(path);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

      this.buffers[name] = {
        buffer: audioBuffer,
        volume: volume
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
    const soundData = this.buffers[name];
    if (!soundData) return;

    const source = this.context.createBufferSource();
    source.buffer = soundData.buffer;

    const gainNode = this.context.createGain();
    gainNode.gain.value = this.masterVolume * soundData.volume * volumeMultiplier;

    source.connect(gainNode);
    gainNode.connect(this.context.destination);

    source.start(0);
  }
}

// Initialize sound manager
const soundManager = new SoundManager();

// Preload all sounds with appropriate pool sizes and volumes
// Reduced pool sizes to minimize lag
soundManager.preload('fire1', '/assets/sounds/Fire 1.mp3', 2, 0.4);
soundManager.preload('fire2', '/assets/sounds/Fire 2.mp3', 2, 0.4);
soundManager.preload('fire3', '/assets/sounds/Fire 3.mp3', 2, 0.5);
soundManager.preload('fire4', '/assets/sounds/Fire 4.mp3', 2, 0.3);
soundManager.preload('fire5', '/assets/sounds/Fire 5.mp3', 2, 0.5);
soundManager.preload('fire6', '/assets/sounds/Fire 6.mp3', 2, 0.4);

// Hit and death sounds
soundManager.preload('hit', '/assets/sounds/Hit 1.mp3', 2, 0.5);
soundManager.preload('death', '/assets/sounds/Game Over.mp3', 1, 0.5);

// Map weapons to specific sounds
const weaponSounds = {
  pistol: 'fire1',
  smg: 'fire4',      // Lighter, faster sound
  shotgun: 'fire5',  // Heavier sound
  rifle: 'fire3',    // Medium punch
};

// Track last shot time per player to avoid sound spam
const lastShotTimes = new Map();
const SHOT_SOUND_COOLDOWN = 100; // ms - minimum time between shot sounds

// Register hook for shooting
registerHook('onShoot', (data) => {
  const playerId = game.getPlayerId();
  const state = game.getState();
  const localPlayer = state.players.find((p) => p.id === playerId);

  if (!localPlayer) return;

  const now = Date.now();
  const lastShot = lastShotTimes.get(data.playerId) || 0;

  // Throttle shot sounds to prevent audio overlap spam
  if (now - lastShot < SHOT_SOUND_COOLDOWN) {
    return;
  }

  lastShotTimes.set(data.playerId, now);

  // Calculate distance from local player
  const dx = data.x - localPlayer.x;
  const dy = data.y - localPlayer.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Max hearing range
  const maxHearingRange = 600;

  if (distance > maxHearingRange) {
    return; // Too far, don't play
  }

  // Calculate volume based on distance
  let volumeMultiplier = 1.0;

  if (data.playerId === playerId) {
    // Always play own shots at full volume
    volumeMultiplier = 1.0;
  } else if (distance > 100) {
    // Volume falloff for other players (quieter as distance increases)
    volumeMultiplier = Math.max(0.2, 1.0 - distance / maxHearingRange);
  }

  // Play appropriate weapon sound
  const soundName = weaponSounds[data.weapon] || 'fire1';
  soundManager.playWithVolume(soundName, volumeMultiplier);
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

console.log('✅ Sound effects mod loaded!');
