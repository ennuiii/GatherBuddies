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
import ArcadeCabinet from '../items/ArcadeCabinet';
import Chair from '../items/Chair';
import PlayerSelector from '../items/PlayerSelector';
import { calculateDistanceInTiles, PROXIMITY } from '../../config/proximityConfig';
import { type AvatarConfig, DEFAULT_AVATAR_CONFIG } from '../../types/avatar';
import { avatarStorage } from '../../services/AvatarStorage';
import { avatarCompositor } from '../../services/AvatarCompositor';
import { avatarAssetLoader } from '../../services/AvatarAssetLoader';

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
  character?: string; // Legacy key or JSON avatar config
}

export default class Game extends Phaser.Scene {
  private room!: Room;
  private cursors!: NavKeys;
  private map!: Phaser.Tilemaps.Tilemap;
  myPlayer!: MyPlayer;
  private otherPlayers!: Phaser.Physics.Arcade.Group;
  private otherPlayerMap = new Map<string, OtherPlayer>();
  // Track recently removed players to prevent ghost players from race conditions
  // (onChange can fire after onRemove, causing players to reappear)
  private recentlyRemovedPlayers = new Map<string, number>(); // sessionId -> removal timestamp
  private playerName: string = 'Player';
  private overlappingPlayers: Set<string> = new Set();
  private currentFrameOverlaps: Set<string> = new Set();
  private conversationGraphics!: Phaser.GameObjects.Graphics;
  private lastIndicatorUpdate = 0;
  private collidableGroups: Phaser.Physics.Arcade.StaticGroup[] = []; // Store groups for collision
  private keyE!: Phaser.Input.Keyboard.Key;
  private playerSelector!: PlayerSelector;
  private chairGroup!: Phaser.Physics.Arcade.StaticGroup;
  private cabinetGroup!: Phaser.Physics.Arcade.StaticGroup;

  // Player spawn data (stored while avatar editor is open)
  private pendingPlayerData: { player: PlayerState; sessionId: string } | null = null;

  // Avatar customization state
  private avatarConfig: AvatarConfig | null = null;

  // Debug mode for positioning objects
  private debugMode: boolean = false;
  private debugText!: Phaser.GameObjects.Text;

  // Dialog state - pause game input while dialog is open
  private dialogOpen: boolean = false;

