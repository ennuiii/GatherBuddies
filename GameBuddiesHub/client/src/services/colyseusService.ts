/**
 * Colyseus Service
 *
 * Handles connection to Colyseus server for 2D world state sync.
 * Used alongside Socket.IO (which handles room management and WebRTC).
 */

import { Client, Room } from 'colyseus.js';
import { COLYSEUS_URL } from '../config/gameMeta';
import socketService from './socketService';

// Message types (must match server - GameBuddieGamesServer/games/hub/Message.ts)
export enum HubMessage {
  UPDATE_PLAYER = 0,
  UPDATE_PLAYER_NAME = 1,
  ADD_CHAT_MESSAGE = 2,
  SEND_ROOM_DATA = 3,
  START_CONVERSATION = 4,
  LEAVE_CONVERSATION = 5,
  // Note: 10 = CONVERSATION_UPDATED on server
  GAME_INVITE = 20,
}

class ColyseusService {
  private client: Client;
  private room: Room | null = null;
  private connectionPromise: Promise<Room> | null = null;

  constructor() {
    this.client = new Client(COLYSEUS_URL);
  }

  /**
   * Join or create a hub room
   * @param roomCode - The Socket.IO room code to match
   * @param playerName - Player's display name
   */
  async joinHub(roomCode: string, playerName: string): Promise<Room> {
    // If already connecting, wait for that connection
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // If already in a room with the same code, return it
    if (this.room && (this.room as any).state?.roomCode === roomCode) {
      return this.room;
    }

    // Leave any existing room first
    if (this.room) {
      this.leave();
    }

    // Get Socket.IO socket ID for WebRTC mapping
    const socketId = socketService.getSocket()?.id || '';

    this.connectionPromise = this.client.joinOrCreate('hub', {
      roomCode,
      playerName,
      socketId, // Pass Socket.IO ID so Colyseus state can be used for WebRTC peer lookup
    });

    try {
      this.room = await this.connectionPromise;

      // Register handler for room data messages (sent by server on join)
      this.room.onMessage(HubMessage.SEND_ROOM_DATA, (_data: { id: string; roomCode: string }) => {
        // Room data received - used by game scene
      });

      // Set up reconnection handler
      this.room.onLeave((code) => {
        if (code > 1000) {
          // Abnormal close - try to reconnect
          this.reconnect(roomCode, playerName);
        }
      });

      this.room.onError((code, message) => {
        console.error(`[Colyseus] Room error: ${code} - ${message}`);
      });

      return this.room;
    } finally {
      this.connectionPromise = null;
    }
  }

  /**
   * Attempt to reconnect to a room
   */
  private async reconnect(roomCode: string, playerName: string): Promise<void> {
    const maxAttempts = 5;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));

        await this.joinHub(roomCode, playerName);
        return;
      } catch (error) {
        console.error(`[Colyseus] Reconnection attempt ${attempt} failed:`, error);
      }
    }

    console.error('[Colyseus] All reconnection attempts failed');
  }

  /**
   * Get the current room
   */
  getRoom(): Room | null {
    return this.room;
  }

  /**
   * Check if connected to a room
   */
  isConnected(): boolean {
    return this.room !== null;
  }

  /**
   * Send player position update
   */
  sendPlayerUpdate(x: number, y: number, anim: string): void {
    if (!this.room) {
      return;
    }
    this.room.send(HubMessage.UPDATE_PLAYER, { x, y, anim });
  }

  /**
   * Send player name update
   */
  sendPlayerName(name: string): void {
    if (!this.room) {
      return;
    }
    this.room.send(HubMessage.UPDATE_PLAYER_NAME, { name });
  }

  /**
   * Send chat message
   */
  sendChatMessage(content: string): void {
    if (!this.room) {
      return;
    }
    this.room.send(HubMessage.ADD_CHAT_MESSAGE, { content });
  }

  /**
   * Send game invite to nearby players
   */
  sendGameInvite(
    gameType: string,
    gameName: string,
    hubRoomCode: string,
    targetPlayers: string[],
    inviterName: string
  ): void {
    if (!this.room) {
      return;
    }
    this.room.send(HubMessage.GAME_INVITE, {
      gameType,
      gameName,
      hubRoomCode,
      targetPlayers,
      inviterName,
    });
  }

  /**
   * Leave the current room
   */
  leave(): void {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
  }

  /**
   * Get the Colyseus client instance
   */
  getClient(): Client {
    return this.client;
  }
}

// Export singleton instance
export const colyseusService = new ColyseusService();
export default colyseusService;
