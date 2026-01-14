/**
 * Chair Class
 *
 * Interactive chair that players can sit on.
 * Has a direction property to determine sitting animation.
 */

import Item, { ItemType } from './Item';

export default class Chair extends Item {
  itemDirection?: string; // 'up', 'down', 'left', 'right'

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame?: string | number) {
    super(scene, x, y, texture, frame);
    this.itemType = ItemType.CHAIR;
  }

  onOverlapDialog() {
    this.setDialogBox('Press E to sit');
  }
}