  // Avatar editor state
  private avatarEditorOpen: boolean = false;
  private keyC!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('game');
  }

  init() {
    // Get player name from registry (set by PhaserGame component)
    this.playerName = this.registry.get('playerName') || 'Player';
    // Reset state for new game
    this.pendingPlayerData = null;

    // Load saved avatar config
    this.avatarConfig = avatarStorage.load();
    console.log('[Game] Avatar system ready, saved config:', this.avatarConfig ? 'found' : 'none');
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

    // Register C key for avatar customization
    this.keyC = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    // Register F9 key for debug mode (cabinet positioning)
    const keyF9 = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F9);
    keyF9.on('down', () => this.toggleDebugMode());

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

    // Re-initialize avatar services with this scene
    // (Bootstrap scene that originally initialized them is no longer active)
    avatarAssetLoader.initialize(this);
    avatarCompositor.initialize(this);

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

    // Create arcade cabinet group and add cabinets programmatically
    this.cabinetGroup = this.physics.add.staticGroup({ classType: ArcadeCabinet });
    this.createArcadeCabinets();

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

    // Listen for dialog state changes to pause/resume game input
    phaserEvents.on('dialog:opened', () => { this.dialogOpen = true; });
    phaserEvents.on('dialog:closed', () => { this.dialogOpen = false; });

    // Listen for avatar selection from React AvatarEditor
    phaserEvents.on('avatar:selectionComplete', this.handleAvatarSelected, this);
    phaserEvents.on('avatar:updated', this.handleAvatarUpdated, this);

    // Listen for other player character changes (for live avatar updates)
    phaserEvents.on('otherPlayer:characterChanged', this.handleOtherPlayerCharacterChanged, this);

    // Listen for avatar editor scene stop to reset state
    this.scene.get('avatarEditor')?.events.on('shutdown', () => {
      this.avatarEditorOpen = false;
      console.log('[Game] Avatar editor scene shutdown');
    });
  }

  /**
   * Handle character change for other players (live avatar updates)
   */
  private handleOtherPlayerCharacterChanged = async (data: { playerId: string; character: string }) => {
    const otherPlayer = this.otherPlayerMap.get(data.playerId);
    if (!otherPlayer) {
      console.log('[Game] Character changed for unknown player:', data.playerId);
      return;
    }

    // Check if it's a JSON avatar config
    if (data.character.startsWith('{')) {
      // Compose avatar for the other player
      await this.composeOtherPlayerAvatar(otherPlayer, data.character);
    } else {
      // Legacy character key - update texture directly
      otherPlayer.updateTexture(data.character);
    }
  };

  // Handle avatar selection from React UI (legacy - kept for backward compatibility with useAvatar hook)
  private handleAvatarSelected = async (config: AvatarConfig) => {
    console.log('[Game] Avatar selected (via event):', config);
    this.avatarConfig = config;

    // If we have pending player data, spawn now
    if (this.pendingPlayerData && !this.myPlayer) {
      await this.spawnWithAvatar();
    }
  };

  // Handle avatar update (for live preview and avatar changes)
  private handleAvatarUpdated = async (config: AvatarConfig) => {
    console.log('[Game] Avatar updated:', config);
    this.avatarConfig = config;

    // Update existing player sprite if already spawned
    if (this.myPlayer) {
      try {
        // Compose new avatar texture
        const textureKey = await avatarCompositor.composeAvatar(config);
        avatarCompositor.createAnimations(textureKey);

        // Swap texture on player sprite
        this.myPlayer.updateTexture(textureKey);
        console.log('[Game] MyPlayer texture updated to:', textureKey);

        // Send updated config to server for other players
        this.room.send(6, { character: JSON.stringify(config) }); // HubMessage.UPDATE_CHARACTER = 6
      } catch (error) {
        console.error('[Game] Failed to update avatar:', error);
      }
    }
  };

  /**
   * Open the Phaser-native avatar editor scene.
   * Launches editor as overlay, passes current config, handles save callback.
   */
  openAvatarEditor() {
    // Don't open if already open or no player spawned
    if (this.avatarEditorOpen || !this.myPlayer) {
      console.log('[Game] Cannot open avatar editor - already open or player not spawned');
      return;
    }

    console.log('[Game] Opening avatar editor');
    this.avatarEditorOpen = true;

    // Get current config or use default
    const currentConfig = this.avatarConfig || {
      id: `avatar_${Date.now()}`,
      body: { type: 'neutral' as const, skinTone: 'fair' as const },
      hair: { style: 'short' as const, color: '#4A3728' },
      clothing: {
        top: 'tshirt' as const,
        topColor: '#3B82F6',
        bottom: 'jeans' as const,
        bottomColor: '#1E3A5F',
        shoes: 'sneakers' as const,
        shoesColor: '#FFFFFF',
      },
      accessories: [],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Launch editor scene as overlay (game scene stays active but input is blocked)
    this.scene.launch('avatarEditor', {
      config: currentConfig,
      onSave: this.handleAvatarEditorSave.bind(this),
    });
  }

  /**
   * Launch avatar editor for first-time player spawn.
   * Called when player joins the room instead of legacy character selection.
   */
  private launchAvatarEditorForSpawn() {
    console.log('[Game] Launching avatar editor for first-time spawn');

    // Check if player has saved avatar config
    const savedConfig = avatarStorage.load();
    const config = savedConfig || {
      id: `avatar_${Date.now()}`,
      body: { type: 'male' as const, skinTone: 'light' as const },
      hair: { style: 'pixie' as const, color: '#4A3728' },
      clothing: {
        top: 'tshirt' as const,
        topColor: '#3B82F6',
        bottom: 'jeans' as const,
        bottomColor: '#1E3A5F',
        shoes: 'sneakers' as const,
        shoesColor: '#FFFFFF',
      },
      accessories: [],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Launch editor scene with first-time flag
    this.scene.launch('avatarEditor', {
      config,
      isFirstTime: true,
      onSave: this.handleFirstTimeAvatarSave.bind(this),
      onQuickStart: this.handleQuickStart.bind(this),
    });
  }

  /**
   * Handle save from avatar editor when spawning for the first time.
   * Spawns the player with the configured avatar.
   */
  private async handleFirstTimeAvatarSave(config: AvatarConfig) {
    console.log('[Game] First-time avatar save:', config);

    // Store config locally
    this.avatarConfig = config;
    avatarStorage.save(config);

    // Spawn with the custom avatar
    await this.spawnWithAvatar();
  }

  /**
   * Handle quick start - spawn with default avatar immediately.
   */
  private async handleQuickStart(config: AvatarConfig) {
    console.log('[Game] Quick start with default avatar');

    // Store config locally
    this.avatarConfig = config;
    avatarStorage.save(config);

    // Spawn with the default avatar
    await this.spawnWithAvatar();
  }

  /**
   * Handle save from avatar editor scene.
   * Updates local config, player sprite, and syncs to server.
   */
  private async handleAvatarEditorSave(config: AvatarConfig) {
    console.log('[Game] Avatar editor saved:', config);
    this.avatarEditorOpen = false;

    // Store config locally
    this.avatarConfig = config;
    avatarStorage.save(config);

    // Update player sprite
    if (this.myPlayer) {
      try {
        // Compose new avatar texture
        const textureKey = await avatarCompositor.composeAvatar(config);
        avatarCompositor.createAnimations(textureKey);

        // Swap texture on player sprite
        this.myPlayer.updateTexture(textureKey);
        console.log('[Game] MyPlayer texture updated to:', textureKey);

        // Send updated config to server for other players
        this.room.send(6, { character: JSON.stringify(config) }); // HubMessage.UPDATE_CHARACTER = 6
      } catch (error) {
        console.error('[Game] Failed to update avatar after save:', error);
      }
    }
  }

  /**
   * Handle avatar editor close (cancel or escape).
   */
  handleAvatarEditorClose() {
    console.log('[Game] Avatar editor closed');
    this.avatarEditorOpen = false;
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

        // Store player data and launch avatar editor for first-time setup
        this.pendingPlayerData = { player, sessionId };
        this.launchAvatarEditorForSpawn();
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
    console.log('[Game] Creating OtherPlayer:', id, newPlayer.name, 'character:', newPlayer.character?.slice(0, 30));

    // Don't create if already exists
    if (this.otherPlayerMap.has(id)) {
      return;
    }

    // Get character from player state
    // Check if it's a JSON avatar config or legacy character key
    let otherCharacter = 'adam'; // Default fallback
    let avatarConfigJson: string | null = null;

    if (newPlayer.character) {
      if (newPlayer.character.startsWith('{')) {
        // JSON avatar config - store for async composition
        avatarConfigJson = newPlayer.character;
        // Use fallback initially, will swap texture after composition
        otherCharacter = 'adam';
      } else {
        // Legacy character key
        otherCharacter = newPlayer.character;
      }
    }

    const otherPlayer = this.add.otherPlayer(
      newPlayer.x || 705,
      newPlayer.y || 500,
      otherCharacter,
      id,
      newPlayer.name || 'Player'
    );
    this.otherPlayers.add(otherPlayer);
    this.otherPlayerMap.set(id, otherPlayer);

    // If player has avatar config, compose texture asynchronously and swap
    if (avatarConfigJson) {
      this.composeOtherPlayerAvatar(otherPlayer, avatarConfigJson);
    }
  }

  /**
   * Compose avatar texture for another player and swap their sprite texture.
   * Runs asynchronously - player is visible with fallback texture while loading.
   */
  private async composeOtherPlayerAvatar(otherPlayer: OtherPlayer, configJson: string) {
    try {
      const config: AvatarConfig = JSON.parse(configJson);
      console.log('[Game] Composing avatar for OtherPlayer:', otherPlayer.playerId.slice(0, 8));

      // Compose the avatar texture
      const textureKey = await avatarCompositor.composeAvatar(config);
      avatarCompositor.createAnimations(textureKey);

      // Swap texture on the player sprite
      otherPlayer.updateTexture(textureKey);
      console.log('[Game] OtherPlayer texture swapped to:', textureKey);
    } catch (error) {
      console.error('[Game] Failed to compose avatar for OtherPlayer:', error);
      // Keep using fallback texture (adam)
    }
  }

  private handlePlayerLeft(id: string) {
    console.log('[Game] Removing player:', id);

    // Track removal time to ignore late onChange callbacks (prevents ghost players)
    this.recentlyRemovedPlayers.set(id, Date.now());

    // Clean up the tracking entry after 5 seconds
    setTimeout(() => {
      this.recentlyRemovedPlayers.delete(id);
    }, 5000);

    if (this.otherPlayerMap.has(id)) {
      const otherPlayer = this.otherPlayerMap.get(id);
      if (otherPlayer) {
        this.otherPlayers.remove(otherPlayer, true, true);
        this.otherPlayerMap.delete(id);
      }
    }

    // Also clean up any overlap tracking
    this.overlappingPlayers.delete(id);
    this.currentFrameOverlaps.delete(id);
  }

  private handlePlayerUpdated(id: string, player: PlayerState) {
    const otherPlayer = this.otherPlayerMap.get(id);
    if (otherPlayer) {
      otherPlayer.updateFromState(player);
    } else if (player.name) {
      // Check if this player was recently removed (prevents ghost players from race conditions)
      if (this.recentlyRemovedPlayers.has(id)) {
        console.log('[Game] Ignoring update for recently removed player:', id);
        return;
      }

      // Before adding, verify the player is still in the server state
      // (onChange can fire after onRemove, causing ghost players)
      const state = this.room.state as any;
      if (state.players?.has(id)) {
        // If we don't have this player yet, add them
        this.handlePlayerJoined(player, id);
      } else {
        console.log('[Game] Ignoring update for removed player:', id);
      }
    }
  }

  /**
   * Spawn player with custom avatar (using avatar compositor)
   */
  private async spawnWithAvatar() {
    if (!this.pendingPlayerData) {
      console.error('[Game] Cannot spawn - missing pendingPlayerData');
      return;
    }

    // Use avatarConfig or DEFAULT_AVATAR_CONFIG
    if (!this.avatarConfig) {
      console.log('[Game] No avatar config, using default');
      this.avatarConfig = { ...DEFAULT_AVATAR_CONFIG, id: `avatar_${Date.now()}` };
    }

    const { player, sessionId } = this.pendingPlayerData;
    const spawnX = player.x || 705;
    const spawnY = player.y || 500;

    try {
      // Re-initialize compositor with Game scene (in case avatar editor had it)
      avatarAssetLoader.initialize(this);
      avatarCompositor.initialize(this);

      // Try to compose avatar texture
      console.log('[Game] Composing avatar texture...');
      const textureKey = await avatarCompositor.composeAvatar(this.avatarConfig);
      avatarCompositor.createAnimations(textureKey);

      // Create player with composed texture
      this.myPlayer = this.add.myPlayer(spawnX, spawnY, textureKey, sessionId);
      this.myPlayer.setPlayerName(this.playerName);
      console.log('[Game] MyPlayer created with custom avatar:', textureKey);
    } catch (error) {
      console.error('[Game] Failed to compose avatar:', error);
      // Create player with placeholder texture - better than crashing
      const placeholderKey = '__avatar_error_placeholder__';
      if (!this.textures.exists(placeholderKey)) {
        const graphics = this.make.graphics({ add: false });
        graphics.fillStyle(0xff0000, 0.5);
        graphics.fillRect(0, 0, 32, 48);
        graphics.generateTexture(placeholderKey, 32, 48);
        graphics.destroy();
      }
      this.myPlayer = this.add.myPlayer(spawnX, spawnY, placeholderKey, sessionId);
      this.myPlayer.setPlayerName(this.playerName);
    }

    // Set camera to follow player
    this.cameras.main.startFollow(this.myPlayer, true);

    // Set up movement callback
    this.myPlayer.onMovementUpdate = (data: { x: number; y: number; anim: string }) => {
      this.room.send(0, data); // HubMessage.UPDATE_PLAYER = 0
    };

    // Send initial name to server
    this.room.send(1, { name: this.playerName }); // HubMessage.UPDATE_PLAYER_NAME = 1

    // Send avatar config to server (JSON serialized for sync to other players)
    if (this.avatarConfig) {
      this.room.send(6, { character: JSON.stringify(this.avatarConfig) }); // HubMessage.UPDATE_CHARACTER = 6
    }

    // Add collisions with ground
    const groundLayer = this.map.getLayer('Ground')?.tilemapLayer;
    if (groundLayer) {
      this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], groundLayer);
    }

    // Add collisions with all stored collidable object groups
    this.collidableGroups.forEach(group => {
      this.physics.add.collider([this.myPlayer, this.myPlayer.playerContainer], group);
    });

    // Add chair overlap detection
    this.physics.add.overlap(
      this.playerSelector,
      this.chairGroup,
      this.handleChairOverlap,
      undefined,
      this
    );

    // Add arcade cabinet overlap detection
    this.physics.add.overlap(
      this.playerSelector,
      this.cabinetGroup,
      this.handleCabinetOverlap,
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

    console.log('[Game] MyPlayer created at', spawnX, spawnY, 'with avatar');
    this.pendingPlayerData = null;
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

  /**
   * Create arcade cabinets programmatically at predefined positions.
   * Each cabinet represents a different game that can be launched.
   * gameType = the URL path on gamebuddies.io (e.g., 'schooled' → /schooled)
   *
   * DEBUG: Press F9 to enable drag mode, then drag cabinets to position them.
   * Console will log final positions when you drop them.
   */
  private createArcadeCabinets() {
    // All available games with their positions
    // gameType matches the URL path on gamebuddies.io
    // Use F9 debug mode to reposition, then update coordinates here
    const games = [
      // Row 1
      { gameType: 'schooled', gameName: 'Schooled!', x: 454, y: 547 },
      { gameType: 'primesuspect', gameName: 'Prime Suspect', x: 572, y: 547 },
      { gameType: 'bingo', gameName: 'Bingo Buddies', x: 690, y: 547 },
      { gameType: 'canvas-chaos', gameName: 'Canvas Chaos', x: 808, y: 547 },
      // Row 2
      { gameType: 'cluescale', gameName: 'ClueScale', x: 454, y: 647 },
      { gameType: 'thinkalike', gameName: 'Think Alike', x: 572, y: 647 },
      { gameType: 'lastbrain', gameName: 'Last Brain', x: 690, y: 647 },
      { gameType: 'badactor', gameName: 'Bad Actor', x: 808, y: 647 },
    ];

    games.forEach((game) => {
      const cabinet = new ArcadeCabinet(
        this,
        game.x,
        game.y,
        'arcade_cabinet',
        0,
        { gameType: game.gameType, gameName: game.gameName }
      );
      this.cabinetGroup.add(cabinet);
      cabinet.setDepth(game.y);
      this.add.existing(cabinet);
      this.setupCabinetDrag(cabinet, game.gameName);
    });

    // Debug text (hidden by default)
    this.debugText = this.add.text(10, 10, '', {
      fontSize: '16px',
      color: '#00ff00',
      backgroundColor: '#000000',
      padding: { x: 10, y: 5 }
    }).setScrollFactor(0).setDepth(10000).setVisible(false);

    console.log(`[Game] Created ${games.length} arcade cabinets. Press F9 to enable drag mode for positioning.`);
  }

  /**
   * Setup drag behavior for a cabinet (only active in debug mode)
   */
  private setupCabinetDrag(cabinet: ArcadeCabinet, name: string) {
    cabinet.setInteractive({ draggable: true, useHandCursor: true });

    this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
      if (!this.debugMode) return;
      if (gameObject === cabinet) {
        cabinet.setPosition(dragX, dragY);
        cabinet.setDepth(dragY);
        // Update debug text with current position
        this.debugText.setText(`Dragging ${name}: (${Math.round(dragX)}, ${Math.round(dragY)})`);
      }
    });

    this.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      if (!this.debugMode) return;
      if (gameObject === cabinet) {
        const x = Math.round(cabinet.x);
        const y = Math.round(cabinet.y);
        console.log(`%c[CABINET POSITION] ${name}: (${x}, ${y})`, 'color: #00ff00; font-weight: bold; font-size: 14px;');
        this.debugText.setText(`${name} placed at (${x}, ${y}) - check console for copy-paste values`);
      }
    });
  }

  /**
   * Toggle debug mode for cabinet positioning
   * Press F9 to enable/disable
   */
  private toggleDebugMode() {
    this.debugMode = !this.debugMode;
    this.debugText.setVisible(this.debugMode);

    if (this.debugMode) {
      this.debugText.setText('DEBUG MODE: Drag cabinets to position them. Press F9 to exit.');
      console.log('%c[DEBUG MODE ON] Drag arcade cabinets to reposition. Positions will be logged to console.', 'color: #ffff00; font-weight: bold;');
    } else {
      console.log('%c[DEBUG MODE OFF] Cabinet positions logged above. Update Game.ts with new coordinates.', 'color: #ffff00; font-weight: bold;');
      // Log all cabinet positions
      this.cabinetGroup.getChildren().forEach((child) => {
        const cab = child as ArcadeCabinet;
        console.log(`%c  ${cab.gameName}: (${Math.round(cab.x)}, ${Math.round(cab.y)})`, 'color: #00ff00;');
      });
    }
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

  private handleCabinetOverlap(
    _playerSelector: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    cabinetObj: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    const cabinet = cabinetObj as ArcadeCabinet;

    // Only show dialog if not already selecting this cabinet
    if (this.playerSelector.selectedItem !== cabinet) {
      // Clear previous selection dialog
      this.playerSelector.selectedItem?.clearDialogBox();

      // Set new selection and show dialog
      this.playerSelector.selectedItem = cabinet;
      cabinet.onOverlapDialog();
    }
  }

  private handlePlayersOverlap(
    _myPlayer: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    otherPlayer: Phaser.Types.Physics.Arcade.GameObjectWithBody
  ) {
    // Physics overlap is now only used for cabinet interaction detection
    // Conversation detection uses distance-based check in update() loop
    const other = otherPlayer as OtherPlayer;
    this.currentFrameOverlaps.add(other.playerId);
  }

  private drawConversationIndicators(): void {
    // MUST clear before drawing new frame
    this.conversationGraphics.clear();

    const state = this.room.state as any;
    if (!state.players) return;

    const conversations = new Map<string, { players: Array<{ x: number; y: number }>; locked: boolean }>();

    // Debug: Count players with conversations
    let playersWithConversation = 0;

    // Group players by conversationId
    state.players.forEach((player: any, _sessionId: string) => {
      if (!player.conversationId) return;

      playersWithConversation++;

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

    // Debug log every 5 seconds (to avoid spam)
    if (Date.now() % 5000 < 100) {
      console.log('[Game] Conversation state:', {
        totalPlayers: state.players.size,
        playersWithConversation,
        conversationsCount: conversations.size,
        stateConversationsCount: state.conversations?.size || 0
      });
    }

    // Draw indicator for each conversation
    conversations.forEach((conv, _convId) => {
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

      // Draw circle (red for locked, green for open)
      this.conversationGraphics.lineStyle(3, conv.locked ? 0xff6b6b : 0x4caf50, 0.6);
      this.conversationGraphics.strokeCircle(centerX, centerY, radius);

      // Fill with semi-transparent color
      this.conversationGraphics.fillStyle(conv.locked ? 0xff6b6b : 0x4caf50, 0.1);
      this.conversationGraphics.fillCircle(centerX, centerY, radius);
    });
  }

  update(t: number, dt: number) {
    // Skip player input while dialog or avatar editor is open
    if (this.myPlayer && this.cursors && !this.dialogOpen && !this.avatarEditorOpen) {
      this.myPlayer.update(this.cursors, this.keyE, this.playerSelector);
    }

    // Handle C key to open avatar editor (skip if dialog or editor open)
    if (this.keyC && Phaser.Input.Keyboard.JustDown(this.keyC) && !this.dialogOpen && !this.avatarEditorOpen) {
      this.openAvatarEditor();
    }

    // Handle E key interaction with arcade cabinets (skip if dialog or editor open)
    if (this.keyE && Phaser.Input.Keyboard.JustDown(this.keyE) && !this.dialogOpen && !this.avatarEditorOpen) {
      const selectedItem = this.playerSelector.selectedItem;
      if (selectedItem instanceof ArcadeCabinet) {
        // Get nearby players for the game launch
        // Use currentFrameOverlaps for immediate nearby detection (not the 750ms conversation threshold)
        const nearbyPlayers: string[] = [this.room.sessionId];
        this.currentFrameOverlaps.forEach((playerId) => {
          nearbyPlayers.push(playerId);
        });
        // Also include already connected conversation partners
        this.overlappingPlayers.forEach((playerId) => {
          if (!nearbyPlayers.includes(playerId)) {
            nearbyPlayers.push(playerId);
          }
        });

        // Get Hub room code to use as game room code
        const hubRoomCode = this.registry.get('roomCode') as string;

        // Emit cabinet interaction event
        phaserEvents.emit('cabinet:interact', {
          gameType: selectedItem.gameType,
          gameName: selectedItem.gameName,
          nearbyPlayers: nearbyPlayers,
          hubRoomCode: hubRoomCode
        });
        console.log('[Game] Cabinet interaction:', selectedItem.gameType, 'nearbyPlayers:', nearbyPlayers, 'hubRoomCode:', hubRoomCode);
      }
    }

    // Distance-based conversation detection (replaces physics overlap requirement)
    // Check distance to each player and trigger conversation when close enough for 750ms
    if (this.myPlayer) {
      const myX = this.myPlayer.x;
      const myY = this.myPlayer.y;
      const state = this.room.state as any;
      const myPlayerState = state.players?.get(this.room.sessionId);
      const myConversationId = myPlayerState?.conversationId || '';

      this.otherPlayerMap.forEach((otherPlayer, sessionId) => {
        const distance = calculateDistanceInTiles(myX, myY, otherPlayer.x, otherPlayer.y);
        const isCloseEnough = distance <= PROXIMITY.CONVERSATION_START;

        // Debug: Log distance periodically (every 5 seconds)
        if (t % 5000 < 100 && distance < 10) {
          console.log(`[Game] 📏 Distance to ${sessionId.slice(0, 8)}: ${distance.toFixed(1)} tiles (threshold: ${PROXIMITY.CONVERSATION_START}), isClose: ${isCloseEnough}, connected: ${otherPlayer.connected}`);
        }

        if (isCloseEnough) {
          // Mark as in proximity for this frame
          this.currentFrameOverlaps.add(sessionId);
          otherPlayer.resetDisconnectBuffer();

          // If not yet connected, accumulate time
          if (!otherPlayer.connected) {
            otherPlayer.updateProximityBuffer(dt);
            const shouldConnect = otherPlayer.checkProximityConnection();

            if (shouldConnect) {
              console.log('[Game] ✅ Distance threshold reached for', sessionId, 'distance:', distance.toFixed(1), 'tiles');
              this.overlappingPlayers.add(sessionId);

              // Only start conversation if not already in one
              if (!myConversationId) {
                console.log('[Game] 📤 Sending START_CONVERSATION to server...');
                this.room.send(4, { targetSessionId: sessionId });
                console.log('[Game] ✅ Sent START_CONVERSATION for', sessionId);
              } else {
                console.log('[Game] Already in conversation:', myConversationId);
              }
            }
          }
        }
      });
    }

    // Check for disconnections - players who were close but aren't now
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
        // Not close and never connected - reset proximity buffer
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
