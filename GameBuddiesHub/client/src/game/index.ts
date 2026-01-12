/**
 * Game Module Exports
 *
 * Main entry point for Phaser game code.
 */

// Scenes
export { Bootstrap, Game } from './scenes';

// Characters
export { Player, MyPlayer, OtherPlayer } from './characters';
export type { MovementData } from './characters';

// Animations
export { createCharacterAnims } from './anims';

// Events
export { phaserEvents, Event } from './events';
