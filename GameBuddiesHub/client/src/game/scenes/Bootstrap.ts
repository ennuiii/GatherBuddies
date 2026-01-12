/**
 * Bootstrap Scene
 *
 * Preloads all game assets (tilemaps, sprites, characters).
 * Launched first, then transitions to Game scene.
 */

import Phaser from 'phaser';

export default class Bootstrap extends Phaser.Scene {
  private preloadComplete = false;

  constructor() {
    super('bootstrap');
  }

  preload() {
    // Load tilemap
    this.load.tilemapTiledJSON('tilemap', 'assets/map/map.json');

    // Load tileset images
    this.load.spritesheet('tiles_wall', 'assets/map/FloorAndGround.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Load item sprites (for map object layers)
    this.load.spritesheet('chairs', 'assets/items/chair.png', {
      frameWidth: 32,
      frameHeight: 64,
    });
    this.load.spritesheet('computers', 'assets/items/computer.png', {
      frameWidth: 96,
      frameHeight: 64,
    });
    this.load.spritesheet('whiteboards', 'assets/items/whiteboard.png', {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet('vendingmachines', 'assets/items/vendingmachine.png', {
      frameWidth: 48,
      frameHeight: 72,
    });

    // Load tileset sprites
    this.load.spritesheet('office', 'assets/items/Modern_Office_Black_Shadow.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('basement', 'assets/items/Basement.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('generic', 'assets/items/Generic.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Load character sprites
    this.load.spritesheet('adam', 'assets/character/adam.png', {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.spritesheet('ash', 'assets/character/ash.png', {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.spritesheet('lucy', 'assets/character/lucy.png', {
      frameWidth: 32,
      frameHeight: 48,
    });
    this.load.spritesheet('nancy', 'assets/character/nancy.png', {
      frameWidth: 32,
      frameHeight: 48,
    });

    this.load.on('complete', () => {
      this.preloadComplete = true;
      console.log('[Bootstrap] Assets loaded successfully');
    });
  }

  create() {
    // Assets are preloaded, launch game scene
    // The Colyseus room should already be in the registry (set by PhaserGame component)
    if (this.preloadComplete) {
      this.scene.start('game');
    } else {
      // Wait for assets to load
      this.load.once('complete', () => {
        this.scene.start('game');
      });
    }
  }
}
