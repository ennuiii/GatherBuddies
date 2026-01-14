import Phaser from 'phaser'
import Player from './Player'
import Network from '../services/Network'
import { phaserEvents, Event } from '../events/EventCenter'

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

export default class MyPlayer extends Player {
  private playContainerBody: Phaser.Physics.Arcade.Body

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    id: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, id, frame)
    this.playContainerBody = this.playerContainer.body as Phaser.Physics.Arcade.Body
  }

  setPlayerName(name: string) {
    this.playerName.setText(name)
    phaserEvents.emit(Event.MY_PLAYER_NAME_CHANGE, name)
  }

  update(cursors: NavKeys, network: Network) {
    if (!cursors) return

    const speed = 200
    let vx = 0
    let vy = 0

    // Check for movement input
    if (cursors.left?.isDown || cursors.A?.isDown) vx -= speed
    if (cursors.right?.isDown || cursors.D?.isDown) vx += speed
    if (cursors.up?.isDown || cursors.W?.isDown) {
      vy -= speed
      this.setDepth(this.y)
    }
    if (cursors.down?.isDown || cursors.S?.isDown) {
      vy += speed
      this.setDepth(this.y)
    }

    // Update velocity
    this.setVelocity(vx, vy)
    if (vx !== 0 || vy !== 0) {
      this.body!.velocity.setLength(speed)
    }

    // Also update player container velocity
    this.playContainerBody.setVelocity(vx, vy)
    if (vx !== 0 || vy !== 0) {
      this.playContainerBody.velocity.setLength(speed)
    }

    // Update animation and send to server
    if (vx !== 0 || vy !== 0) {
      network.updatePlayer(this.x, this.y, this.anims.currentAnim?.key || '')
    }

    if (vx > 0) {
      this.play(`${this.playerTexture}_run_right`, true)
    } else if (vx < 0) {
      this.play(`${this.playerTexture}_run_left`, true)
    } else if (vy > 0) {
      this.play(`${this.playerTexture}_run_down`, true)
    } else if (vy < 0) {
      this.play(`${this.playerTexture}_run_up`, true)
    } else {
      // Idle animation
      const currentAnim = this.anims.currentAnim?.key
      if (currentAnim) {
        const parts = currentAnim.split('_')
        parts[1] = 'idle'
        const newAnim = parts.join('_')
        if (currentAnim !== newAnim) {
          this.play(newAnim, true)
          network.updatePlayer(this.x, this.y, newAnim)
        }
      }
    }
  }
}

// Register custom game object factory method
declare global {
  namespace Phaser.GameObjects {
    interface GameObjectFactory {
      myPlayer(x: number, y: number, texture: string, id: string, frame?: string | number): MyPlayer
    }
  }
}

Phaser.GameObjects.GameObjectFactory.register(
  'myPlayer',
  function (
    this: Phaser.GameObjects.GameObjectFactory,
    x: number,
    y: number,
    texture: string,
    id: string,
    frame?: string | number
  ) {
    const sprite = new MyPlayer(this.scene, x, y, texture, id, frame)

    this.displayList.add(sprite)
    this.updateList.add(sprite)

    this.scene.physics.world.enableBody(sprite, Phaser.Physics.Arcade.DYNAMIC_BODY)

    const collisionScale = [0.5, 0.2]
    sprite.body!
      .setSize(sprite.width * collisionScale[0], sprite.height * collisionScale[1])
      .setOffset(
        sprite.width * (1 - collisionScale[0]) * 0.5,
        sprite.height * (1 - collisionScale[1])
      )

    return sprite
  }
)
