import Phaser from 'phaser'
import { createCharacterAnims } from '../anims/CharacterAnims'
import Network from '../services/Network'
import MyPlayer from '../characters/MyPlayer'
import OtherPlayer from '../characters/OtherPlayer'
import '../characters/MyPlayer'
import '../characters/OtherPlayer'

interface NavKeys {
  up: Phaser.Input.Keyboard.Key
  down: Phaser.Input.Keyboard.Key
  left: Phaser.Input.Keyboard.Key
  right: Phaser.Input.Keyboard.Key
  W: Phaser.Input.Keyboard.Key
  S: Phaser.Input.Keyboard.Key
  A: Phaser.Input.Keyboard.Key
  D: Phaser.Input.Keyboard.Key
}

interface IPlayer {
  name: string
  x: number
  y: number
  anim: string
}

export default class Game extends Phaser.Scene {
  network!: Network
  private cursors!: NavKeys
  private map!: Phaser.Tilemaps.Tilemap
  myPlayer!: MyPlayer
  private otherPlayers!: Phaser.Physics.Arcade.Group
  private otherPlayerMap = new Map<string, OtherPlayer>()

  constructor() {
    super('game')
  }

  registerKeys() {
    this.cursors = {
      ...this.input.keyboard!.createCursorKeys(),
      ...(this.input.keyboard!.addKeys('W,S,A,D') as {
        W: Phaser.Input.Keyboard.Key
        S: Phaser.Input.Keyboard.Key
        A: Phaser.Input.Keyboard.Key
        D: Phaser.Input.Keyboard.Key
      }),
    }
    this.input.keyboard!.disableGlobalCapture()
  }

  create(data: { network: Network }) {
    if (!data.network) {
      throw new Error('Network instance missing')
    }
    this.network = data.network

    // Create character animations
    createCharacterAnims(this.anims)

    // Register keyboard inputs
    this.registerKeys()

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

    // Create my player (spawn at center of map)
    this.myPlayer = this.add.myPlayer(705, 500, 'adam', this.network.mySessionId)
    this.myPlayer.setPlayerName('Player')

    // Create other players group
    this.otherPlayers = this.physics.add.group({ classType: OtherPlayer })

    // Set camera
    this.cameras.main.zoom = 1.5
    this.cameras.main.startFollow(this.myPlayer, true)

    // Add collisions
    if (groundLayer) {
      this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], groundLayer)
    }

    // Register network event listeners
    this.network.onPlayerJoined(this.handlePlayerJoined, this)
    this.network.onPlayerLeft(this.handlePlayerLeft, this)
    this.network.onPlayerUpdated(this.handlePlayerUpdated, this)

    console.log('Game scene created - player spawned')
  }

  private handlePlayerJoined(newPlayer: IPlayer, id: string) {
    console.log('Player joined:', id, newPlayer.name)
    const otherPlayer = this.add.otherPlayer(
      newPlayer.x,
      newPlayer.y,
      'adam',
      id,
      newPlayer.name || 'Player'
    )
    this.otherPlayers.add(otherPlayer)
    this.otherPlayerMap.set(id, otherPlayer)
  }

  private handlePlayerLeft(id: string) {
    console.log('Player left:', id)
    if (this.otherPlayerMap.has(id)) {
      const otherPlayer = this.otherPlayerMap.get(id)
      if (otherPlayer) {
        this.otherPlayers.remove(otherPlayer, true, true)
        this.otherPlayerMap.delete(id)
      }
    }
  }

  private handlePlayerUpdated(id: string, player: IPlayer) {
    const otherPlayer = this.otherPlayerMap.get(id)
    if (otherPlayer) {
      otherPlayer.updateFromState(player)
    } else if (player.name) {
      // If we don't have this player yet, add them
      this.handlePlayerJoined(player, id)
    }
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
      group.get(actualX, actualY, key, object.gid! - tileset.firstgid).setDepth(actualY)
    })

    return group
  }

  update(_t: number, _dt: number) {
    if (this.myPlayer && this.network) {
      this.myPlayer.update(this.cursors, this.network)
    }
  }
}
