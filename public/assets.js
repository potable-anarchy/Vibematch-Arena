// Asset loader for the game
export class AssetLoader {
  constructor() {
    this.images = {};
    this.loaded = false;
    this.totalAssets = 0;
    this.loadedAssets = 0;
  }

  async loadAll() {
    const assetList = [
      // Player sprites
      {
        key: "player_blue_gun",
        src: "/assets/sprites/Man Blue/manBlue_gun.png",
      },
      {
        key: "player_blue_hold",
        src: "/assets/sprites/Man Blue/manBlue_hold.png",
      },
      {
        key: "player_blue_machine",
        src: "/assets/sprites/Man Blue/manBlue_machine.png",
      },
      {
        key: "player_brown_gun",
        src: "/assets/sprites/Man Brown/manBrown_gun.png",
      },
      {
        key: "player_brown_hold",
        src: "/assets/sprites/Man Brown/manBrown_hold.png",
      },
      {
        key: "player_soldier_gun",
        src: "/assets/sprites/Soldier 1/soldier1_gun.png",
      },
      {
        key: "player_soldier_hold",
        src: "/assets/sprites/Soldier 1/soldier1_hold.png",
      },
      {
        key: "player_soldier_machine",
        src: "/assets/sprites/Soldier 1/soldier1_machine.png",
      },
      {
        key: "player_hitman_gun",
        src: "/assets/sprites/Hitman 1/hitman1_gun.png",
      },
      {
        key: "player_hitman_hold",
        src: "/assets/sprites/Hitman 1/hitman1_hold.png",
      },
      {
        key: "player_hitman_machine",
        src: "/assets/sprites/Hitman 1/hitman1_machine.png",
      },
      { key: "zombie_gun", src: "/assets/sprites/Zombie 1/zoimbie1_gun.png" },
      { key: "zombie_hold", src: "/assets/sprites/Zombie 1/zoimbie1_hold.png" },

      // Weapons
      { key: "weapon_gun", src: "/assets/weapons/weapon_gun.png" },
      { key: "weapon_machine", src: "/assets/weapons/weapon_machine.png" },
      { key: "weapon_silencer", src: "/assets/weapons/weapon_silencer.png" },

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

    await Promise.all(loadPromises);
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

  getProgress() {
    return this.totalAssets > 0 ? this.loadedAssets / this.totalAssets : 0;
  }
}
