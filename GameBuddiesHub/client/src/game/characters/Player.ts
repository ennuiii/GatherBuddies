/**
 * Player Base Class
 *
 * Base class for both MyPlayer and OtherPlayer.
 * Handles name display, dialog bubbles, and physics setup.
 */

import Phaser from 'phaser';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  playerId: string;
  playerTexture: string;
  playerName: Phaser.GameObjects.Text;
  playerContainer: Phaser.GameObjects.Container;
  private playerDialogBubble: Phaser.GameObjects.Container;
  private timeoutID?: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    id: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, frame);

    this.playerId = id;
    this.playerTexture = texture;
    this.setDepth(this.y);

    this.anims.play(`${this.playerTexture}_idle_down`, true);

    // Create container for name and dialog bubble
    this.playerContainer = this.scene.add.container(this.x, this.y - 30).setDepth(5000);

    // Add dialog bubble container
    this.playerDialogBubble = this.scene.add.container(0, 0).setDepth(5000);
    this.playerContainer.add(this.playerDialogBubble);

    // Add player name text
    this.playerName = this.scene.add
      .text(0, 0, '')
      .setFontFamily('Arial')
      .setFontSize(12)
      .setColor('#000000')
      .setOrigin(0.5);
    this.playerContainer.add(this.playerName);

    // Enable physics for the container
    this.scene.physics.world.enable(this.playerContainer);
    const playContainerBody = this.playerContainer.body as Phaser.Physics.Arcade.Body;
    const collisionScale = [0.5, 0.2];
    playContainerBody
      .setSize(this.width * collisionScale[0], this.height * collisionScale[1])
      .setOffset(-8, this.height * (1 - collisionScale[1]) + 6);
  }

  updateDialogBubble(content: string) {
    this.clearDialogBubble();

    // Limit text to 70 characters
    const dialogBubbleText = content.length <= 70 ? content : content.substring(0, 70).concat('...');

    const innerText = this.scene.add
      .text(0, 0, dialogBubbleText, { wordWrap: { width: 165, useAdvancedWrap: true } })
      .setFontFamily('Arial')
      .setFontSize(12)
      .setColor('#000000')
      .setOrigin(0.5);

    const innerTextHeight = innerText.height;
    const innerTextWidth = innerText.width;

    innerText.setY(-innerTextHeight / 2 - this.playerName.height / 2);
    const dialogBoxWidth = innerTextWidth + 10;
    const dialogBoxHeight = innerTextHeight + 3;
    const dialogBoxX = innerText.x - innerTextWidth / 2 - 5;
    const dialogBoxY = innerText.y - innerTextHeight / 2 - 2;

    this.playerDialogBubble.add(
      this.scene.add
        .graphics()
        .fillStyle(0xffffff, 1)
        .fillRoundedRect(dialogBoxX, dialogBoxY, dialogBoxWidth, dialogBoxHeight, 3)
        .lineStyle(1, 0x000000, 1)
        .strokeRoundedRect(dialogBoxX, dialogBoxY, dialogBoxWidth, dialogBoxHeight, 3)
    );
    this.playerDialogBubble.add(innerText);

    // Clear after 6 seconds
    this.timeoutID = window.setTimeout(() => {
      this.clearDialogBubble();
    }, 6000);
  }

  private clearDialogBubble() {
    clearTimeout(this.timeoutID);
    this.playerDialogBubble.removeAll(true);
  }
}
