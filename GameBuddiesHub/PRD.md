# GatherBuddies - Product Requirements Document

> **Target Location:** `E:\GamebuddiesPlatform\GatherBuddies\docs\PRD.md`

## Executive Summary

GatherBuddies is a Gather.town-inspired virtual space platform integrated into the GameBuddies ecosystem. It combines the proven plugin architecture of GameBuddieGamesServer with Phaser 3 game rendering, proximity-based video chat, and collaborative virtual office features.

---

## 1. Project Overview

### 1.1 Vision
Create an immersive 2D virtual space where users can move avatars, interact through proximity-based video/audio, collaborate in private rooms, and customize their environment - all within the existing GameBuddies platform.

### 1.2 Key Differentiators from Reference Projects

| Feature | SkyOffice | gather-clone | GatherBuddies (Ours) |
|---------|-----------|--------------|---------------------|
| Game Engine | Phaser 3 | Pixi.js | **Phaser 3** (better 2D game support) |
| Backend | Colyseus | Socket.IO | **Socket.IO** (existing infrastructure) |
| Video | PeerJS | Agora | **WebRTC Context** (existing) |
| Database | None | Supabase | **Supabase** (persistent rooms) |
| Integration | Standalone | Standalone | **GameBuddies Platform** |

### 1.3 Target Users
- GameBuddies streamers hosting virtual hangouts
- Remote teams wanting casual interaction spaces
- Friends playing games together between sessions
- Event organizers for virtual gatherings

---

## 2. Technical Architecture

### 2.1 Integration with GameBuddies Platform

```
GamebuddiesPlatform/
├── GameBuddieGamesServer/
│   └── games/
│       └── gather-buddies/           # NEW GAME PLUGIN
│           ├── plugin.ts             # GamePlugin implementation
│           ├── types.ts              # TypeScript interfaces
│           ├── schemas.ts            # Zod validation schemas
│           ├── MapManager.ts         # Map loading & collision
│           ├── ProximityManager.ts   # Audio/video proximity
│           └── constants.ts          # Grid size, ranges, etc.
├── client/
│   └── src/
│       ├── games/
│       │   └── gather-buddies/       # NEW CLIENT MODULE
│       │       ├── GatherGame.tsx    # Main Phaser container
│       │       ├── scenes/           # Phaser scenes
│       │       ├── sprites/          # Avatar, object sprites
│       │       ├── ui/               # React overlays (chat, menus)
│       │       └── hooks/            # useMap, useProximity, etc.
│       └── adapters/
│           └── gatherAdapter.ts      # Webcam/video integration
└── shared/
    └── gather-buddies/
        └── maps/                     # JSON map definitions
```

### 2.2 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Game Rendering | **Phaser 3** (WebGL) | Mature 2D engine, excellent tilemap support, proven in SkyOffice |
| UI Layer | **React** (existing) | Consistent with GameBuddies, overlays on Phaser canvas |
| Styling | **Tailwind CSS** (existing) | Consistent with GameBuddies client |
| Real-time | **Socket.IO** (existing) | Already integrated, handles reconnection |
| Video/Audio | **WebRTCContext** (existing) | Already handles peer connections |
| State | **Phaser + React Context** | Phaser for game state, React for UI state |
| Pathfinding | **EasyStar.js** | Lightweight A* for click-to-move |
| Persistence | **Supabase** | Room state, maps, avatars |

### 2.3 Database Schema (Supabase)

```sql
-- Persistent rooms that survive server restarts
CREATE TABLE gather_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  owner_id UUID NOT NULL,
  map_id UUID REFERENCES gather_maps(id),
  settings JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom maps created by users
CREATE TABLE gather_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  layers JSONB NOT NULL,            -- { background, collision, foreground }
  objects JSONB DEFAULT '[]',       -- MapObject[]
  areas JSONB DEFAULT '[]',         -- PrivateArea[]
  spawns JSONB DEFAULT '[]',        -- Position[]
  portals JSONB DEFAULT '[]',       -- Portal[]
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User avatar configurations (persisted across sessions)
CREATE TABLE gather_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  config JSONB NOT NULL,            -- AvatarConfig
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room membership and last positions
CREATE TABLE gather_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES gather_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_x INTEGER,
  last_y INTEGER,
  last_direction INTEGER DEFAULT 0,
  role VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- Chat message history (optional, for room chat)
CREATE TABLE gather_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES gather_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'room',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_rooms_code ON gather_rooms(code);
CREATE INDEX idx_rooms_owner ON gather_rooms(owner_id);
CREATE INDEX idx_maps_owner ON gather_maps(owner_id);
CREATE INDEX idx_messages_room ON gather_messages(room_id, created_at DESC);
CREATE INDEX idx_members_room ON gather_room_members(room_id);
CREATE INDEX idx_members_user ON gather_room_members(user_id);
```

