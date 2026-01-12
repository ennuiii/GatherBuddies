/**
 * Event Center
 *
 * Phaser event emitter for communication between game components.
 * Used for decoupled communication (e.g., game -> UI).
 */

import Phaser from 'phaser';

export const phaserEvents = new Phaser.Events.EventEmitter();

export enum Event {
  PLAYER_JOINED = 'player-joined',
  PLAYER_UPDATED = 'player-updated',
  PLAYER_LEFT = 'player-left',
  MY_PLAYER_READY = 'my-player-ready',
  MY_PLAYER_NAME_CHANGE = 'my-player-name-change',
}
