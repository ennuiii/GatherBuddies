/**
 * Game Scene
 *
 * Main game scene - renders the 2D virtual world.
 * Creates tilemap, handles player movement, syncs with Colyseus.
 *
 * Colyseus Integration:
 * - Gets room from Phaser registry (set by PhaserGame component)
 * - Creates MyPlayer when local player appears in state.players
 * - Creates OtherPlayer for each remote player
 * - Sends movement updates via room.send(HubMessage.UPDATE_PLAYER)
 * - Receives position updates via player.onChange()
 * - Handles player join/leave via state.players.onAdd/onRemove
 */

import Phaser from 'phaser';
import type { Room } from 'colyseus.js';
import { createCharacterAnims } from '../anims/CharacterAnims';
import MyPlayer from '../characters/MyPlayer';
import OtherPlayer from '../characters/OtherPlayer';
import '../characters/MyPlayer';
import '../characters/OtherPlayer';
import { phaserEvents } from '../events/EventCenter';

interface NavKeys {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  W: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

// Player state from Colyseus
interface PlayerState {
  name: string;
  x: number;
  y: number;
  anim: string;
}

export default class Game extends Phaser.Scene {
  private room!: Room;
  private cursors!: NavKeys;
  private map!: Phaser.Tilemaps.Tilemap;
  myPlayer!: MyPlayer;
  private otherPlayers!: Phaser.Physics.Arcade.Group;
  private otherPlayerMap = new Map<string, OtherPlayer>();
  private playerName: string = 'Player';
  private overlappingPlayers: Set<string> = new Set();
  private currentFrameOverlaps: Set<string> = new Set();
  private conversationGraphics!: Phaser.GameObjects.Graphics;
  private lastIndicatorUpdate = 0;

  constructor() {
    super('game');
  }

  init() {
    // Get player name from registry (set by PhaserGame component)
    this.playerName = this.registry.get('playerName') || 'Player';
  }

  registerKeys() {
    this.cursors = {
      ...this.input.keyboard!.createCursorKeys(),
      ...(this.input.keyboard!.addKeys('W,S,A,D') as {
        W: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
      }),
    };
    this.input.keyboard!.disableGlobalCapture();
  }

  create() {
    // Get Colyseus room from registry
    const room = this.registry.get('colyseusRoom') as Room | undefined;
    if (!room) {
      console.error('[Game] Colyseus room not found in registry');
      return;
    }
    this.room = room;

    // Create character animations
    createCharacterAnims(this.anims);

    // Register keyboard inputs
    this.registerKeys();

    // Create tilemap
    this.map = this.make.tilemap({ key: 'tilemap' });
    const FloorAndGround = this.map.addTilesetImage('FloorAndGround', 'tiles_wall');

    // Create ground layer
    const groundLayer = this.map.createLayer('Ground', FloorAndGround!);
    if (groundLayer) {
      groundLayer.setCollisionByProperty({ collides: true });
    }

    // Add wall objects from tiled map
    this.addGroupFromTiled('Wall', 'tiles_wall', 'FloorAndGround', false);

    // Add office objects
    this.addGroupFromTiled('Objects', 'office', 'Modern_Office_Black_Shadow', false);
    this.addGroupFromTiled('ObjectsOnCollide', 'office', 'Modern_Office_Black_Shadow', true);

    // Add generic objects
    this.addGroupFromTiled('GenericObjects', 'generic', 'Generic', false);
    this.addGroupFromTiled('GenericObjectsOnCollide', 'generic', 'Generic', true);

    // Add basement objects
    this.addGroupFromTiled('Basement', 'basement', 'Basement', true);

    // Create other players group
    this.otherPlayers = this.physics.add.group({ classType: OtherPlayer });

    // Graphics layer for conversation indicators
    this.conversationGraphics = this.add.graphics();
    this.conversationGraphics.setDepth(999);

    // Set up camera
    this.cameras.main.zoom = 1.5;

    // Register handler for room data messages (avoids console warning)
    this.room.onMessage(3, (data: { id: string; roomCode: string }) => {
      console.log('[Game] Received room data:', data);
    });

    // Set up Colyseus state listeners immediately
    // onAdd callback should fire for existing items when first registered
    console.log('[Game] Scene created, setting up listeners...');
    this.setupColyseusListeners();
  }

