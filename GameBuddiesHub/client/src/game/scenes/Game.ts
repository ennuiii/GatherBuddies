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

// Character info for selection UI
interface CharacterInfo {
  key: string;
  name: string;
  description: string;
}

const CHARACTERS: CharacterInfo[] = [
  { key: 'adam', name: 'Adam', description: 'The friendly explorer. Always ready for adventure!' },
  { key: 'ash', name: 'Ash', description: 'Cool and collected. Natural born leader.' },
  { key: 'lucy', name: 'Lucy', description: 'Creative spirit. Brings joy wherever she goes!' },
  { key: 'nancy', name: 'Nancy', description: 'Strategic thinker. Always has a plan.' },
];

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
  private cabinetGroup!: Phaser.Physics.Arcade.StaticGroup;
  private selectedCharacter: string = 'adam';

  // Character selection UI state
  private characterSelectContainer!: Phaser.GameObjects.Container;
  private characterSelected: boolean = false;
  private selectionIndex: number = 0;
  private selectionCards: Phaser.GameObjects.Container[] = [];
  private pendingPlayerData: { player: PlayerState; sessionId: string } | null = null;

  // Debug mode for positioning objects
  private debugMode: boolean = false;
  private debugText!: Phaser.GameObjects.Text;

  // Dialog state - pause game input while dialog is open
  private dialogOpen: boolean = false;

  constructor() {
    super('game');
  }

  init() {
    // Get player name from registry (set by PhaserGame component)
    this.playerName = this.registry.get('playerName') || 'Player';
    // Reset selection state for new game
    this.characterSelected = false;
    this.selectionIndex = 0;
    this.selectedCharacter = 'adam';
    this.pendingPlayerData = null;
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

        // Store player data and show character selection
        this.pendingPlayerData = { player, sessionId };
        this.showCharacterSelection();
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

  // Character Selection UI Methods
  private showCharacterSelection() {
    const { width, height } = this.scale;

    // Create container for all selection UI (fixed to camera)
    this.characterSelectContainer = this.add.container(0, 0);
    this.characterSelectContainer.setScrollFactor(0);
    this.characterSelectContainer.setDepth(1000);

    // Semi-transparent background overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e, 0.92);
    this.characterSelectContainer.add(overlay);

    // Title
    const title = this.add.text(width / 2, 60, 'Choose Your Character', {
      fontSize: '28px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.characterSelectContainer.add(title);

    // Create character cards
    const cardWidth = 150;
    const cardHeight = 200;
    const spacing = 16;
    const totalWidth = CHARACTERS.length * cardWidth + (CHARACTERS.length - 1) * spacing;
    const startX = (width - totalWidth) / 2 + cardWidth / 2;

    this.selectionCards = [];
    CHARACTERS.forEach((char, index) => {
      const x = startX + index * (cardWidth + spacing);
      const y = height / 2 - 10;
      const card = this.createSelectionCard(x, y, cardWidth, cardHeight, char, index);
      this.selectionCards.push(card);
      this.characterSelectContainer.add(card);
    });

    // Highlight first card
    this.highlightSelectionCard(0);

    // Position button and instructions below the cards
    const cardBottomY = height / 2 - 10 + 100 + 20; // card center + half height + padding

    // Instructions
    const instructions = this.add.text(width / 2, cardBottomY + 20, 'Click a character or use arrow keys, then press Enter', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);
    this.characterSelectContainer.add(instructions);

    // Confirm button - positioned below instructions
    const btnY = cardBottomY + 60;
    const btnBg = this.add.rectangle(width / 2, btnY, 180, 45, 0x4caf50, 1)
      .setStrokeStyle(2, 0x66bb6a)
      .setInteractive({ useHandCursor: true });
    const btnText = this.add.text(width / 2, btnY, 'Start Game', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    btnBg.on('pointerdown', () => {
      console.log('[Game] Start Game clicked');
      this.confirmCharacterSelection();
    });
    btnBg.on('pointerover', () => btnBg.setFillStyle(0x66bb6a));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x4caf50));
    this.characterSelectContainer.add([btnBg, btnText]);

    // Keyboard navigation for selection
    this.input.keyboard!.on('keydown-LEFT', this.selectPreviousCharacter, this);
    this.input.keyboard!.on('keydown-RIGHT', this.selectNextCharacter, this);
    this.input.keyboard!.on('keydown-ENTER', this.confirmCharacterSelection, this);
    this.input.keyboard!.on('keydown-SPACE', this.confirmCharacterSelection, this);
  }

  private createSelectionCard(
    x: number,
    y: number,
    w: number,
    h: number,
    char: CharacterInfo,
    index: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.rectangle(0, 0, w, h, 0x2d2d44, 1).setStrokeStyle(3, 0x3d3d5c);

    // Character sprite with idle_down animation (front-facing)
    const sprite = this.add.sprite(0, -35, char.key, 18); // Frame 18 = first frame of idle_down
    sprite.setScale(2);
    sprite.play(`${char.key}_idle_down`);

    // Character name
    const nameText = this.add.text(0, 38, char.name, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Description
    const descText = this.add.text(0, 62, char.description, {
      fontSize: '10px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
      wordWrap: { width: w - 16 },
      align: 'center',
    }).setOrigin(0.5, 0);

    container.add([bg, sprite, nameText, descText]);
    container.setSize(w, h);
    container.setData('bg', bg);
    container.setData('index', index);

    // Make card clickable
    container.setInteractive({ useHandCursor: true });
    container.on('pointerdown', () => this.highlightSelectionCard(index));
    container.on('pointerover', () => {
      if (this.selectionIndex !== index) {
        bg.setStrokeStyle(3, 0x5d5d7c);
      }
    });
    container.on('pointerout', () => {
      if (this.selectionIndex !== index) {
        bg.setStrokeStyle(3, 0x3d3d5c);
      }
    });

    return container;
  }

  private highlightSelectionCard(index: number) {
    // Unhighlight previous
    if (this.selectionCards[this.selectionIndex]) {
      const prevBg = this.selectionCards[this.selectionIndex].getData('bg') as Phaser.GameObjects.Rectangle;
      prevBg.setStrokeStyle(3, 0x3d3d5c);
      prevBg.setFillStyle(0x2d2d44);
    }

    // Highlight new
    this.selectionIndex = index;
    const bg = this.selectionCards[index].getData('bg') as Phaser.GameObjects.Rectangle;
    bg.setStrokeStyle(3, 0x4caf50);
    bg.setFillStyle(0x3d3d5c);
  }

  private selectPreviousCharacter() {
    if (!this.characterSelected) {
      const newIndex = (this.selectionIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
      this.highlightSelectionCard(newIndex);
    }
  }

  private selectNextCharacter() {
    if (!this.characterSelected) {
      const newIndex = (this.selectionIndex + 1) % CHARACTERS.length;
      this.highlightSelectionCard(newIndex);
    }
  }

  private confirmCharacterSelection() {
    console.log('[Game] confirmCharacterSelection called, characterSelected:', this.characterSelected, 'pendingPlayerData:', !!this.pendingPlayerData);
    if (this.characterSelected || !this.pendingPlayerData) {
      console.log('[Game] Skipping - already selected or no pending data');
      return;
    }

    this.characterSelected = true;
    this.selectedCharacter = CHARACTERS[this.selectionIndex].key;
    console.log('[Game] Character selected:', this.selectedCharacter);

    // Remove keyboard listeners for selection
    this.input.keyboard!.off('keydown-LEFT', this.selectPreviousCharacter, this);
    this.input.keyboard!.off('keydown-RIGHT', this.selectNextCharacter, this);
    this.input.keyboard!.off('keydown-ENTER', this.confirmCharacterSelection, this);
    this.input.keyboard!.off('keydown-SPACE', this.confirmCharacterSelection, this);

    // Destroy selection UI
    this.characterSelectContainer.destroy();

    // Spawn the player
    this.spawnLocalPlayer();
  }

  private spawnLocalPlayer() {
    if (!this.pendingPlayerData) return;

    const { player, sessionId } = this.pendingPlayerData;
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

    console.log('[Game] MyPlayer created at', spawnX, spawnY, 'with character', this.selectedCharacter);
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

      // Draw circle (red for locked, green for open)
      this.conversationGraphics.lineStyle(3, conv.locked ? 0xff6b6b : 0x4caf50, 0.6);
      this.conversationGraphics.strokeCircle(centerX, centerY, radius);

      // Fill with semi-transparent color
      this.conversationGraphics.fillStyle(conv.locked ? 0xff6b6b : 0x4caf50, 0.1);
      this.conversationGraphics.fillCircle(centerX, centerY, radius);
    });
  }

  update(t: number, dt: number) {
    // Skip player input while dialog is open
    if (this.myPlayer && this.cursors && !this.dialogOpen) {
      this.myPlayer.update(this.cursors, this.keyE, this.playerSelector);
    }

    // Handle E key interaction with arcade cabinets (skip if dialog open)
    if (this.keyE && Phaser.Input.Keyboard.JustDown(this.keyE) && !this.dialogOpen) {
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
