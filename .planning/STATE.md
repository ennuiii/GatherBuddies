# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-12)

**Core value:** Social game launching - Players meet organically in a shared virtual space and form groups to play games together
**Current focus:** Phase 3 — Game Integration

## Current Position

Phase: 3 of 3 (Game Integration)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-01-13 — Completed 3-01-PLAN.md (Arcade Cabinet Portals)

Progress: ████████████ 92% (12 of 13 plans complete)

## Architecture Clarification (2026-01-12)

**Original approach (Phase 1):** Standalone Colyseus server + custom Phaser client
**Revised approach (Phase 1.5+):** Colyseus inside GameBuddieGamesServer + GameBuddiesTemplate client

Key integration points:
1. Colyseus on port 3002, Socket.IO on port 3001 (separate ports required)
2. Hub is a GamePlugin using Socket.IO for room flow + Colyseus for 2D world state
3. Client follows GameBuddiesTemplate structure (HomePage → LobbyPage → GamePage)
4. Portal zones launch games via URL navigation to gamebuddies.io/gamename

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: ~8 min
- Total execution time: ~96 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 2 | ~22 min | ~11 min |
| 1.5 | 3 | ~41 min | ~14 min |
| 2 | 6 | ~38 min | ~6 min |
| 3 | 1 | ~5 min | ~5 min |

**Recent Trend:**
- Last 6 plans: 2-02 (~4 min), 2-03 (~5 min), 2-04 (~5 min), 2-05 (~4 min), 2-06 (~12 min), 3-01 (~5 min)
- Trend: Fast autonomous execution with subagents

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Colyseus integrated INTO GameBuddieGamesServer (not separate server)
- Colyseus on port 3002, Socket.IO on port 3001 (separate ports)
- Hub client uses GameBuddiesTemplate structure
- Socket.IO for room management, Colyseus for 2D world state
- Portal zones launch games via simple URL navigation
- Phase 1 work (GameBuddiesHub/) kept as reference for migration
- Added experimentalDecorators to tsconfig for @colyseus/schema
- Hub client at port 5200 with /hub/ base path
- Phase 1 Phaser files backed up to src-phaser-backup/
- 750ms debounce for proximity connect/disconnect
- Higher sessionId initiates connection (prevents duplicates)
- phaserEvents for Phaser-to-React communication
- Web Audio API gain-based routing for conversation audio isolation

### Deferred Issues

None yet.

### Blockers/Concerns

None - All infrastructure ready for Phaser integration.

## Session Continuity

Last session: 2026-01-13
Stopped at: Completed 3-01-PLAN.md (Arcade Cabinet Portals)
Resume: Ready for 3-02-PLAN.md (Game Launch UI)

## What to Reuse from Phase 1

The standalone GameBuddiesHub/ implementation has been migrated:
- `server/rooms/HubRoom.ts` → ✅ GameBuddieGamesServer/games/hub/
- `client/src/scenes/` → ✅ Hub client src/game/scenes/
- `client/src/characters/` → ✅ Hub client src/game/characters/
- `client/src/anims/` → ✅ Hub client src/game/anims/
- `client/public/assets/` → ✅ Already in place

**Backup location:** `GameBuddiesHub/client/src-phaser-backup/`

## Files Created in 1.5-01

- `GameBuddieGamesServer/core/colyseus/ColyseusServer.ts`
- `GameBuddieGamesServer/games/hub/HubRoom.ts`
- `GameBuddieGamesServer/games/hub/Message.ts`
- `GameBuddieGamesServer/games/hub/schema/HubState.ts`
- `GameBuddieGamesServer/games/hub/index.ts`

## Files Created in 1.5-02

- `GameBuddiesHub/client/src/config/gameMeta.ts` (hub config)
- `GameBuddiesHub/client/src/services/colyseusService.ts`
- `GameBuddieGamesServer/games/hub/plugin.ts` (Socket.IO plugin)

## Current Architecture

```
Hub Client (port 5200)                    Server (ports 3001, 3002)
├── HomePage - Create/join room          ├── Socket.IO /hub namespace
├── LobbyPage - Video chat               │   └── games/hub/plugin.ts
└── GamePage - Phaser canvas             │
    └── PhaserGame.tsx                   └── Colyseus 'hub' room
        └── colyseusService.ts               └── games/hub/HubRoom.ts
            └── game/scenes/Game.ts
```
