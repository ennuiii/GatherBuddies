/**
 * OtherPlayer Class
 *
 * Remote player synced from Colyseus state.
 * Interpolates position towards target for smooth movement.
 */

import Phaser from 'phaser';
import Player, { PLAYER_SCALE } from './Player';
import { phaserEvents } from '../events/EventCenter';

export default class OtherPlayer extends Player {
  private targetPosition: [number, number];
  private lastUpdateTimestamp?: number;
  private playContainerBody: Phaser.Physics.Arcade.Body;

  // Proximity state
  connected: boolean = false;
  private connectionBufferTime: number = 0;
  readyToConnect: boolean = false;
  private disconnectBufferTime: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    id: string,
    name: string,
    frame?: string | number
  ) {
    super(scene, x, y, texture, id, frame);
    this.targetPosition = [x, y];
    this.playerName.setText(name);
    this.playContainerBody = this.playerContainer.body as Phaser.Physics.Arcade.Body;
  }

  updateOtherPlayer(field: string, value: number | string) {
    switch (field) {
      case 'name':
        if (typeof value === 'string') {
          this.playerName.setText(value);
        }
        break;
      case 'x':
        if (typeof value === 'number') {
          this.targetPosition[0] = value;
        }
        break;
      case 'y':
        if (typeof value === 'number') {
          this.targetPosition[1] = value;
        }
        break;
      case 'anim':
        if (typeof value === 'string') {
          this.anims.play(value, true);
        }
        break;
    }
  }

  // Track current character config for change detection
  private currentCharacter: string = '';

  // Update from full player state
  updateFromState(player: { name: string; x: number; y: number; anim: string; character?: string }) {
    if (player.name) this.playerName.setText(player.name);
    this.targetPosition[0] = player.x;
    this.targetPosition[1] = player.y;
    if (player.anim) this.anims.play(player.anim, true);

    // Check if character changed (for live avatar updates)
    if (player.character && player.character !== this.currentCharacter) {
      this.currentCharacter = player.character;
      // Emit event for Game scene to handle async composition
      phaserEvents.emit('otherPlayer:characterChanged', {
        playerId: this.playerId,
        character: player.character,
      });
    }
  }

  /**
   * Update the player's texture (for avatar composition).
   * Swaps to new texture and updates current animation.
   */
  updateTexture(textureKey: string) {
    // Get current animation direction
    const currentAnim = this.anims.currentAnim?.key;
    let direction = 'down';

    if (currentAnim) {
      // Parse direction from animation key (e.g., "avatar_123_abc_idle_down" -> "down")
      // Format: {textureKey}_{action}_{direction} where textureKey can contain underscores
      const parts = currentAnim.split('_');
      if (parts.length >= 3) {
        direction = parts[parts.length - 1];
      }
    }

    // Update texture reference
    this.playerTexture = textureKey;
    this.setTexture(textureKey);

    // Play idle animation with new texture
    const newAnim = `${textureKey}_idle_${direction}`;
    if (this.scene.anims.exists(newAnim)) {
      this.anims.play(newAnim, true);
    }
  }

  destroy(fromScene?: boolean) {
    this.playerContainer.destroy();
    super.destroy(fromScene);
  }

  // Proximity detection methods
  updateProximityBuffer(dt: number) {
    this.connectionBufferTime += dt;
    if (this.connectionBufferTime >= 750) {
      this.readyToConnect = true;
    }
  }

  resetProximityBuffer() {
    this.connected = false;
    this.connectionBufferTime = 0;
    this.readyToConnect = false;
  }

  updateDisconnectBuffer(dt: number) {
    this.disconnectBufferTime += dt;
  }

  resetDisconnectBuffer() {
    this.disconnectBufferTime = 0;
  }

  shouldDisconnect(): boolean {
    return this.connected && this.disconnectBufferTime >= 750;
  }

  disconnect() {
    this.connected = false;
    this.readyToConnect = false;
    this.connectionBufferTime = 0;
    this.disconnectBufferTime = 0;
  }

  /**
   * Check if we should trigger a conversation with this player.
   * No longer uses session ID comparison - server handles deduplication.
   * Both players can now send START_CONVERSATION independently.
   */
  checkProximityConnection(): boolean {
    console.log(`[OtherPlayer] checkProximityConnection:`, {
      playerId: this.playerId.slice(0, 8),
      connected: this.connected,
      readyToConnect: this.readyToConnect,
      result: !this.connected && this.readyToConnect
    });

    if (!this.connected && this.readyToConnect) {
      this.connected = true;
      phaserEvents.emit('proximity:connect', { playerId: this.playerId });
      return true;
    }
    return this.connected;
  }

  preUpdate(t: number, dt: number) {
    super.preUpdate(t, dt);

    // If game was paused for more than 750ms, snap to target
    if (this.lastUpdateTimestamp && t - this.lastUpdateTimestamp > 750) {
      this.lastUpdateTimestamp = t;
      this.x = this.targetPosition[0];
      this.y = this.targetPosition[1];
      this.playerContainer.x = this.targetPosition[0];
      this.playerContainer.y = this.targetPosition[1] - 30;
      return;
    }

    this.lastUpdateTimestamp = t;
    this.setDepth(this.y);

    const speed = 200;
    const delta = (speed / 1000) * dt;
    let dx = this.targetPosition[0] - this.x;
    let dy = this.targetPosition[1] - this.y;

    // Snap if close enough
    if (Math.abs(dx) < delta) {
      this.x = this.targetPosition[0];
      this.playerContainer.x = this.targetPosition[0];
      dx = 0;
    }
    if (Math.abs(dy) < delta) {
      this.y = this.targetPosition[1];
      this.playerContainer.y = this.targetPosition[1] - 30;
      dy = 0;
    }

    // Move towards target
    let vx = 0;
    let vy = 0;
    if (dx > 0) vx += speed;
    else if (dx < 0) vx -= speed;
    if (dy > 0) vy += speed;
    else if (dy < 0) vy -= speed;

    this.setVelocity(vx, vy);
    if (vx !== 0 || vy !== 0) {
      this.body!.velocity.setLength(speed);
    }

    this.playContainerBody.setVelocity(vx, vy);
    if (vx !== 0 || vy !== 0) {
      this.playContainerBody.velocity.setLength(speed);
    }
  }
}

