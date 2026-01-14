/**
 * Template Game Types
 * TODO: Customize these types for your specific game
 */

import type { BasePlayer, BaseSettings, BaseLobby, Team } from './base';

// ============================================================================
// TEMPLATE PLAYER
// ============================================================================

/**
 * TODO: Add your game-specific player properties here
 */
export interface TemplatePlayer extends BasePlayer {
  // Example properties - customize for your game:
  // score: number;
  // isReady: boolean;
  // team?: 'red' | 'blue';
}

// ============================================================================
// TEMPLATE SETTINGS
// ============================================================================

/**
 * TODO: Add your game-specific settings here
 */
export interface TemplateSettings extends BaseSettings {
  gameMode?: 'classic' | 'teams';
  gameSpecific: {
    // Example settings - customize for your game:
    // roundTime: number;
    // maxRounds: number;
    // difficulty: 'easy' | 'medium' | 'hard';
  };
}

// ============================================================================
// TEMPLATE GAME DATA
// ============================================================================

/**
 * TODO: Add your game-specific game state here
 * This is the data that represents the current game state
 */
export interface TemplateGameData {
  // Example game data - customize for your game:
  currentRound: number;
  currentTurn: string | null; // Player socket ID
  teams?: Team[]; // Team mode support
  // Add more fields as needed for your game logic
}

// ============================================================================
// TEMPLATE LOBBY (combines all the above)
// ============================================================================

export type TemplateLobby = BaseLobby<TemplatePlayer, TemplateSettings, TemplateGameData>;

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

// These are the types your components should use
export type Lobby = TemplateLobby;
export type Player = TemplatePlayer;
export type Settings = TemplateSettings;
export type GameData = TemplateGameData;