### 2.4 Persistence Flow

```typescript
// Room lifecycle with persistence
class GatherPersistenceService {
  private supabase: SupabaseClient;

  // Load room from database on join
  async loadRoom(roomCode: string): Promise<GatherRoom | null> {
    const { data: room } = await this.supabase
      .from('gather_rooms')
      .select(`*, map:gather_maps(*)`)
      .eq('code', roomCode)
      .single();

    if (!room) return null;

    return {
      id: room.id,
      code: room.code,
      name: room.name,
      map: this.parseMapData(room.map),
      settings: room.settings,
    };
  }

  // Save room state periodically (every 30s of activity)
  async saveRoomState(room: GatherRoom): Promise<void> {
    await this.supabase
      .from('gather_rooms')
      .update({
        settings: room.settings,
        updated_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
      })
      .eq('id', room.id);
  }

  // Save map edits immediately
  async saveMap(mapId: string, mapData: MapData): Promise<void> {
    await this.supabase
      .from('gather_maps')
      .update({
        layers: mapData.layers,
        objects: mapData.objects,
        areas: mapData.areas,
        spawns: mapData.spawns,
        portals: mapData.portals,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mapId);
  }

  // Save player position on disconnect
  async savePlayerPosition(
    roomId: string,
    userId: string,
    position: { x: number; y: number; direction: number }
  ): Promise<void> {
    await this.supabase
      .from('gather_room_members')
      .upsert({
        room_id: roomId,
        user_id: userId,
        last_x: position.x,
        last_y: position.y,
        last_direction: position.direction,
        last_seen_at: new Date().toISOString(),
      });
  }

  // Load user's avatar across all rooms
  async loadAvatar(userId: string): Promise<AvatarConfig | null> {
    const { data } = await this.supabase
      .from('gather_avatars')
      .select('config')
      .eq('user_id', userId)
      .single();

    return data?.config ?? null;
  }

  // Save avatar customization
  async saveAvatar(userId: string, config: AvatarConfig): Promise<void> {
    await this.supabase
      .from('gather_avatars')
      .upsert({
        user_id: userId,
        config,
        updated_at: new Date().toISOString(),
      });
  }
}
```

### 2.5 Server Architecture

```typescript
// games/gather-buddies/plugin.ts
export const gatherBuddiesPlugin: GamePlugin = {
  id: 'gather-buddies',
  name: 'GatherBuddies',
  version: '1.0.0',
  namespace: '/gather',
  basePath: '/gather',

  defaultSettings: {
    maxPlayers: 50,
    mapId: 'default-office',
    enableVideo: true,
    enableAudio: true,
    proximityRange: 5,        // tiles
    privateAreaBlocking: true
  },

  // Game state structure
  gameState: {
    phase: 'active',          // Always active once room exists
    data: {
      map: MapData,
      players: Map<playerId, PlayerState>,
      objects: MapObject[],
      areas: PrivateArea[],
      chat: ChatMessage[]
    }
  }
};
```

---

## 3. Core Features

### 3.1 Map System

#### 3.1.1 Map Structure
```typescript
interface MapData {
  id: string;
  name: string;
  width: number;              // In tiles (not pixels)
  height: number;
  tileSize: number;           // Default: 32px

  layers: {
    background: TileLayer;    // Floor textures
    collision: boolean[][];   // Walkable grid
    objects: MapObject[];     // Furniture, decorations
    foreground: TileLayer;    // Above-player elements
  };

  spawns: Position[];         // Spawn points
  portals: Portal[];          // Teleport zones
  areas: PrivateArea[];       // Named zones
}
```

#### 3.1.2 Map Editor (MVP - Host Feature)

Full in-browser map creation and editing for room hosts:

```typescript
interface MapEditorState {
  mode: 'select' | 'paint' | 'erase' | 'zone' | 'object';
  selectedTool: EditorTool;
  selectedTile?: TileType;
  selectedObject?: CatalogItem;
  gridVisible: boolean;
  snapToGrid: boolean;
  zoom: number;
  history: MapEdit[];          // Undo/redo stack
}

enum EditorTool {
  POINTER = 'pointer',         // Select & move objects
  FLOOR_PAINT = 'floor',       // Paint floor tiles
  WALL_PAINT = 'wall',         // Paint wall tiles
  ERASER = 'eraser',           // Remove tiles/objects
  ZONE_RECT = 'zone',          // Draw rectangular zones
  OBJECT_PLACE = 'object',     // Place from catalog
  SPAWN_POINT = 'spawn',       // Mark spawn locations
  PORTAL = 'portal',           // Create teleport links
}
```

