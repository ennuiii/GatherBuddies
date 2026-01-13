/**
 * ArcadeCabinet Class
 *
 * Interactive arcade cabinet that players can interact with via E key.
 * Each cabinet represents a different game that can be launched.
 */

import Item, { ItemType } from './Item';

// Add ARCADE_CABINET to ItemType enum extension
export const ARCADE_CABINET_TYPE = 'ARCADE_CABINET';

export interface ArcadeCabinetConfig {
  gameType: string;      // e.g., 'ddf', 'schoolquiz'
  gameName: string;      // Display name e.g., 'DDF', 'School Quiz'
  gameIcon?: string;     // Optional icon texture key
}

export default class ArcadeCabinet extends Item {
  gameType: string;
  gameName: string;
  gameIcon?: string;
  private nameLabel!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string | number,
    config?: ArcadeCabinetConfig
  ) {
    super(scene, x, y, texture, frame);

    // Set cabinet-specific properties
    this.gameType = config?.gameType || 'unknown';
    this.gameName = config?.gameName || 'Arcade Game';
    this.gameIcon = config?.gameIcon;

    // Create permanent name label above the cabinet
    this.nameLabel = scene.add.text(x, y - 50, this.gameName, {
      fontSize: '12px',
      fontFamily: 'Arial',
      color: '#ffffff',
      backgroundColor: '#000000bb',
      padding: { x: 6, y: 3 },
      align: 'center',
    });
    this.nameLabel.setOrigin(0.5, 1);
    this.nameLabel.setDepth(y + 1000); // Always above the cabinet
  }

  /**
   * Shows the interaction prompt when player is near
   */
  onOverlapDialog() {
    this.setDialogBox(`Press E to play ${this.gameName}`);
  }

  /**
   * Alias for onOverlapDialog - shows the prompt
   */
  showInteractPrompt() {
    this.onOverlapDialog();
  }

  /**
   * Hides the interaction prompt
   */
  hideInteractPrompt() {
    this.clearDialogBox();
  }

  /**
   * Override setPosition to also move the label
   */
  setPosition(x?: number, y?: number, z?: number, w?: number): this {
    super.setPosition(x, y, z, w);
    if (this.nameLabel && x !== undefined && y !== undefined) {
      this.nameLabel.setPosition(x, y - 50);
      this.nameLabel.setDepth(y + 1000);
    }
    return this;
  }

  /**
   * Clean up resources
   */
  destroy(fromScene?: boolean) {
    if (this.nameLabel) {
      this.nameLabel.destroy();
    }
    super.destroy(fromScene);
  }
}
