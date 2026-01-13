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

    // Note: ItemType enum doesn't have ARCADE_CABINET yet
    // We could extend the enum but for now we just don't set itemType
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
   * Clean up resources
   */
  destroy(fromScene?: boolean) {
    super.destroy(fromScene);
  }
}