**Editor UI Components:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ [Save] [Undo] [Redo] | Zoom: [−][100%][+] | Grid [✓] | Test [▶]     │
├────────┬────────────────────────────────────────────────────────────┤
│ TOOLS  │                                                            │
│ ──────── │                                                           │
│ [Pointer]│                                                           │
│ [Floor]  │              Map Canvas (Phaser)                         │
│ [Wall]   │              with editing overlays                        │
│ [Eraser] │                                                           │
│ [Zone]   │                                                           │
│ [Object] │                                                           │
│ [Spawn]  │                                                           │
│ [Portal] │                                                           │
├────────┼────────────────────────────────────────────────────────────┤
│ PALETTE│ Floor Tiles: [grass][wood][carpet][tile][...]              │
│ ──────── │ Wall Tiles: [brick][glass][hedge][stone][...]             │
│         │ Objects: [desk][chair][plant][TV][...]                     │
└────────┴────────────────────────────────────────────────────────────┘
```

**Object Catalog (Placeable Items):**
```typescript
interface CatalogItem {
  id: string;
  name: string;
  category: CatalogCategory;
  sprite: string;              // Asset URL
  width: number;               // Tiles wide
  height: number;              // Tiles tall
  isImpassable: boolean;       // Blocks movement
  interactionType: ObjectInteraction;
  variants?: CatalogItemVariant[];
}

enum CatalogCategory {
  FURNITURE = 'furniture',     // Desks, tables, shelves
  SEATING = 'seating',         // Chairs, couches, benches
  DECOR = 'decor',             // Plants, art, rugs
  TECH = 'tech',               // TVs, computers, screens
  NATURE = 'nature',           // Trees, rocks, water
  WALLS = 'walls',             // Wall segments, dividers
  SPECIAL = 'special',         // Portals, spawn points
}
```

**Map Size Options:**
- Small: 30x30 tiles (cozy room)
- Medium: 50x50 tiles (office space)
- Large: 80x60 tiles (event venue)
- Custom: Up to 100x100 tiles

#### 3.1.3 Starter Templates

Pre-built maps to help hosts get started quickly:

1. **Blank Canvas** - Empty room, just floor and walls
2. **Cozy Office** - Small team space with desks and meeting area
3. **Event Stage** - Auditorium layout with stage and seating
4. **Outdoor Park** - Nature theme with trees and paths
5. **Gaming Den** - Casual space with gaming setups

### 3.2 Avatar System

#### 3.2.1 Avatar Components
```typescript
interface AvatarConfig {
  skin: string;               // Base body sprite
  hair: string;               // Hair style/color
  top: string;                // Shirt/jacket
  bottom: string;             // Pants/skirt
  shoes: string;
  accessories: string[];      // Hat, glasses, etc.

  colors: {
    skin: string;             // Hex color
    hair: string;
    clothing: string;
  };
}
```

#### 3.2.2 Animation States
- **Idle** - 2-frame breathing animation
- **Walk** - 4-frame walk cycle
- **Sit** - Static sitting pose
- **Emotes** - Wave, dance, thumbs up (4+ frames each)

#### 3.2.3 Layered Runtime Composition (Selected Approach)

Full Gather.town-style customization with separate sprite sheets per component:

```typescript
// Avatar sprite composition at runtime
interface AvatarSpriteConfig {
  layers: {
    body: string;           // Base body sprite sheet
    hair: string;           // Hair overlay
    facialHair?: string;    // Optional beard/mustache
    top: string;            // Shirt/jacket layer
    bottom: string;         // Pants/skirt layer
    shoes: string;          // Footwear layer
    accessories: string[];  // Hat, glasses, etc.
  };

  colors: {
    skin: string;           // Tint applied to body
    hair: string;           // Tint applied to hair
    primary: string;        // Tint for clothing
    secondary: string;      // Secondary clothing color
  };
}

// Sprite sheet format per layer:
// - 4 directions (down, right, up, left)
// - 4 animations (idle, walk, sit, emote)
// - 4 frames per animation
// = 64 frames per layer (8x8 grid, 32x32 each)

// Runtime composition approach:
class AvatarCompositor {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;

