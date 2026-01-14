/**
 * Bootstrap Scene
 *
 * Preloads all game assets (tilemaps, sprites, characters).
 * Launched first, then transitions to Game scene.
 * Initializes avatar customization services.
 */

import Phaser from 'phaser';
import { avatarAssetLoader } from '../../services/AvatarAssetLoader';
import { avatarCompositor } from '../../services/AvatarCompositor';

export default class Bootstrap extends Phaser.Scene {
  private preloadComplete = false;

  constructor() {
    super('bootstrap');
  }

  preload() {
    // Get base URL for assets (handles /hub/ prefix in production)
    const baseUrl = import.meta.env.BASE_URL || '/';

    // Load tilemap
    this.load.tilemapTiledJSON('tilemap', `${baseUrl}assets/map/map.json`);

    // Load tileset images
    this.load.spritesheet('tiles_wall', `${baseUrl}assets/map/FloorAndGround.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Load item sprites (for map object layers)
    this.load.spritesheet('chairs', `${baseUrl}assets/items/chair.png`, {
      frameWidth: 32,
      frameHeight: 64,
    });
    this.load.spritesheet('computers', `${baseUrl}assets/items/computer.png`, {
      frameWidth: 96,
      frameHeight: 64,
    });
    this.load.spritesheet('whiteboards', `${baseUrl}assets/items/whiteboard.png`, {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet('vendingmachines', `${baseUrl}assets/items/vendingmachine.png`, {
      frameWidth: 48,
      frameHeight: 72,
    });

    // Load arcade cabinet sprite (using computer.png as placeholder)
    this.load.spritesheet('arcade_cabinet', `${baseUrl}assets/items/computer.png`, {
      frameWidth: 96,
      frameHeight: 64,
    });

    // Load tileset sprites
    this.load.spritesheet('office', `${baseUrl}assets/items/Modern_Office_Black_Shadow.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('basement', `${baseUrl}assets/items/Basement.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('generic', `${baseUrl}assets/items/Generic.png`, {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Note: Legacy character sprites (adam, ash, lucy, nancy) removed
    // Avatar system now uses LPC layers for character composition

    this.load.on('complete', () => {
      this.preloadComplete = true;
      console.log('[Bootstrap] Assets loaded successfully');
    });
  }

  async create() {
    // Initialize avatar services (will be used by Game scene)
    avatarAssetLoader.initialize(this);
    avatarCompositor.initialize(this);

    // Preload essential avatar assets (blocking - wait for completion)
    try {
      console.log('[Bootstrap] Loading avatar assets...');
      await avatarAssetLoader.preloadEssentials();
      console.log('[Bootstrap] Avatar assets ready');
    } catch (e) {
      console.log('[Bootstrap] Avatar assets not available, will use legacy characters');
    }

    // Assets are preloaded, launch game scene
    // The Colyseus room should already be in the registry (set by PhaserGame component)
    if (this.preloadComplete) {
      this.scene.start('game');
    } else {
      // Wait for main assets to load
      this.load.once('complete', () => {
        this.scene.start('game');
      });
    }
  }
}
