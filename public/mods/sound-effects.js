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

    // Resume audio context on first user interaction to avoid autoplay restrictions
    const resumeAudio = async () => {
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      this.ready = true;
      document.removeEventListener('click', resumeAudio);
      document.removeEventListener('keydown', resumeAudio);
    };

    document.addEventListener('click', resumeAudio);
    document.addEventListener('keydown', resumeAudio);
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
    // Ensure audio context is resumed
    if (this.context.state === 'suspended') {
      this.context.resume();
    }

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

// Preload all sounds asynchronously
(async () => {
  // Realistic weapon sounds from public domain firearm library
  await soundManager.preload('glock', '/assets/sounds/glock.mp3', 1, 0.6);
  await soundManager.preload('deagle', '/assets/sounds/deagle.mp3', 1, 0.7);
  await soundManager.preload('usp', '/assets/sounds/usp.mp3', 1, 0.5);
  await soundManager.preload('mp5', '/assets/sounds/mp5.mp3', 1, 0.6);
  await soundManager.preload('p90', '/assets/sounds/p90.mp3', 1, 0.6);
  await soundManager.preload('ak47', '/assets/sounds/ak47.mp3', 1, 0.8);
  await soundManager.preload('m4a1', '/assets/sounds/m4a1.mp3', 1, 0.7);
  await soundManager.preload('awp', '/assets/sounds/awp.mp3', 1, 0.9);
  await soundManager.preload('scout', '/assets/sounds/scout.mp3', 1, 0.7);
  await soundManager.preload('shotgun', '/assets/sounds/shotgun.mp3', 1, 0.8);

  // Hit and death sounds
  await soundManager.preload('hit', '/assets/sounds/Hit 1.mp3', 1, 0.5);
  await soundManager.preload('death', '/assets/sounds/Game Over.mp3', 1, 0.5);

  console.log('✅ Realistic CS-style weapon sounds loaded!');
})();

// Map weapons to specific sounds
const weaponSounds = {
  pistol: 'glock',
  smg: 'mp5',
  shotgun: 'shotgun',
  rifle: 'ak47',
};

// Track last shot time per player to avoid sound spam
const lastShotTimes = new Map();
const SHOT_SOUND_COOLDOWN = 100; // ms - minimum time between shot sounds for other players

// Register hook for shooting
registerHook('onShoot', (data) => {
  const playerId = game.getPlayerId();
  const state = game.getState();
  const localPlayer = state.players.find((p) => p.id === playerId);

  if (!localPlayer) return;

  const now = Date.now();
  const lastShot = lastShotTimes.get(data.playerId) || 0;

  // Only throttle other players' shots, not our own (for instant feedback)
  if (data.playerId !== playerId && now - lastShot < SHOT_SOUND_COOLDOWN) {
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