  compose(config: AvatarSpriteConfig, frame: number): ImageBitmap {
    // Clear canvas
    this.ctx.clearRect(0, 0, 32, 32);

    // Draw layers in order with color tinting
    this.drawLayer('body', config.layers.body, config.colors.skin, frame);
    this.drawLayer('bottom', config.layers.bottom, config.colors.primary, frame);
    this.drawLayer('shoes', config.layers.shoes, null, frame);
    this.drawLayer('top', config.layers.top, config.colors.primary, frame);
    if (config.layers.facialHair) {
      this.drawLayer('facialHair', config.layers.facialHair, config.colors.hair, frame);
    }
    this.drawLayer('hair', config.layers.hair, config.colors.hair, frame);
    for (const acc of config.accessories) {
      this.drawLayer('accessory', acc, null, frame);
    }

    return this.canvas.transferToImageBitmap();
  }
}
```

**Sprite Asset Requirements:**
- Body base: 5 skin tone variants
- Hair styles: 20+ options (each colorable)
- Facial hair: 8 options
- Tops: 30+ shirts, jackets, dresses
- Bottoms: 20+ pants, skirts
- Shoes: 10+ options
- Hats: 15+ options
- Glasses: 10+ options
- Other accessories: 20+ misc items

**Color Palette:**
```typescript
const SKIN_TONES = ['#FFDFC4', '#F0C8A0', '#D4A574', '#8D5524', '#4A2C17'];
const HAIR_COLORS = ['#FFFFFF', '#808080', '#F5DEB3', '#8B4513', '#FFA500', '#FF6347', '#FFB6C1', '#87CEEB', '#32CD32', '#000000'];
const CLOTHING_COLORS = ['#FF0000', '#FF4500', '#FFD700', '#ADFF2F', '#00FF00', '#00CED1', '#1E90FF', '#8A2BE2', '#FF69B4', '#FFDAB9', '#FFFFFF', '#808080', '#000000'];
```

### 3.3 Movement System

#### 3.3.1 Controls
```typescript
// Keyboard movement (primary)
const CONTROLS = {
  UP: ['W', 'ArrowUp'],
  DOWN: ['S', 'ArrowDown'],
  LEFT: ['A', 'ArrowLeft'],
  RIGHT: ['D', 'ArrowRight'],
  INTERACT: ['E', 'Space'],
  SIT: ['X'],
  EMOTE_MENU: ['Q']
};

// Click-to-move (secondary)
onMapClick(x, y) {
  const path = pathfinder.findPath(player.x, player.y, x, y);
  player.followPath(path);
}
```

#### 3.3.2 Movement Parameters
```typescript
const MOVEMENT = {
  TILE_SIZE: 32,              // Pixels per tile
  WALK_SPEED: 160,            // Pixels per second
  RUN_SPEED: 280,             // Hold Shift
  UPDATE_RATE: 100,           // ms between position broadcasts
  INTERPOLATION: true         // Smooth remote player movement
};
```

#### 3.3.3 Collision Detection
- Grid-based collision from `MapData.layers.collision`
- Object collision from `MapObject.isImpassable`
- Player-to-player collision: disabled (walk through each other)

### 3.4 Proximity System

#### 3.4.1 Proximity Ranges
```typescript
const PROXIMITY = {
  VIDEO_FULL: 3,              // Tiles - full video/audio
  VIDEO_FADE: 6,              // Tiles - fading video/audio
  VIDEO_OFF: 7,               // Tiles - no connection

  CHAT_BUBBLE: 8,             // Tiles - show chat bubbles
  NAME_TAG: 15,               // Tiles - show name tags
};
```

#### 3.4.2 Proximity Calculation
```typescript
function calculateProximity(player1: Position, player2: Position): ProximityLevel {
  const distance = Math.sqrt(
    Math.pow(player1.x - player2.x, 2) +
    Math.pow(player1.y - player2.y, 2)
  );

  if (distance <= PROXIMITY.VIDEO_FULL) return 'full';
  if (distance <= PROXIMITY.VIDEO_FADE) {
    const fade = (distance - VIDEO_FULL) / (VIDEO_FADE - VIDEO_FULL);
    return { level: 'fade', volume: 1 - fade };
  }
  return 'none';
}
```

#### 3.4.3 Private Area Handling
- Players in same private area: always connected (full audio/video)
- Players in different private areas: no connection
- Private area overrides proximity distance

### 3.5 Video/Audio Integration

#### 3.5.1 WebRTC Integration
```typescript
// Leverage existing WebRTCContext
const {
  localStream,
  remoteStreams,
  connectToPeer,
  disconnectFromPeer,
  setVolume
} = useWebRTC();

