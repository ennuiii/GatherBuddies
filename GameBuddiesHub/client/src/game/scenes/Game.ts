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
import Chair from '../items/Chair';
import PlayerSelector from '../items/PlayerSelector';

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
  private collidableGroups: Phaser.Physics.Arcade.StaticGroup[] = []; // Store groups for collision
  private keyE!: Phaser.Input.Keyboard.Key;
  private playerSelector!: PlayerSelector;
  private chairGroup!: Phaser.Physics.Arcade.StaticGroup;
  private selectedCharacter: string = 'adam';

  constructor() {
    super('game');
  }

  init() {
    // Get player name from registry (set by PhaserGame component)
    this.playerName = this.registry.get('playerName') || 'Player';
    // Get selected character from registry (set by CharacterSelect scene)
    this.selectedCharacter = this.registry.get('selectedCharacter') || 'adam';
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
    // Register E key for interactions (sit on chairs, etc.)
    this.keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
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

    // Create chair group and player selector for interactive chairs
    this.chairGroup = this.physics.add.staticGroup({ classType: Chair });
    this.addChairsFromTiled('Chair', 'chairs', 'chair');

    // Create player selector (invisible zone that detects items in front of player)
    this.playerSelector = new PlayerSelector(this, 0, 0, 32, 32);

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

        this.myPlayer = this.add.myPlayer(spawnX, spawnY, this.selectedCharacter, sessionId);
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

        // Add collisions with all stored collidable object groups
        this.collidableGroups.forEach(group => {
          this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], group);
        });
        console.log('[Game] Added collisions with', this.collidableGroups.length, 'object groups');

        // Add chair overlap detection - when player selector overlaps a chair, show dialog
        this.physics.add.overlap(
          this.playerSelector,
          this.chairGroup,
          this.handleChairOverlap,
          undefined,
          this
        );

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

    // TODO: Get character from player state when server tracks selection
    const otherCharacter = 'adam';
    const otherPlayer = this.add.otherPlayer(
      newPlayer.x || 705,
      newPlayer.y || 500,
      otherCharacter,
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
    collidable: boolean
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

    // Store collidable groups to add collision after player is created
    if (collidable && group.getLength() > 0) {
      this.collidableGroups.push(group);
    }

    return group;
  }

  private addChairsFromTiled(
    objectLayerName: string,
    key: string,
    tilesetName: string
  ) {
    const objectLayer = this.map.getObjectLayer(objectLayerName);

    if (!objectLayer) {
      console.log(`[Game] No chair layer "${objectLayerName}" found in tilemap`);
      return;
    }

    const tileset = this.map.getTileset(tilesetName);
    if (!tileset) {
      console.warn(`[Game] Tileset "${tilesetName}" not found for chairs`);
      return;
    }

    objectLayer.objects.forEach((object) => {
      const actualX = object.x! + object.width! * 0.5;
      const actualY = object.y! - object.height! * 0.5;

      // Create chair at the object position
      const chair = this.chairGroup.get(actualX, actualY, key, object.gid! - tileset.firstgid) as Chair;

      if (chair) {
        chair.setDepth(actualY);

        // Get chair direction from object properties
        const directionProp = object.properties?.find(
          (p: { name: string; value: any }) => p.name === 'direction'
        );
        chair.itemDirection = directionProp?.value || 'down';
      }
    });

    console.log(`[Game] Added ${objectLayer.objects.length} chairs from "${objectLayerName}"`);
  }

  private handleChairOverlap(
    _playerSelector: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    chairObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const chair = chairObj as Chair;

    // Only show dialog if not already selecting this chair
    if (this.playerSelector.selectedItem !== chair) {
      // Clear previous selection dialog
      this.playerSelector.selectedItem?.clearDialogBox();

      // Set new selection and show dialog
      this.playerSelector.selectedItem = chair;
      chair.onOverlapDialog();
    }
  }

  private handlePlayersOverlap(
    _myPlayer: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    otherPlayer: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const other = otherPlayer as OtherPlayer;
    this.currentFrameOverlaps.add(other.playerId);

    // Reset disconnect buffer since we're overlapping
    other.resetDisconnectBuffer();

    // If not yet connected, update proximity buffer (need 750ms of overlap)
    if (!other.connected) {
      // Update proximity buffer while overlapping (this accumulates time)
      other.updateProximityBuffer(this.game.loop.delta);

      // checkProximityConnection will return true when buffer reaches 750ms and we should initiate
      const shouldConnect = other.checkProximityConnection(this.room.sessionId);
      if (shouldConnect) {
        console.log('[Game] Proximity threshold reached for', other.playerId);
        this.overlappingPlayers.add(other.playerId);

        // Check if I'm already in a conversation before starting a new one
        const state = this.room.state as any;
        const myPlayer = state.players?.get(this.room.sessionId);
        console.log('[Game] My conversationId:', myPlayer?.conversationId);
        console.log('[Game] My sessionId:', this.room.sessionId);
        console.log('[Game] Other playerId:', other.playerId);

        if (!myPlayer?.conversationId) {
          // Send START_CONVERSATION to Colyseus server (Message.START_CONVERSATION = 4)
          console.log('[Game] Sending START_CONVERSATION to server...');
          this.room.send(4, { targetSessionId: other.playerId });
          console.log('[Game] Sent START_CONVERSATION for', other.playerId);
        } else {
          console.log('[Game] Already in conversation, not sending START_CONVERSATION');
        }
      }
    }
  }

  private drawConversationIndicators(): void {
    // MUST clear before drawing new frame
    this.conversationGraphics.clear();

    const state = this.room.state as any;
    if (!state.players) return;

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

      // Get player position - use state positions, not sprite positions
      const x = player.x;
      const y = player.y;
      if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
        conv.players.push({ x, y });
      }
    });

    // Draw indicator for each conversation
    conversations.forEach((conv, convId) => {
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

      // Clamp radius to reasonable bounds
      const radius = Math.min(Math.max(maxDist + 40, 50), 200);

      console.log('[Game] Drawing circle:', { convId, centerX, centerY, radius, players: conv.players.length });

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
      this.myPlayer.update(this.cursors, this.keyE, this.playerSelector);
    }

    // Check for disconnections - players who were overlapping but aren't now
    // Note: currentFrameOverlaps is populated by handlePlayersOverlap during physics step
    this.otherPlayerMap.forEach((player, id) => {
      if (this.overlappingPlayers.has(id) && !this.currentFrameOverlaps.has(id)) {
        // Player was in conversation but walked away - start disconnect timer
        player.updateDisconnectBuffer(dt);
        if (player.shouldDisconnect()) {
          console.log('[Game] Player walked away, disconnecting:', id);
          player.disconnect();
          this.overlappingPlayers.delete(id);
          phaserEvents.emit('proximity:disconnect', { playerId: id });

          // Send LEAVE_CONVERSATION to Colyseus server (Message.LEAVE_CONVERSATION = 5)
          this.room.send(5, {});
          console.log('[Game] Sent LEAVE_CONVERSATION');
        }
      } else if (!this.currentFrameOverlaps.has(id) && !this.overlappingPlayers.has(id)) {
        // Not overlapping and never connected - reset proximity buffer
        // (they need to stay near each other for 750ms to connect)
        player.resetProximityBuffer();
      }
    });

    // Clear current frame overlaps AFTER we've used them (will be repopulated next frame)
    this.currentFrameOverlaps.clear();

    // Update conversation indicators periodically (throttle to every 100ms)
    if (t - this.lastIndicatorUpdate > 100) {
      this.drawConversationIndicators();
      this.lastIndicatorUpdate = t;
    }
  }
}
