/**
 * Character Animations
 *
 * Creates sprite animations for all character types.
 * Must be called after assets are loaded (in Game scene).
 */

import Phaser from 'phaser';

export const createCharacterAnims = (anims: Phaser.Animations.AnimationManager) => {
  const animsFrameRate = 15;

  // Create animations for all characters
  const characters = ['adam', 'ash', 'lucy', 'nancy'];

  characters.forEach((character) => {
    // Idle animations
    anims.create({
      key: `${character}_idle_right`,
      frames: anims.generateFrameNames(character, { start: 0, end: 5 }),
      repeat: -1,
      frameRate: animsFrameRate * 0.6,
    });

    anims.create({
      key: `${character}_idle_up`,
      frames: anims.generateFrameNames(character, { start: 6, end: 11 }),
      repeat: -1,
      frameRate: animsFrameRate * 0.6,
    });

    anims.create({
      key: `${character}_idle_left`,
      frames: anims.generateFrameNames(character, { start: 12, end: 17 }),
      repeat: -1,
      frameRate: animsFrameRate * 0.6,
    });

    anims.create({
      key: `${character}_idle_down`,
      frames: anims.generateFrameNames(character, { start: 18, end: 23 }),
      repeat: -1,
      frameRate: animsFrameRate * 0.6,
    });

    // Run animations
    anims.create({
      key: `${character}_run_right`,
      frames: anims.generateFrameNames(character, { start: 24, end: 29 }),
      repeat: -1,
      frameRate: animsFrameRate,
    });

    anims.create({
      key: `${character}_run_up`,
      frames: anims.generateFrameNames(character, { start: 30, end: 35 }),
      repeat: -1,
      frameRate: animsFrameRate,
    });

    anims.create({
      key: `${character}_run_left`,
      frames: anims.generateFrameNames(character, { start: 36, end: 41 }),
      repeat: -1,
      frameRate: animsFrameRate,
    });

    anims.create({
      key: `${character}_run_down`,
      frames: anims.generateFrameNames(character, { start: 42, end: 47 }),
      repeat: -1,
      frameRate: animsFrameRate,
    });

    // Sit animations (single frame)
    anims.create({
      key: `${character}_sit_down`,
      frames: anims.generateFrameNames(character, { start: 48, end: 48 }),
      repeat: 0,
      frameRate: animsFrameRate,
    });

    anims.create({
      key: `${character}_sit_left`,
      frames: anims.generateFrameNames(character, { start: 49, end: 49 }),
      repeat: 0,
      frameRate: animsFrameRate,
    });

    anims.create({
      key: `${character}_sit_right`,
      frames: anims.generateFrameNames(character, { start: 50, end: 50 }),
      repeat: 0,
      frameRate: animsFrameRate,
    });

    anims.create({
      key: `${character}_sit_up`,
      frames: anims.generateFrameNames(character, { start: 51, end: 51 }),
      repeat: 0,
      frameRate: animsFrameRate,
    });
  });
};