// Proximity-based connection management
useEffect(() => {
  const nearbyPlayers = calculateNearbyPlayers(myPosition, allPlayers);

  // Connect to new nearby players
  nearbyPlayers.forEach(player => {
    if (!connectedPeers.has(player.id)) {
      connectToPeer(player.id);
    }
  });

  // Disconnect from far players
  connectedPeers.forEach(peerId => {
    if (!nearbyPlayers.find(p => p.id === peerId)) {
      disconnectFromPeer(peerId);
    }
  });
}, [myPosition, allPlayers]);
```

#### 3.5.2 Video Display
- Floating video bubbles above avatars
- Picture-in-picture for focused conversations
- Mute/unmute controls in UI overlay
- Screen share to in-world object (TV, monitor)

### 3.6 Chat System

#### 3.6.1 Chat Modes
1. **Proximity Chat** - Visible to nearby players (bubble above head)
2. **Room Chat** - Visible to all players in room (sidebar)
3. **Private Chat** - DMs between two players (popup)

#### 3.6.2 Chat Message Structure
```typescript
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'proximity' | 'room' | 'private';
  targetId?: string;          // For private messages
  timestamp: number;
  position?: Position;        // For proximity bubbles
}
```

### 3.7 Interactive Objects

#### 3.7.1 Object Types
```typescript
enum ObjectInteraction {
  NONE = 0,                   // Decoration only
  SIT = 1,                    // Chair, couch
  EMBED = 2,                  // Website iframe
  VIDEO = 3,                  // YouTube embed
  WHITEBOARD = 4,             // Collaborative drawing
  GAME = 5,                   // Mini-game portal
  PORTAL = 6,                 // Teleport to location
  NOTE = 7                    // Text popup
}
```

#### 3.7.2 Object Interaction Flow
```
Player approaches object → "E to interact" prompt appears
Player presses E → Object-specific action triggers
  - SIT: Player avatar sits, camera follows
  - EMBED: Modal opens with iframe
  - VIDEO: In-world video player activates
  - PORTAL: Player teleports to target
```

---

## 4. Data Models

### 4.1 Server State

```typescript
// Room.gameState.data structure
interface GatherGameState {
  map: MapData;

  players: Map<string, GatherPlayerState>;

  objects: MapObject[];

  areas: PrivateArea[];

  chat: {
    room: ChatMessage[];      // Last 100 messages
    proximity: Map<string, ChatMessage[]>;  // Per-area
  };

  activeInteractions: Map<string, ObjectInteraction>;
}

interface GatherPlayerState {
  id: string;
  name: string;
  x: number;                  // Tile position
  y: number;
  direction: Direction;       // 0=down, 1=right, 2=up, 3=left
  avatar: AvatarConfig;
  status: 'active' | 'away' | 'busy';
  currentArea?: string;       // Private area ID if in one
  sitting?: string;           // Object ID if sitting
  lastUpdate: number;
}
```

### 4.2 Socket Events

```typescript
// Client → Server
interface ClientEvents {
  'gather:move': { x: number; y: number; direction: Direction };
  'gather:chat': { content: string; type: ChatType; targetId?: string };
  'gather:interact': { objectId: string };
  'gather:emote': { emoteId: string };
  'gather:status': { status: PlayerStatus; message?: string };
  'gather:avatar': { avatar: AvatarConfig };
}

