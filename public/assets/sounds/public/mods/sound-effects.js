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

// ============================================================================
// COUNTER-STRIKE STYLE WEAPON SOUNDS
// ============================================================================

// Weapon fire sounds - CS style with distinct characteristics per weapon
soundManager.preload('ak47', '/assets/sounds/cs/ak47.mp3', 6, 0.7);
soundManager.preload('m4a1', '/assets/sounds/cs/m4a1.mp3', 6, 0.65);
soundManager.preload('awp', '/assets/sounds/cs/awp.mp3', 4, 0.85);
soundManager.preload('deagle', '/assets/sounds/cs/deagle.mp3', 5, 0.75);
soundManager.preload('usp', '/assets/sounds/cs/usp.mp3', 5, 0.55);
soundManager.preload('glock', '/assets/sounds/cs/glock.mp3', 6, 0.6);
soundManager.preload('mp5', '/assets/sounds/cs/mp5.mp3', 6, 0.5);
soundManager.preload('p90', '/assets/sounds/cs/p90.mp3', 6, 0.55);
soundManager.preload('scout', '/assets/sounds/cs/scout.mp3', 4, 0.7);

// Fallback to old sounds if CS sounds don't exist yet
soundManager.preload('fire1', '/assets/sounds/Fire 1.mp3', 5, 0.6);
soundManager.preload('fire2', '/assets/sounds/Fire 2.mp3', 5, 0.6);
soundManager.preload('fire3', '/assets/sounds/Fire 3.mp3', 5, 0.7);
soundManager.preload('fire4', '/assets/sounds/Fire 4.mp3', 5, 0.5);
soundManager.preload('fire5', '/assets/sounds/Fire 5.mp3', 5, 0.8);

// ============================================================================
// RELOAD SOUNDS
// ============================================================================
soundManager.preload('reload-pistol', '/assets/sounds/cs/reload-pistol.mp3', 3, 0.5);
soundManager.preload('reload-rifle', '/assets/sounds/cs/reload-rifle.mp3', 3, 0.5);
soundManager.preload('reload-shotgun', '/assets/sounds/cs/reload-shotgun.mp3', 3, 0.5);
soundManager.preload('reload-smg', '/assets/sounds/cs/reload-smg.mp3', 3, 0.5);
soundManager.preload('reload-sniper', '/assets/sounds/cs/reload-sniper.mp3', 3, 0.5);

// ============================================================================
// HIT & DAMAGE SOUNDS
// ============================================================================
soundManager.preload('hit', '/assets/sounds/Hit 1.mp3', 4, 0.8);
soundManager.preload('hit-body', '/assets/sounds/cs/hit-body.mp3', 4, 0.6);
soundManager.preload('hit-headshot', '/assets/sounds/cs/headshot.mp3', 3, 0.9);
soundManager.preload('hit-armor', '/assets/sounds/cs/hit-armor.mp3', 4, 0.65);

// ============================================================================
// DEATH SOUNDS - CS Style
// ============================================================================
soundManager.preload('death', '/assets/sounds/cs/death.mp3', 3, 0.7);
soundManager.preload('death-headshot', '/assets/sounds/cs/death-headshot.mp3', 3, 0.75);

// Fallback death sound
soundManager.preload('death-old', '/assets/sounds/Game Over.mp3', 3, 0.7);

// ============================================================================
// MOVEMENT SOUNDS
// ============================================================================
soundManager.preload('footstep1', '/assets/sounds/cs/footstep1.mp3', 8, 0.3);
soundManager.preload('footstep2', '/assets/sounds/cs/footstep2.mp3', 8, 0.3);
soundManager.preload('footstep3', '/assets/sounds/cs/footstep3.mp3', 8, 0.3);
soundManager.preload('footstep4', '/assets/sounds/cs/footstep4.mp3', 8, 0.3);

// ============================================================================
// MISC SOUNDS
// ============================================================================
soundManager.preload('shell-drop', '/assets/sounds/cs/shell-drop.mp3', 6, 0.25);
soundManager.preload('weapon-switch', '/assets/sounds/cs/weapon-switch.mp3', 3, 0.4);
soundManager.preload('empty-click', '/assets/sounds/cs/empty-click.mp3', 3, 0.5);

