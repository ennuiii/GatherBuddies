/**
 * Character Animations
 *
 * Legacy file - animations for old character sprites (adam, ash, lucy, nancy) have been removed.
 * The avatar compositor now creates animations dynamically for composed LPC avatar textures.
 * See: AvatarCompositor.createAnimations()
 *
 * This file is kept for backward compatibility with any code that imports createCharacterAnims.
 */

import Phaser from 'phaser';

export const createCharacterAnims = (_anims: Phaser.Animations.AnimationManager) => {
  // No-op: Legacy character animations removed
  // Avatar animations are now created by AvatarCompositor.createAnimations()
};
