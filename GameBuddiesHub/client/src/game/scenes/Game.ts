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

    // Set up camera
    this.cameras.main.zoom = 1.5;

    // Set up Colyseus state listeners
    this.setupColyseusListeners();

    console.log('[Game] Scene created, waiting for players from Colyseus');
  }

  private setupColyseusListeners() {
    const state = this.room.state as any;

    // Listen for player additions
    state.players.onAdd((player: PlayerState, sessionId: string) => {
      console.log('[Game] Player added:', sessionId, player.name);

      if (sessionId === this.room.sessionId) {
        // This is the local player
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
    });

    // Listen for player removals
    state.players.onRemove((_player: PlayerState, sessionId: string) => {
      console.log('[Game] Player removed:', sessionId);
      this.handlePlayerLeft(sessionId);
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

  update(_t: number, _dt: number) {
    if (this.myPlayer && this.cursors) {
      this.myPlayer.update(this.cursors);
    }
  }
}