// ============================================================================
// WEAPON SOUND MAPPING
// ============================================================================
// Map weapon types to CS-style sounds (with fallbacks)
const weaponSounds = {
  pistol: 'deagle',     // Use Desert Eagle for pistol
  smg: 'p90',           // P90 for SMG
  shotgun: 'fire5',     // Keep heavy shotgun sound
  rifle: 'ak47',        // AK-47 for rifle
  sniper: 'awp',        // AWP for sniper
};

// Detailed weapon mapping (for future weapon system expansion)
const weaponSoundMap = {
  // Pistols
  'deagle': 'deagle',
  'usp': 'usp',
  'glock': 'glock',
  'pistol': 'deagle',

  // Rifles
  'ak47': 'ak47',
  'm4a1': 'm4a1',
  'rifle': 'ak47',

  // SMGs
  'mp5': 'mp5',
  'p90': 'p90',
  'smg': 'p90',

  // Snipers
  'awp': 'awp',
  'scout': 'scout',
  'sniper': 'awp',

  // Shotgun
  'shotgun': 'fire5',

  // Fallbacks
  'fire1': 'fire1',
  'fire2': 'fire2',
  'fire3': 'fire3',
  'fire4': 'fire4',
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

// ============================================================================
// FOOTSTEP SOUNDS - CS Style Movement Audio
// ============================================================================
const playerMovementData = new Map();
const FOOTSTEP_INTERVAL = 300; // ms between footstep sounds when moving
let lastFootstepIndex = 0;

registerHook('onUpdate', () => {
  const playerId = game.getPlayerId();
  const state = game.getState();
  const localPlayer = state.players.find((p) => p.id === playerId);

  if (!localPlayer) return;

  const now = Date.now();
  let playerData = playerMovementData.get(playerId);

  if (!playerData) {
    playerData = {
      lastX: localPlayer.x,
      lastY: localPlayer.y,
      lastFootstep: 0,
    };
    playerMovementData.set(playerId, playerData);
  }

  // Check if player is moving
  const dx = localPlayer.x - playerData.lastX;
  const dy = localPlayer.y - playerData.lastY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // If player moved enough distance and enough time passed
  if (distance > 5 && now - playerData.lastFootstep > FOOTSTEP_INTERVAL) {
    // Cycle through footstep sounds for variation
    lastFootstepIndex = (lastFootstepIndex % 4) + 1;
    soundManager.play(`footstep${lastFootstepIndex}`);
    playerData.lastFootstep = now;
  }

  // Update position
  playerData.lastX = localPlayer.x;
  playerData.lastY = localPlayer.y;
});

// ============================================================================
// SHELL EJECTION SOUNDS - Play quietly after each shot
// ============================================================================
registerHook('onShoot', (data) => {
  const playerId = game.getPlayerId();

  // Only play shell sound for our own shots
  if (data.playerId === playerId) {
    // Delay shell drop sound slightly after shot (realistic timing)
    setTimeout(() => {
      soundManager.play('shell-drop');
    }, 100);
  }
});

// ============================================================================
// ENHANCED HIT SOUNDS - Different sounds for headshot/body/armor
// ============================================================================
registerHook('onHit', (shooterId, targetId, damage, isHeadshot) => {
  const playerId = game.getPlayerId();

  // Only play hit sound if we are the one who got hit
  if (targetId === playerId) {
    // Play different sound based on hit type
    if (isHeadshot) {
      soundManager.play('hit-headshot');
    } else if (damage < 10) {
      soundManager.play('hit-armor'); // Low damage = armor absorbed
    } else {
      soundManager.play('hit-body');
    }
  }

  // Play headshot indicator for shooter
  if (shooterId === playerId && isHeadshot) {
    // Subtle headshot confirmation sound for the shooter
    setTimeout(() => {
      soundManager.playWithVolume('hit-headshot', 0.3);
    }, 50);
  }
});

console.log('Counter-Strike sound effects mod loaded!');
