/**
 * Item Base Class
 *
 * Base class for interactive objects in the game world.
 * Provides dialog box functionality for interaction prompts.
 */

import Phaser from 'phaser';

export enum ItemType {
  CHAIR,
  COMPUTER,
  WHITEBOARD,
}

export default class Item extends Phaser.Physics.Arcade.Sprite {
  private dialogBox!: Phaser.GameObjects.Container;
  private statusBox!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  itemType?: ItemType;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame);

    // Create dialog box UI
    this.dialogBox = this.scene.add.container(x, y - 50).setDepth(10000);

    this.statusBox = this.scene.add.graphics();
    this.statusText = this.scene.add
      .text(0, 0, '', { fontSize: '12px', color: '#000' })
      .setOrigin(0.5);

    this.dialogBox.add(this.statusBox);
    this.dialogBox.add(this.statusText);
    this.dialogBox.setVisible(false);
  }

  setDialogBox(text: string) {
    this.statusText.setText(text);

    const bounds = this.statusText.getBounds();
    const padding = 8;

    this.statusBox.clear();
    this.statusBox.fillStyle(0xffffff, 1);
    this.statusBox.fillRoundedRect(
      bounds.x - this.dialogBox.x - padding,
      bounds.y - this.dialogBox.y - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2,
      4
    );
    this.statusBox.lineStyle(1.5, 0x000000, 1);
    this.statusBox.strokeRoundedRect(
      bounds.x - this.dialogBox.x - padding,
      bounds.y - this.dialogBox.y - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2,
      4
    );

    this.dialogBox.setPosition(this.x, this.y - 50);
    this.dialogBox.setVisible(true);
  }

  clearDialogBox() {
    this.dialogBox.setVisible(false);
  }

  // Override in subclasses
  onOverlapDialog() {
    // Default implementation
  }

  destroy(fromScene?: boolean) {
    this.dialogBox.destroy();
    super.destroy(fromScene);
  }
}
