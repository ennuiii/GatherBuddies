import Phaser from 'phaser'

export default class Bootstrap extends Phaser.Scene {
  private preloadComplete = false

  constructor() {
    super('bootstrap')
  }

  preload() {
    // Load tilemap
    this.load.tilemapTiledJSON('tilemap', 'assets/map/map.json')

    // Load tileset images
    this.load.spritesheet('tiles_wall', 'assets/map/FloorAndGround.png', {
      frameWidth: 32,
      frameHeight: 32,
    })

    // Load item sprites (for map object layers)
    this.load.spritesheet('chairs', 'assets/items/chair.png', {
      frameWidth: 32,
      frameHeight: 64,
    })
    this.load.spritesheet('computers', 'assets/items/computer.png', {
      frameWidth: 96,
      frameHeight: 64,
    })
    this.load.spritesheet('whiteboards', 'assets/items/whiteboard.png', {
      frameWidth: 64,
      frameHeight: 64,
    })
    this.load.spritesheet('vendingmachines', 'assets/items/vendingmachine.png', {
      frameWidth: 48,
      frameHeight: 72,
    })

    // Load tileset sprites
    this.load.spritesheet('office', 'assets/items/Modern_Office_Black_Shadow.png', {
      frameWidth: 32,
      frameHeight: 32,
    })
    this.load.spritesheet('basement', 'assets/items/Basement.png', {
      frameWidth: 32,
      frameHeight: 32,
    })
    this.load.spritesheet('generic', 'assets/items/Generic.png', {
      frameWidth: 32,
      frameHeight: 32,
    })

    // Load character sprites
    this.load.spritesheet('adam', 'assets/character/adam.png', {
      frameWidth: 32,
      frameHeight: 48,
    })
    this.load.spritesheet('ash', 'assets/character/ash.png', {
      frameWidth: 32,
      frameHeight: 48,
    })
    this.load.spritesheet('lucy', 'assets/character/lucy.png', {
      frameWidth: 32,
      frameHeight: 48,
    })
    this.load.spritesheet('nancy', 'assets/character/nancy.png', {
      frameWidth: 32,
      frameHeight: 48,
    })

    this.load.on('complete', () => {
      this.preloadComplete = true
    })
  }

  create() {
    // Wait for preload to complete, then ready to launch game
    if (this.preloadComplete) {
      console.log('Bootstrap: Assets loaded successfully')
    }
  }

  launchGame(sessionId: string) {
    if (!this.preloadComplete) {
      console.warn('Bootstrap: Assets not yet loaded')
      return false
    }

    this.scene.launch('game', { sessionId })
    return true
  }
}
