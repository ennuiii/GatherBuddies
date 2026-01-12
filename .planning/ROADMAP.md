# Roadmap: GameBuddies Hub

## Overview

Integrate a SkyOffice-style 2D virtual world into the GameBuddies platform. Players navigate as avatars, chat via proximity video, and launch games through portal zones. Uses Colyseus for world state (inside GameBuddieGamesServer) and GameBuddiesTemplate for client structure.

## Architecture Summary

```
Client (GameBuddiesTemplate pattern)     Server (GameBuddieGamesServer)
├── HomePage (create/join)               ├── Socket.IO (room management)
├── LobbyPage (video chat)               ├── Colyseus (2D world state)
└── GamePage (Phaser3 world)             └── Shared Express httpServer
```

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation** - Standalone Colyseus server + Phaser client (COMPLETED but needs migration)
- [ ] **Phase 1.5: Integration** - Migrate to GameBuddieGamesServer + GameBuddiesTemplate structure
- [ ] **Phase 2: Social Features** - Proximity video chat, text chat, online players UI
- [ ] **Phase 3: Game Integration** - Portal zones and game launching via URLs

## Phase Details

### Phase 1: Foundation (COMPLETED - needs migration)
**Goal**: Working Phaser3 2D world with avatar movement and Colyseus state sync
**Status**: Complete but standalone - needs integration into platform

What was built:
- Standalone Colyseus server with HubRoom (GameBuddiesHub/server)
- Phaser3 client with Bootstrap/Game scenes (GameBuddiesHub/client)
- Character classes: Player, MyPlayer, OtherPlayer
- WASD/Arrow movement with animation
- Basic multiplayer position sync

Plans completed:
- [x] 01-01: Server foundation - Colyseus setup with HubRoom
- [x] 01-02: Client foundation - Phaser world with avatar movement

### Phase 1.5: Integration (NEW)
**Goal**: Migrate standalone implementation into GameBuddies platform infrastructure
**Depends on**: Phase 1
**Research**: May need to investigate Colyseus + Socket.IO coexistence
**Plans**: 3-4 plans

Key deliverables:
- Colyseus Server integrated into GameBuddieGamesServer
  - Add colyseus dependency
  - Share httpServer between Socket.IO and Colyseus
  - Create HubRoom for 2D world state
- Hub GamePlugin for Socket.IO namespace
  - Room creation/joining via template flow
  - Coordinates with Colyseus room
- Client restructured to GameBuddiesTemplate pattern
  - Copy template client structure
  - HomePage: create/join hub
  - LobbyPage: standard lobby with video
  - GamePage: Phaser3 canvas
- Reuse existing Phaser code (scenes, characters, animations)

### Phase 2: Social Features
**Goal**: Proximity-based communication enabling players to meet and chat naturally
**Depends on**: Phase 1.5
**Research**: Likely (proximity detection algorithms, PeerJS integration)
**Plans**: TBD

Key deliverables:
- Proximity detection (trigger when avatars near each other)
- Video/audio chat via WebRTC (reuse template's WebRTCContext)
- Text chat with speech bubbles over avatars
- Online players list UI
- Preset avatar selection

### Phase 3: Game Integration
**Goal**: Portal zones that launch GameBuddies games
**Depends on**: Phase 2
**Research**: Minimal (just URL navigation)
**Plans**: TBD

Key deliverables:
- Portal zone tiles on the map
- Portal interaction UI (press E to launch)
- URL navigation to gamebuddies.io/gamename
- Optional: group launching (all nearby players)

## Progress

**Execution Order:**
Phases execute in order: 1 → 1.5 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete (standalone) | 2026-01-12 |
| 1.5. Integration | 0/TBD | Not started | - |
| 2. Social Features | 0/TBD | Not started | - |
| 3. Game Integration | 0/TBD | Not started | - |

## Notes

**Migration Strategy:**
- Don't delete GameBuddiesHub/ - use as reference
- Copy Phaser code into new template-based client
- Move Colyseus room logic into GameBuddieGamesServer
- Test each piece as it's migrated

**What to Reuse from Phase 1:**
- `HubRoom` schema and logic → GameBuddieGamesServer/games/hub/
- `Bootstrap.ts`, `Game.ts` scenes → Hub client GamePage
- `Player.ts`, `MyPlayer.ts`, `OtherPlayer.ts` → Hub client characters/
- `CharacterAnims.ts` → Hub client anims/
- `Network.ts` → Adapt for Colyseus inside unified server
- Assets (tilemap, sprites) → Hub client public/