  private setupColyseusListeners() {
    const state = this.room.state as any;

    console.log('[Game] Setting up Colyseus listeners, session:', this.room.sessionId);
    console.log('[Game] State object:', state);
    console.log('[Game] State.players:', state.players);
    console.log('[Game] Players type:', typeof state.players, state.players?.constructor?.name);
    console.log('[Game] Players size:', state.players?.size);

    // Debug: try to iterate players
    if (state.players) {
      console.log('[Game] Iterating players...');
      let count = 0;
      state.players.forEach((p: any, id: string) => {
        console.log('[Game] Found player in state:', id, p);
        count++;
      });
      console.log('[Game] Total players found:', count);
    }

    // Handler for adding a player
    const handlePlayerAdd = (player: PlayerState, sessionId: string) => {
      console.log('[Game] Processing player:', sessionId, player.name, 'isLocal:', sessionId === this.room.sessionId);

      if (sessionId === this.room.sessionId) {
        // This is the local player - only create once
        if (this.myPlayer) {
          console.log('[Game] MyPlayer already exists, skipping');
          return;
        }

        const spawnX = player.x || 705;
        const spawnY = player.y || 500;

        this.myPlayer = this.add.myPlayer(spawnX, spawnY, 'adam', sessionId);
        this.myPlayer.setPlayerName(this.playerName);

        // Set camera to follow player
        this.cameras.main.startFollow(this.myPlayer, true);

        // Set up movement callback
        this.myPlayer.onMovementUpdate = (data: { x: number; y: number; anim: string }) => {
          this.room.send(0, data); // HubMessage.UPDATE_PLAYER = 0
        };

        // Send initial name to server
        this.room.send(1, { name: this.playerName }); // HubMessage.UPDATE_PLAYER_NAME = 1

        // Add collisions with ground
        const groundLayer = this.map.getLayer('Ground')?.tilemapLayer;
        if (groundLayer) {
          this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], groundLayer);
        }

        // Add proximity detection overlap
        this.physics.add.overlap(
          this.myPlayer,
          this.otherPlayers,
          this.handlePlayersOverlap,
          undefined,
          this
        );

        console.log('[Game] MyPlayer created at', spawnX, spawnY);
      } else {
        // This is another player
        this.handlePlayerJoined(player, sessionId);
      }

      // Listen for changes to this player
      player.onChange(() => {
        if (sessionId !== this.room.sessionId) {
          this.handlePlayerUpdated(sessionId, player);
        }
      });
    };

    // Listen for player additions - the 'true' parameter is CRUCIAL
    // It makes onAdd fire immediately for existing items in the collection
    state.players.onAdd((player: PlayerState, sessionId: string) => {
      console.log('[Game] onAdd triggered for:', sessionId);
      handlePlayerAdd(player, sessionId);
    }, true); // <-- This triggers for existing players immediately!

    // Listen for player removals
    state.players.onRemove((_player: PlayerState, sessionId: string) => {
      console.log('[Game] Player removed:', sessionId);
      this.handlePlayerLeft(sessionId);
    });