// Register custom game object factory method
declare global {
  namespace Phaser.GameObjects {
    interface GameObjectFactory {
      otherPlayer(
        x: number,
        y: number,
        texture: string,
        id: string,
        name: string,
        frame?: string | number
      ): OtherPlayer;
    }
  }
}

Phaser.GameObjects.GameObjectFactory.register(
  'otherPlayer',
  function (
    this: Phaser.GameObjects.GameObjectFactory,
    x: number,
    y: number,
    texture: string,
    id: string,
    name: string,
    frame?: string | number
  ) {
    const sprite = new OtherPlayer(this.scene, x, y, texture, id, name, frame);

    this.displayList.add(sprite);
    this.updateList.add(sprite);

    this.scene.physics.world.enableBody(sprite, Phaser.Physics.Arcade.DYNAMIC_BODY);

    // Use scaled dimensions for physics body (sprite is already scaled in Player constructor)
    const collisionScale = [6, 4];
    const scaledWidth = sprite.width * PLAYER_SCALE;
    const scaledHeight = sprite.height * PLAYER_SCALE;
    sprite.body!
      .setSize(scaledWidth * collisionScale[0], scaledHeight * collisionScale[1])
      .setOffset(
        scaledWidth * (1 - collisionScale[0]) * 0.5,
        scaledHeight * (1 - collisionScale[1]) * 0.5 + 17 * PLAYER_SCALE
      );

    return sprite;
  }
);
