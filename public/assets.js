// Asset loader for the game
export class AssetLoader {
  constructor() {
    this.images = {};
    this.animations = {}; // Store animation frames
    this.loaded = false;
    this.totalAssets = 0;
    this.loadedAssets = 0;
  }

  // Load a sequence of animation frames
  async loadAnimationFrames(animationKey, basePath, frameCount) {
    const frames = [];
    const promises = [];

    for (let i = 0; i < frameCount; i++) {
      const framePath = `${basePath}_${i}.png`;
      const promise = this.loadImage(`${animationKey}_${i}`, framePath).then(
        () => {
          frames[i] = this.images[`${animationKey}_${i}`];
        },
      );
      promises.push(promise);
    }

    await Promise.all(promises);
    this.animations[animationKey] = frames;
    return frames;
  }

  async loadAll() {
    // Only load critical assets upfront - animations will lazy load
    const assetList = [
      // Effects
      { key: "blood_splat", src: "/assets/effects/blood-splat.png" },

      // Tiles
      { key: "tile_concrete", src: "/assets/PNG/Tiles/tile_01.png" },
      { key: "tile_wall", src: "/assets/PNG/Tiles/tile_45.png" },
      { key: "tile_crate", src: "/assets/PNG/Tiles/tile_134.png" },

      // Weapon pickups
      { key: "weapon_pistol", src: "/assets/weapons/weapon_pistol.png" },
      { key: "weapon_smg", src: "/assets/weapons/weapon_smg.png" },
      { key: "weapon_shotgun", src: "/assets/weapons/weapon_shotgun.png" },
      { key: "weapon_rifle", src: "/assets/weapons/weapon_rifle.png" },
    ];

    this.totalAssets = assetList.length;

    const loadPromises = assetList.map((asset) =>
      this.loadImage(asset.key, asset.src),
    );

    await Promise.all(loadPromises);

    // Load first frame of pistol idle animation for immediate display
    await this.loadAnimationFrames(
      "handgun_idle",
      "/assets/survivor_sprites/handgun/idle/survivor-idle_handgun",
      1, // Just load first frame
    );

    this.loaded = true;
    console.log(
      "Critical assets loaded! Animations will load in background...",
    );

    // Load remaining animations in background (non-blocking)
    this.loadBackgroundAnimations();
  }

  async loadBackgroundAnimations() {
    console.log("Loading animations in background...");

    // Load all animation frames in background
    const animationPromises = [
      // Complete handgun animations
      this.loadAnimationFrames(
        "handgun_idle",
        "/assets/survivor_sprites/handgun/idle/survivor-idle_handgun",
        20,
      ),
      this.loadAnimationFrames(
        "handgun_move",
        "/assets/survivor_sprites/handgun/move/survivor-move_handgun",
        20,
      ),
      this.loadAnimationFrames(
        "handgun_shoot",
        "/assets/survivor_sprites/handgun/shoot/survivor-shoot_handgun",
        3,
      ),
      this.loadAnimationFrames(
        "handgun_reload",
        "/assets/survivor_sprites/handgun/reload/survivor-reload_handgun",
        15,
      ),

      // Rifle animations (for rifle and SMG)
      this.loadAnimationFrames(
        "rifle_idle",
        "/assets/survivor_sprites/rifle/idle/survivor-idle_rifle",
        20,
      ),
      this.loadAnimationFrames(
        "rifle_move",
        "/assets/survivor_sprites/rifle/move/survivor-move_rifle",
        20,
      ),
      this.loadAnimationFrames(
        "rifle_shoot",
        "/assets/survivor_sprites/rifle/shoot/survivor-shoot_rifle",
        3,
      ),
      this.loadAnimationFrames(
        "rifle_reload",
        "/assets/survivor_sprites/rifle/reload/survivor-reload_rifle",
        15,
      ),

      // Shotgun animations
      this.loadAnimationFrames(
        "shotgun_idle",
        "/assets/survivor_sprites/shotgun/idle/survivor-idle_shotgun",
        20,
      ),
      this.loadAnimationFrames(
        "shotgun_move",
        "/assets/survivor_sprites/shotgun/move/survivor-move_shotgun",
        20,
      ),
      this.loadAnimationFrames(
        "shotgun_shoot",
        "/assets/survivor_sprites/shotgun/shoot/survivor-shoot_shotgun",
        3,
      ),
      this.loadAnimationFrames(
        "shotgun_reload",
        "/assets/survivor_sprites/shotgun/reload/survivor-reload_shotgun",
        15,
      ),
    ];

    await Promise.all(animationPromises);
    console.log("✅ All animations loaded!");
  }

  loadImage(key, src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images[key] = img;
        this.loadedAssets++;
        console.log(
          `Loaded: ${key} (${this.loadedAssets}/${this.totalAssets})`,
        );
        resolve();
      };
      img.onerror = () => {
        console.error(`Failed to load: ${src}`);
        resolve(); // Still resolve to not block loading
      };
      img.src = src;
    });
  }

  get(key) {
    return this.images[key];
  }

  getAnimation(key) {
    return this.animations[key];
  }

  getProgress() {
    return this.totalAssets > 0 ? this.loadedAssets / this.totalAssets : 0;
  }
}

// Animation manager for player sprites
export class PlayerAnimator {
  constructor() {
    this.currentFrame = 0;
    this.frameTime = 0;
    this.frameDelay = 50; // milliseconds per frame
  }

  update(dt) {
    this.frameTime += dt * 1000; // Convert to ms
    if (this.frameTime >= this.frameDelay) {
      this.currentFrame++;
      this.frameTime = 0;
    }
  }

  getFrame(animation, loop = true) {
    if (!animation || animation.length === 0) return null;

    if (loop) {
      return animation[this.currentFrame % animation.length];
    } else {
      return animation[Math.min(this.currentFrame, animation.length - 1)];
    }
  }

  reset() {
    this.currentFrame = 0;
    this.frameTime = 0;
  }

  setFrameDelay(delay) {
    this.frameDelay = delay;
  }
}