    // Listen for new chat messages
    state.chatMessages.onAdd((message: any, _index: number) => {
      console.log('[Game] New chat message:', message.author, message.authorId, message.content);

      // Find the player who sent this message and show speech bubble
      let senderPlayer: import('../characters/Player').default | undefined;

      // Match by sessionId (authorId) for correct bubble placement
      if (message.authorId === this.room.sessionId) {
        senderPlayer = this.myPlayer;
      } else if (this.otherPlayerMap.has(message.authorId)) {
        senderPlayer = this.otherPlayerMap.get(message.authorId);
      }

      if (senderPlayer) {
        senderPlayer.updateDialogBubble(message.content);
      }

      // Emit to React for chat panel
      phaserEvents.emit('chat:message', {
        author: message.author,
        content: message.content,
        createdAt: message.createdAt
      });
    });
  }

  private handlePlayerJoined(newPlayer: PlayerState, id: string) {
    console.log('[Game] Creating OtherPlayer:', id, newPlayer.name);

    // Don't create if already exists
    if (this.otherPlayerMap.has(id)) {
      return;
    }

    const otherPlayer = this.add.otherPlayer(
      newPlayer.x || 705,
      newPlayer.y || 500,
      'adam',
      id,
      newPlayer.name || 'Player'
    );
    this.otherPlayers.add(otherPlayer);
    this.otherPlayerMap.set(id, otherPlayer);
  }

  private handlePlayerLeft(id: string) {
    console.log('[Game] Removing player:', id);
    if (this.otherPlayerMap.has(id)) {
      const otherPlayer = this.otherPlayerMap.get(id);
      if (otherPlayer) {
        this.otherPlayers.remove(otherPlayer, true, true);
        this.otherPlayerMap.delete(id);
      }
    }
  }

  private handlePlayerUpdated(id: string, player: PlayerState) {
    const otherPlayer = this.otherPlayerMap.get(id);
    if (otherPlayer) {
      otherPlayer.updateFromState(player);
    } else if (player.name) {
      // If we don't have this player yet, add them
      this.handlePlayerJoined(player, id);
    }
  }

  private addGroupFromTiled(
    objectLayerName: string,
    key: string,
    tilesetName: string,
    _collidable: boolean
  ) {
    const group = this.physics.add.staticGroup();
    const objectLayer = this.map.getObjectLayer(objectLayerName);

    if (!objectLayer) {
      // Many layers are optional
      return group;
    }

    const tileset = this.map.getTileset(tilesetName);
    if (!tileset) {
      console.warn(`[Game] Tileset "${tilesetName}" not found`);
      return group;
    }

    objectLayer.objects.forEach((object) => {
      const actualX = object.x! + object.width! * 0.5;
      const actualY = object.y! - object.height! * 0.5;
      group.get(actualX, actualY, key, object.gid! - tileset.firstgid).setDepth(actualY);
    });

    return group;
  }

  private handlePlayersOverlap(
    _myPlayer: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    otherPlayer: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const other = otherPlayer as OtherPlayer;
    this.currentFrameOverlaps.add(other.playerId);

    if (!this.overlappingPlayers.has(other.playerId)) {
      // First time overlapping - update buffer
      other.updateProximityBuffer(0); // Start counting
      if (other.checkProximityConnection(this.room.sessionId)) {
        this.overlappingPlayers.add(other.playerId);

        // Send START_CONVERSATION to Colyseus server (Message.START_CONVERSATION = 4)
        this.room.send(4, { targetSessionId: other.playerId });
        console.log('[Game] Sent START_CONVERSATION for', other.playerId);
      }
    }
  }

  private drawConversationIndicators(): void {
    this.conversationGraphics.clear();

    const state = this.room.state as any;
    const conversations = new Map<string, { players: Array<{ x: number; y: number }>; locked: boolean }>();

    // Group players by conversationId
    state.players.forEach((player: any, sessionId: string) => {
      if (!player.conversationId) return;

      let conv = conversations.get(player.conversationId);
      if (!conv) {
        // Find conversation locked state
        const convState = state.conversations?.get(player.conversationId);
        conv = { players: [], locked: convState?.locked || false };
        conversations.set(player.conversationId, conv);
      }

      // Get player position
      if (sessionId === this.room.sessionId && this.myPlayer) {
        conv.players.push({ x: this.myPlayer.x, y: this.myPlayer.y });
      } else if (this.otherPlayerMap.has(sessionId)) {
        const other = this.otherPlayerMap.get(sessionId)!;
        conv.players.push({ x: other.x, y: other.y });
      }
    });

    // Draw indicator for each conversation
    conversations.forEach((conv) => {
      if (conv.players.length < 2) return;

      // Calculate center
      let centerX = 0;
      let centerY = 0;
      conv.players.forEach((p) => {
        centerX += p.x;
        centerY += p.y;
      });
      centerX /= conv.players.length;
      centerY /= conv.players.length;

      // Calculate radius to encompass all players + padding
      let maxDist = 0;
      conv.players.forEach((p) => {
        const dist = Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2);
        if (dist > maxDist) maxDist = dist;
      });
      const radius = maxDist + 40; // padding

      // Draw circle (red for locked, green for open)
      this.conversationGraphics.lineStyle(3, conv.locked ? 0xff6b6b : 0x4caf50, 0.6);
      this.conversationGraphics.strokeCircle(centerX, centerY, radius);

      // Fill with semi-transparent color
      this.conversationGraphics.fillStyle(conv.locked ? 0xff6b6b : 0x4caf50, 0.1);
      this.conversationGraphics.fillCircle(centerX, centerY, radius);
    });
  }

  update(t: number, dt: number) {
    if (this.myPlayer && this.cursors) {
      this.myPlayer.update(this.cursors);
    }

    // Clear current frame overlaps (will be repopulated by overlap callback)
    this.currentFrameOverlaps.clear();

    // Check for disconnections - players who were overlapping but aren't now
    this.otherPlayerMap.forEach((player, id) => {
      if (this.overlappingPlayers.has(id) && !this.currentFrameOverlaps.has(id)) {
        // Player was overlapping but isn't now - start disconnect timer
        player.updateDisconnectBuffer(dt);
        if (player.shouldDisconnect()) {
          player.disconnect();
          this.overlappingPlayers.delete(id);
          phaserEvents.emit('proximity:disconnect', { playerId: id });

          // Send LEAVE_CONVERSATION to Colyseus server (Message.LEAVE_CONVERSATION = 5)
          this.room.send(5, {});
          console.log('[Game] Sent LEAVE_CONVERSATION');
        }
      } else if (!this.currentFrameOverlaps.has(id)) {
        // Not overlapping - update proximity buffer for potential connection
        player.updateProximityBuffer(dt);
      }

      // Reset disconnect buffer if overlapping
      if (this.currentFrameOverlaps.has(id)) {
        player.resetDisconnectBuffer();
      }
    });

    // Update conversation indicators periodically (throttle to every 100ms)
    if (t - this.lastIndicatorUpdate > 100) {
      this.drawConversationIndicators();
      this.lastIndicatorUpdate = t;
    }
  }
}
