# Roadmap: GameBuddies Hub

## Overview

Transform the SkyOffice virtual office codebase into a social game launching hub where players navigate a 2D world as avatars, communicate via proximity video chat, and launch GameBuddies games together through portal zones.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Foundation** - Extract SkyOffice core, establish Phaser3 world with avatar movement
- [ ] **Phase 2: Social Features** - Proximity video chat, text chat, online players UI
- [ ] **Phase 3: Game Integration** - Portal zones and GameBuddieGamesServer bridge for game launching

## Phase Details

### Phase 1: Foundation
**Goal**: Working Phaser3 2D world with tile-based avatar movement and Colyseus state sync
**Depends on**: Nothing (first phase)
**Research**: Completed (SkyOffice architecture analyzed)
**Plans**: 2 plans

Plans:
- [ ] 01-01: Server foundation - Colyseus setup with HubRoom
- [ ] 01-02: Client foundation - Phaser world with avatar movement

Key deliverables:
- Extracted and cleaned SkyOffice core
- Phaser3 game rendering with tilemap
- Avatar sprites with movement controls
- Colyseus server for multiplayer state sync
- Basic room joining flow

### Phase 2: Social Features
**Goal**: Proximity-based communication enabling players to meet and chat naturally
**Depends on**: Phase 1
**Research**: Likely (PeerJS/WebRTC integration)
**Research topics**: PeerJS connection flow, proximity detection algorithms, SkyOffice video chat implementation
**Plans**: TBD

Key deliverables:
- Proximity detection (trigger when avatars near each other)
- Video/audio chat via PeerJS WebRTC
- Text chat with speech bubbles over avatars
- Online players list UI
- Preset avatar selection

### Phase 3: Game Integration
**Goal**: Portal zones that launch GameBuddies games with nearby players
**Depends on**: Phase 2
**Research**: Likely (Colyseus-Socket.io bridge)
**Research topics**: GameBuddieGamesServer API, room creation patterns, player handoff between servers, URL parameter conventions
**Plans**: TBD

Key deliverables:
- Portal zone tiles on the map
- Portal interaction UI (game selection, ready check)
- Bridge between Colyseus hub and Socket.io game server
- Game launch with player group
- Return-to-hub flow after game ends

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/2 | Ready to execute | - |
| 2. Social Features | 0/TBD | Not started | - |
| 3. Game Integration | 0/TBD | Not started | - |