// Server → Client
interface ServerEvents {
  'gather:state': GatherGameState;          // Full state sync
  'gather:playerMove': { id: string; x: number; y: number; direction: Direction };
  'gather:playerJoin': GatherPlayerState;
  'gather:playerLeave': { id: string };
  'gather:chat': ChatMessage;
  'gather:objectUpdate': MapObject;
  'gather:proximity': ProximityUpdate[];    // Who's nearby
}
```

---

## 5. User Interface

### 5.1 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] GatherBuddies          [Users: 12] [Settings] [Leave]    │
├─────────────────────────────────────────────────────────────────┤
│                                                        ┌───────┐│
│                                                        │ Mini  ││
│                    Phaser Game Canvas                  │ Map   ││
│                    (Full viewport)                     │       ││
│                                                        └───────┘│
│  ┌──────────┐                                                   │
│  │ Video    │                                                   │
│  │ Bubbles  │                                                   │
│  │ (nearby) │                                                   │
│  └──────────┘                                                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [Chat input...                                    ] [Send] [😀] │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 UI Components

1. **TopBar** - Room name, player count, settings, leave button
2. **GameCanvas** - Phaser 3 canvas (full viewport)
3. **MiniMap** - Top-right corner, shows player positions
4. **VideoBubbles** - Floating webcam feeds for nearby players
5. **ChatBar** - Bottom of screen, expandable sidebar
6. **EmoteWheel** - Radial menu on Q press
7. **InteractionPrompt** - "Press E to..." tooltips
8. **PlayerList** - Sidebar with all players (expandable)

### 5.3 Modals

- **Avatar Customizer** - Full avatar editing
- **Settings** - Audio/video controls, keybinds
- **Map Selector** - Choose different maps (host only)
- **Object Inspector** - View/interact with embedded content

---

## 6. Implementation Phases

### Phase 1: Core Foundation
**Goal:** Basic movement and rendering

**Server:**
- [ ] Create `gather-buddies` plugin skeleton following template pattern
- [ ] Define types.ts with all TypeScript interfaces
- [ ] Create schemas.ts with Zod validation
- [ ] Implement MapManager for tile-based collision
- [ ] Set up Supabase tables and migrations
- [ ] Implement GatherPersistenceService

**Client:**
- [ ] Set up Phaser 3 in React container (GatherGame.tsx)
- [ ] Create BootScene for asset loading
- [ ] Create GameScene for main gameplay loop
- [ ] Implement tile-based map rendering
- [ ] Basic avatar sprite rendering (single pre-made avatar)
- [ ] Keyboard movement (WASD + arrow keys)
- [ ] Grid collision detection
- [ ] Position sync via Socket.IO
- [ ] Remote player interpolation (smooth movement)

**Deliverable:** Players can move around a map and see each other in real-time

### Phase 2: Avatar System & Customization
**Goal:** Full component-based avatar system

**Assets:**
- [ ] Create/acquire base body sprite sheets (5 skin tones)
- [ ] Create/acquire hair sprite sheets (20+ styles)
- [ ] Create/acquire clothing sprite sheets (tops, bottoms, shoes)
- [ ] Create/acquire accessory sprites (hats, glasses)

**Client:**
- [ ] Implement AvatarCompositor class (runtime sprite composition)
- [ ] Build AvatarEditor modal UI
- [ ] Color picker for hair, skin, clothing
- [ ] Avatar preview with animations
- [ ] Save avatar to Supabase

**Server:**
- [ ] Avatar persistence endpoints
- [ ] Avatar broadcast on player join

**Deliverable:** Players can fully customize their appearance

### Phase 3: Map Editor
**Goal:** Host can create and edit maps

**Client:**
- [ ] MapEditor scene/mode toggle
- [ ] Tool palette UI (floor, walls, objects, zones)
- [ ] Tile painting with brush sizes
- [ ] Object placement from catalog
- [ ] Zone painting (private areas, spawns)
- [ ] Undo/redo stack
- [ ] Grid overlay toggle
- [ ] Map save to Supabase

**Server:**
- [ ] Map CRUD operations
- [ ] Map sharing/templates
- [ ] Real-time collaborative editing (optional)

**Assets:**
- [ ] Tileset sprites (floors: wood, grass, carpet, tile, etc.)
- [ ] Wall sprites (brick, glass, hedge, etc.)
- [ ] Object catalog (50+ items across categories)

**Deliverable:** Hosts can build custom spaces from scratch

### Phase 4: Proximity & Video Integration
**Goal:** Core interaction features

**Client:**
- [ ] Proximity calculation hook (useProximity)
- [ ] Integrate existing WebRTCContext
- [ ] Video bubble component (floating above avatars)
- [ ] Volume fading based on distance
- [ ] Private area video grouping
- [ ] Audio/video mute controls
- [ ] Video position tracking (follows avatar)

**Server:**
- [ ] ProximityManager class
- [ ] Private area detection
- [ ] Proximity broadcast events

**Deliverable:** Players can see/hear nearby players with proximity-based audio

### Phase 5: Chat & Interactions
**Goal:** Communication and object interaction

**Client:**
- [ ] Room chat sidebar (persistent messages)
- [ ] Proximity chat bubbles (floating above head)
- [ ] Chat input with emoji picker
- [ ] Interactive object system
- [ ] Sit mechanic (snap to chairs/couches)
- [ ] Emote wheel (Q key radial menu)
- [ ] "Press E to interact" prompts
- [ ] Object-specific modals (embed, video, note)

**Server:**
- [ ] Chat message persistence (Supabase)
- [ ] Object interaction events
- [ ] Emote broadcast

**Deliverable:** Full communication and rich object interaction

### Phase 6: Polish & Production
**Goal:** Complete, polished experience

**UX:**
- [ ] Mini-map component (corner overlay)
- [ ] Click-to-move pathfinding (EasyStar.js)
- [ ] Status indicators (away, busy, DND)
- [ ] Player list sidebar
- [ ] Settings modal (audio, video, keybinds)
- [ ] Loading screens and transitions

**Performance:**
- [ ] Sprite caching for composed avatars
- [ ] Viewport culling (don't render off-screen)
- [ ] Position update batching
- [ ] Memory profiling and optimization

**Audio:**
- [ ] Footstep sounds
- [ ] Interaction sounds
- [ ] Ambient background (optional)
- [ ] Notification sounds

**Deliverable:** Production-ready experience

### Phase 7: Advanced Features (Post-Launch)
**Goal:** Extended functionality

- [ ] Screen sharing to in-world TV objects
- [ ] Embedded whiteboards (collaborative drawing)
- [ ] Portal connections between rooms
- [ ] Custom object uploads (host feature)
- [ ] Streamer mode integration (GameBuddies platform)
- [ ] Mobile-friendly controls
- [ ] Map templates marketplace

---

## 7. Technical Specifications

### 7.1 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| FPS | 60fps | Phaser debug overlay |
| Position sync latency | <100ms | Round-trip measurement |
| Video latency | <200ms | WebRTC stats |
| Memory usage | <200MB | Chrome DevTools |
| Initial load | <3s | Lighthouse |
| Players per room | 50 | Load testing |

### 7.2 Browser Support

| Browser | Support Level |
|---------|---------------|
| Chrome 90+ | Full |
| Firefox 88+ | Full |
| Safari 14+ | Full (WebRTC limitations) |
| Edge 90+ | Full |
| Mobile browsers | Limited (no video) |

### 7.3 Network Requirements

- WebSocket connection (fallback to long-polling)
- WebRTC for peer-to-peer video (TURN fallback)
- ~50KB/s per active video stream
- ~5KB/s for position updates (50 players)

---

## 8. File Structure

### 8.1 Server Files

```
games/gather-buddies/
├── plugin.ts                 # Main GamePlugin export
├── types.ts                  # All TypeScript interfaces
├── schemas.ts                # Zod validation schemas
├── constants.ts              # TILE_SIZE, PROXIMITY ranges, etc.
├── MapManager.ts             # Map loading, collision queries
├── ProximityManager.ts       # Distance calculations, area detection
├── ChatManager.ts            # Message handling, history
├── ObjectManager.ts          # Interactive object logic
└── maps/
    ├── default-office.json
    ├── cozy-lounge.json
    └── event-hall.json
