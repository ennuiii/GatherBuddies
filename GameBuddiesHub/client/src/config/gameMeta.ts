/**
 * Hub Game Metadata
 * Configuration for the GameBuddies Hub virtual world
 */

export const GAME_META = {
  // Game identifiers
  id: 'hub',
  name: 'GameBuddies Hub',

  // Split name for styled display
  namePrefix: 'GameBuddies',
  nameAccent: 'Hub',

  // Short description
  tagline: 'Meet friends and launch games together!',

  // Full description
  description: 'A virtual world where players meet, chat, and launch games together.',

  // Mascot image alt text
  mascotAlt: 'GameBuddies Hub',

  // Socket.IO namespace for room management (must match server plugin)
  namespace: '/hub',

  // Player limits
  minPlayers: 1,
  maxPlayers: 50,
};

// Server URLs
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
export const COLYSEUS_URL = import.meta.env.VITE_COLYSEUS_URL || 'ws://localhost:3002';

// Version
export const VERSION = '1.0.0';
