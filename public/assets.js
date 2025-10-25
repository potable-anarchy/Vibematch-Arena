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
      const promise = this.loadImage(`${animationKey}_${i}`, framePath).then(() => {
        frames[i] = this.images[`${animationKey}_${i}`];
      });
      promises.push(promise);
    }

    await Promise.all(promises);
    this.animations[animationKey] = frames;
    return frames;
  }

  async loadAll() {
    const assetList = [
      // Effects
      { key: "blood_splat", src: "/assets/effects/blood-splat.png" },

      // Tiles
      { key: "tile_concrete", src: "/assets/PNG/Tiles/tile_01.png" },
      { key: "tile_wall", src: "/assets/PNG/Tiles/tile_45.png" },
      { key: "tile_crate", src: "/assets/PNG/Tiles/tile_134.png" },
    ];

    this.totalAssets = assetList.length;

    const loadPromises = assetList.map((asset) =>
      this.loadImage(asset.key, asset.src),
    );

    // Load survivor animations
    const animationPromises = [
      // Handgun animations
      this.loadAnimationFrames('handgun_idle', '/assets/survivor_sprites/handgun/idle/survivor-idle_handgun', 20),
      this.loadAnimationFrames('handgun_move', '/assets/survivor_sprites/handgun/move/survivor-move_handgun', 20),
      this.loadAnimationFrames('handgun_shoot', '/assets/survivor_sprites/handgun/shoot/survivor-shoot_handgun', 3),
      this.loadAnimationFrames('handgun_reload', '/assets/survivor_sprites/handgun/reload/survivor-reload_handgun', 15),
      this.loadAnimationFrames('handgun_melee', '/assets/survivor_sprites/handgun/meleeattack/survivor-meleeattack_handgun', 15),

      // Rifle animations
      this.loadAnimationFrames('rifle_idle', '/assets/survivor_sprites/rifle/idle/survivor-idle_rifle', 20),
      this.loadAnimationFrames('rifle_move', '/assets/survivor_sprites/rifle/move/survivor-move_rifle', 20),
      this.loadAnimationFrames('rifle_shoot', '/assets/survivor_sprites/rifle/shoot/survivor-shoot_rifle', 3),
      this.loadAnimationFrames('rifle_reload', '/assets/survivor_sprites/rifle/reload/survivor-reload_rifle', 15),
      this.loadAnimationFrames('rifle_melee', '/assets/survivor_sprites/rifle/meleeattack/survivor-meleeattack_rifle', 15),

      // Feet animations (for movement)
      this.loadAnimationFrames('feet_idle', '/assets/survivor_sprites/feet/idle/survivor-idle_feet', 1),
      this.loadAnimationFrames('feet_walk', '/assets/survivor_sprites/feet/walk/survivor-walk_feet', 20),
      this.loadAnimationFrames('feet_run', '/assets/survivor_sprites/feet/run/survivor-run_feet', 20),
      this.loadAnimationFrames('feet_strafe_left', '/assets/survivor_sprites/feet/strafe_left/survivor-strafe_left_feet', 20),
      this.loadAnimationFrames('feet_strafe_right', '/assets/survivor_sprites/feet/strafe_right/survivor-strafe_right_feet', 20),
    ];

    await Promise.all([...loadPromises, ...animationPromises]);
    this.loaded = true;
    console.log("All assets loaded!");
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