```

### 8.2 Client Files

```
games/gather-buddies/
├── GatherGame.tsx            # Main component, Phaser lifecycle
├── GatherGameContext.tsx     # React context for game state
├── scenes/
│   ├── BootScene.ts          # Asset loading
│   ├── GameScene.ts          # Main game loop
│   └── UIScene.ts            # Phaser UI elements
├── sprites/
│   ├── Avatar.ts             # Avatar sprite class
│   ├── MapObject.ts          # Interactive object class
│   └── ChatBubble.ts         # Floating chat text
├── ui/
│   ├── TopBar.tsx            # Header controls
│   ├── ChatBar.tsx           # Chat input/display
│   ├── MiniMap.tsx           # Position overview
│   ├── VideoBubbles.tsx      # Webcam feeds
│   ├── EmoteWheel.tsx        # Emote selector
│   ├── AvatarEditor.tsx      # Customization modal
│   └── SettingsModal.tsx     # Preferences
├── hooks/
│   ├── useGatherGame.ts      # Game state hook
│   ├── useProximity.ts       # Nearby player tracking
│   ├── useMovement.ts        # Input handling
│   └── useChat.ts            # Chat functionality
└── assets/
    ├── tilesets/             # Map tile images
    ├── avatars/              # Character sprites
    └── objects/              # Furniture sprites
