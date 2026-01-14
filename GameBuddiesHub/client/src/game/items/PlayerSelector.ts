/**
 * PlayerSelector Class
 *
 * Invisible zone that detects items in front of the player.
 * Positioned based on player movement direction.
 */

import Phaser from 'phaser';
import Item from './Item';

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

export default class PlayerSelector extends Phaser.GameObjects.Zone {
  selectedItem?: Item;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    super(scene, x, y, width, height);
    scene.physics.add.existing(this);
  }

  update(playerX: number, playerY: number, cursors: NavKeys, isSitting: boolean) {
    if (isSitting) {
      return; // Don't update selection while sitting
    }

    // Update selector position based on player direction
    if (cursors.left?.isDown || cursors.A?.isDown) {
      this.setPosition(playerX - 32, playerY);
    } else if (cursors.right?.isDown || cursors.D?.isDown) {
      this.setPosition(playerX + 32, playerY);
    } else if (cursors.up?.isDown || cursors.W?.isDown) {
      this.setPosition(playerX, playerY - 32);
    } else if (cursors.down?.isDown || cursors.S?.isDown) {
      this.setPosition(playerX, playerY + 32);
    }

    // Clear dialog if selector no longer overlaps item
    if (this.selectedItem) {
      const overlap = this.scene.physics.overlap(this, this.selectedItem);
      if (!overlap) {
        this.selectedItem.clearDialogBox();
        this.selectedItem = undefined;
      }
    }
  }
}
