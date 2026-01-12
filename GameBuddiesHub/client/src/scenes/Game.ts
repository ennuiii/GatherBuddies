import Phaser from 'phaser'
import { createCharacterAnims } from '../anims/CharacterAnims'

export default class Game extends Phaser.Scene {
  private map!: Phaser.Tilemaps.Tilemap

  constructor() {
    super('game')
  }

  create() {
    // Create character animations
    createCharacterAnims(this.anims)

    // Create tilemap
    this.map = this.make.tilemap({ key: 'tilemap' })
    const FloorAndGround = this.map.addTilesetImage('FloorAndGround', 'tiles_wall')

    // Create ground layer
    const groundLayer = this.map.createLayer('Ground', FloorAndGround!)
    if (groundLayer) {
      groundLayer.setCollisionByProperty({ collides: true })
    }

    // Add wall objects from tiled map
    this.addGroupFromTiled('Wall', 'tiles_wall', 'FloorAndGround', false)

    // Add office objects
    this.addGroupFromTiled('Objects', 'office', 'Modern_Office_Black_Shadow', false)
    this.addGroupFromTiled('ObjectsOnCollide', 'office', 'Modern_Office_Black_Shadow', true)

    // Add generic objects
    this.addGroupFromTiled('GenericObjects', 'generic', 'Generic', false)
    this.addGroupFromTiled('GenericObjectsOnCollide', 'generic', 'Generic', true)

    // Add basement objects
    this.addGroupFromTiled('Basement', 'basement', 'Basement', true)

    // Set camera zoom
    this.cameras.main.zoom = 1.5

    console.log('Game scene created - tilemap loaded')
  }

  private addGroupFromTiled(
    objectLayerName: string,
    key: string,
    tilesetName: string,
    _collidable: boolean
  ) {
    const group = this.physics.add.staticGroup()
    const objectLayer = this.map.getObjectLayer(objectLayerName)

    if (!objectLayer) {
      console.warn(`Object layer "${objectLayerName}" not found`)
      return group
    }

    const tileset = this.map.getTileset(tilesetName)
    if (!tileset) {
      console.warn(`Tileset "${tilesetName}" not found`)
      return group
    }

    objectLayer.objects.forEach((object) => {
      const actualX = object.x! + object.width! * 0.5
      const actualY = object.y! - object.height! * 0.5
      group
        .get(actualX, actualY, key, object.gid! - tileset.firstgid)
        .setDepth(actualY)
    })

    return group
  }

  update(_t: number, _dt: number) {
    // Game update logic will be added in Task 3
  }
}