```

---

## 9. API Reference

### 9.1 Socket Events (Client → Server)

| Event | Payload | Description |
|-------|---------|-------------|
| `gather:move` | `{ x, y, direction }` | Update player position |
| `gather:chat` | `{ content, type, targetId? }` | Send chat message |
| `gather:interact` | `{ objectId }` | Interact with object |
| `gather:emote` | `{ emoteId }` | Play emote animation |
| `gather:status` | `{ status, message? }` | Update status |
| `gather:avatar` | `{ avatar: AvatarConfig }` | Update avatar |

### 9.2 Socket Events (Server → Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `gather:state` | `GatherGameState` | Full state sync |
| `gather:playerMove` | `{ id, x, y, direction }` | Player movement |
| `gather:playerJoin` | `GatherPlayerState` | New player joined |
| `gather:playerLeave` | `{ id }` | Player left |
| `gather:chat` | `ChatMessage` | New chat message |
| `gather:proximity` | `ProximityUpdate[]` | Nearby players update |

---

## 10. Testing Strategy

### 10.1 Unit Tests
- MapManager collision detection
- ProximityManager distance calculations
- Avatar state transitions
- Chat message validation

### 10.2 Integration Tests
- Socket event round-trips
- Player join/leave flows
- WebRTC connection establishment
- Map loading and rendering

### 10.3 E2E Tests (Playwright)
- Player movement across map
- Video call between two players
- Chat message delivery
- Object interaction flows

### 10.4 Performance Tests
- 50 concurrent players
- Sustained 60fps rendering
- Memory stability over 1 hour

---

## 11. Resolved Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Game Engine | **Phaser 3** | Proven in SkyOffice, excellent tilemap support |
| Avatar System | **Component-based** | Full customization like Gather.town |
| Persistence | **Supabase** | Room state, maps, and avatars saved |
| Map Creation | **Visual Editor (MVP)** | Hosts can build from scratch |

## 12. Remaining Open Questions

1. **Avatar Assets**: Create custom sprites or license existing asset pack (e.g., LPC)?
2. **Monetization**: Premium avatars, maps, or features for future?
3. **Moderation**: Host controls (kick/ban), report system, content moderation?
4. **Authentication**: Use existing GameBuddies auth or separate?
5. **Mobile**: Touch controls and responsive UI or desktop-only for MVP?

---

## 13. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Concurrent users | 50+ per room | Server monitoring |
| Session duration | 30+ minutes avg | Analytics |
| Video activation | 70%+ of users | Feature tracking |
| Return rate | 40%+ weekly | User analytics |
| Performance | 60fps, <100ms latency | Monitoring |

---

## 14. Dependencies

### NPM Packages (New - Server)
```json
{
  "@supabase/supabase-js": "^2.39.0"
}
```
*Note: Supabase is already used in the DDF game, so this may already be installed*

### NPM Packages (New - Client)
```json
{
  "phaser": "^3.80.0",
  "easystarjs": "^0.4.4"
}
```

### Environment Variables (New)
```env
# Supabase (may already exist)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key  # Server-side only
```

### Asset Requirements

**Tilesets (32x32 per tile):**
- Floor types: wood, grass, carpet, tile, stone, water (10+ variants)
- Wall types: brick, glass, hedge, stone, office (8+ variants)
- Wall orientations: N, S, E, W, NE, NW, SE, SW corners

**Avatar Sprite Sheets (32x32 per frame, 8x8 grid = 64 frames each):**
- Body bases: 5 skin tone variants
- Hair: 20+ styles (colorable)
- Tops: 30+ shirts, jackets (colorable)
- Bottoms: 20+ pants, skirts (colorable)
- Shoes: 10+ styles
- Accessories: 30+ hats, glasses, misc

**Object Catalog (various sizes):**
- Furniture: desks, tables, shelves, bookcases (15+ items)
- Seating: chairs, couches, benches (10+ items)
- Decor: plants, art, rugs, lamps (20+ items)
- Tech: TVs, computers, whiteboards (10+ items)
- Nature: trees, rocks, water features (10+ items)

**Audio:**
- Footsteps (4 surface types)
- UI sounds (click, hover, notification)
- Interaction sounds (sit, open, close)
- Optional ambient loops

**Asset Sources (Recommendations):**
- [Liberated Pixel Cup (LPC)](https://lpc.opengameart.org/) - Free, extensive character generator
- [itch.io Asset Packs](https://itch.io/game-assets/tag-top-down) - Paid, high quality
- Custom creation with Aseprite or similar

---

## Appendix A: Reference Implementation Links

- **SkyOffice**: https://github.com/kevinshen56714/SkyOffice
- **gather-clone**: https://github.com/trevorwrightdev/gather-clone
- **Phaser 3 Docs**: https://photonstorm.github.io/phaser3-docs/
- **EasyStar.js**: https://github.com/prettymuchbryce/easystarjs
- **Supabase Docs**: https://supabase.com/docs
- **LPC Sprite Generator**: https://sanderfrenken.github.io/Universal-LPC-Spritesheet-Character-Generator/

## Appendix B: Verification & Testing

### Manual Testing Checklist

**Phase 1 Verification:**
1. Start server with `npm run dev` in GameBuddieGamesServer
2. Open browser to client, create a GatherBuddies room
3. Join room with second browser/incognito
4. Verify both players see each other
5. Move with WASD, verify smooth interpolation
6. Check collision against walls

**Phase 2 Verification:**
1. Open avatar editor
2. Customize all layers (hair, clothes, etc.)
3. Apply colors and verify preview
4. Save and verify persistence across sessions
5. Verify other players see your avatar

**Phase 3 Verification:**
1. Enter map editor mode as host
2. Paint floor tiles
3. Place wall tiles
4. Add objects from catalog
5. Create private zone
6. Add spawn point
7. Save map and reload room
8. Verify map persists

**Phase 4 Verification:**
1. Enable video/audio
2. Walk near another player
3. Verify video appears at proximity threshold
4. Walk away, verify video fades
5. Enter private zone together
6. Verify isolated audio

**Phase 5 Verification:**
1. Send room chat message
2. Send proximity chat (verify bubble)
3. Sit on chair
4. Use emote wheel
5. Interact with embedded object

### Automated Tests

```bash
# Run unit tests
npm test -- --filter=gather-buddies

# Run E2E tests (requires running server)
npx playwright test gather-buddies/
```

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Author: GatherBuddies Team*
*Based on Gather.town analysis and SkyOffice/gather-clone references*
