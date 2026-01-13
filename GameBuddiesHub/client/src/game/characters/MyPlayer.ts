/**
 * MyPlayer Class
 *
 * The local player controlled by keyboard input.
 * Sends movement updates via callback (connected to Colyseus).
 */

import Phaser from 'phaser';
import Player, { sittingShiftData } from './Player';
import { Chair } from '../items';
import type { PlayerSelector } from '../items';

interface NavKeys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  W: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

export interface MovementData {
  x: number;
  y: number;
  anim: string;
}

export enum PlayerBehavior {
  IDLE,
  SITTING,
}

export default class MyPlayer extends Player {
  private playContainerBody: Phaser.Physics.Arcade.Body;
  playerBehavior: PlayerBehavior = PlayerBehavior.IDLE;
  private chairOnSit?: Chair;

  // Callback for sending movement updates (connected in Game scene)
  onMovementUpdate?: (data: MovementData) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    id: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, id, frame);
    this.playContainerBody = this.playerContainer.body as Phaser.Physics.Arcade.Body;
  }

  setPlayerName(name: string) {
    this.playerName.setText(name);
  }

  update(
    cursors: NavKeys,
    keyE?: Phaser.Input.Keyboard.Key,
    playerSelector?: PlayerSelector
  ) {
    if (!cursors) return;

    const selectedItem = playerSelector?.selectedItem;

    switch (this.playerBehavior) {
      case PlayerBehavior.SITTING:
        // Press E to stand up
        if (keyE && Phaser.Input.Keyboard.JustDown(keyE)) {
          const currentAnim = this.anims.currentAnim?.key;
          if (currentAnim) {
            const parts = currentAnim.split('_');
            parts[1] = 'idle';
            this.play(parts.join('_'), true);
          }
          this.playerBehavior = PlayerBehavior.IDLE;
          this.chairOnSit?.clearDialogBox();
          this.chairOnSit = undefined;

          if (playerSelector) {
            playerSelector.setPosition(this.x, this.y);
          }

          this.onMovementUpdate?.({
            x: this.x,
            y: this.y,
            anim: this.anims.currentAnim?.key || '',
          });
        }
        return; // Don't process movement while sitting

      case PlayerBehavior.IDLE:
      default:
        // Check for E key to sit on chair (only handle Chair items here)
        if (keyE && selectedItem instanceof Chair && Phaser.Input.Keyboard.JustDown(keyE)) {
          const chair = selectedItem;
          if (chair.itemDirection) {
            // Stop movement
            this.setVelocity(0, 0);
            this.playContainerBody.setVelocity(0, 0);

            // Move player to chair position with offset
            const shift = sittingShiftData[chair.itemDirection];
            if (shift) {
              this.setPosition(chair.x + shift[0], chair.y + shift[1]);
              this.setDepth(chair.depth + shift[2]);

              this.playerContainer.setPosition(
                chair.x + shift[0],
                chair.y + shift[1] - 30
              );
            }

            // Play sitting animation
            this.play(`${this.playerTexture}_sit_${chair.itemDirection}`, true);

            // Update state
            chair.clearDialogBox();
            chair.setDialogBox('Press E to leave');
            this.chairOnSit = chair;
            this.playerBehavior = PlayerBehavior.SITTING;

            if (playerSelector) {
              playerSelector.selectedItem = undefined;
            }

            this.onMovementUpdate?.({
              x: this.x,
              y: this.y,
              anim: this.anims.currentAnim?.key || '',
            });
            return;
          }
        }
        break;
    }

    const speed = 200;
    let vx = 0;
    let vy = 0;

    // Check for movement input
    if (cursors.left?.isDown || cursors.A?.isDown) vx -= speed;
    if (cursors.right?.isDown || cursors.D?.isDown) vx += speed;
    if (cursors.up?.isDown || cursors.W?.isDown) {
      vy -= speed;
      this.setDepth(this.y);
    }
    if (cursors.down?.isDown || cursors.S?.isDown) {
      vy += speed;
      this.setDepth(this.y);
    }

    // Update velocity
    this.setVelocity(vx, vy);
    if (vx !== 0 || vy !== 0) {
      this.body!.velocity.setLength(speed);
    }

    // Also update player container velocity
    this.playContainerBody.setVelocity(vx, vy);
    if (vx !== 0 || vy !== 0) {
      this.playContainerBody.velocity.setLength(speed);
    }

    // Update animation and send to server
    if (vx !== 0 || vy !== 0) {
      this.onMovementUpdate?.({
        x: this.x,
        y: this.y,
        anim: this.anims.currentAnim?.key || '',
      });
    }

    if (vx > 0) {
      this.play(`${this.playerTexture}_run_right`, true);
    } else if (vx < 0) {
      this.play(`${this.playerTexture}_run_left`, true);
    } else if (vy > 0) {
      this.play(`${this.playerTexture}_run_down`, true);
    } else if (vy < 0) {
      this.play(`${this.playerTexture}_run_up`, true);
    } else {
      // Idle animation
      const currentAnim = this.anims.currentAnim?.key;
      if (currentAnim) {
        const parts = currentAnim.split('_');
        parts[1] = 'idle';
        const newAnim = parts.join('_');
        if (currentAnim !== newAnim) {
          this.play(newAnim, true);
          this.onMovementUpdate?.({
            x: this.x,
            y: this.y,
            anim: newAnim,
          });
        }
      }
    }

    // Update player selector position
    if (playerSelector) {
      playerSelector.update(this.x, this.y, cursors, this.playerBehavior === PlayerBehavior.SITTING);
    }
  }
}

// Register custom game object factory method
declare global {
  namespace Phaser.GameObjects {
    interface GameObjectFactory {
      myPlayer(x: number, y: number, texture: string, id: string, frame?: string | number): MyPlayer;
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
    const sprite = new MyPlayer(this.scene, x, y, texture, id, frame);

    this.displayList.add(sprite);
    this.updateList.add(sprite);

    this.scene.physics.world.enableBody(sprite, Phaser.Physics.Arcade.DYNAMIC_BODY);

    const collisionScale = [0.5, 0.2];
    sprite.body!
      .setSize(sprite.width * collisionScale[0], sprite.height * collisionScale[1])
      .setOffset(
        sprite.width * (1 - collisionScale[0]) * 0.5,
        sprite.height * (1 - collisionScale[1])
      );

    return sprite;
  }
);
