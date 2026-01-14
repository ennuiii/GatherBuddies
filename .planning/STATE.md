# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-14)

**Core value:** Social game launching - Players meet organically in a shared virtual space and form groups to play games together
**Current focus:** v1.1 Avatar Customization — Phase 5 (Avatar Editor UI)

## Current Position

Phase: 5 of 6 (Avatar Editor UI)
Plan: 1 of 1 in current phase
Status: Phase complete
Last activity: 2026-01-14 — Completed 05-01-PLAN.md

Progress: ██████░░░░ 67% (2 of 3 phases complete)

## v1.1 Scope

**Milestone Goal:** Replace preset avatars with full LPC-based customization system

**Phases:**
- Phase 4: LPC Asset Integration - Load and composite avatar layers
- Phase 5: Avatar Editor UI - Phaser-based customization scene
- Phase 6: First-Join & Persistence - Force customization, save/load, sync

**Constraints:**
- Use LPC assets already in public/assets/avatars/
- Keep editor in Phaser (not React modal)
- Support all existing animations (walk, idle for 4 directions)

## Key Decisions (v1.1)

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 4 | Placeholder-then-swap pattern for OtherPlayer | Prevents blocking player join on async avatar loading |
| 4 | Event-based character updates | Allows Game.ts to handle async composition without coupling |
| 4 | AvatarManifest as source of truth | Centralizes all avatar options, avatar.ts re-exports for compatibility |
| 5 | C key for editor (not E) | E already used for chair/cabinet interactions |
| 5 | Scene overlay pattern | Editor launches as overlay to preserve game state |

## Session Continuity

Last session: 2026-01-14
Stopped at: Phase 5 complete
Resume: Ready for Phase 6 planning with /gsd:plan-phase 6

## Roadmap Evolution

- v1.0 MVP shipped: 2026-01-14 (Phases 1-3, 13 plans)
- v1.1 Avatar Customization created: 2026-01-14 (Phases 4-6)

## Architecture

```
Hub Client (port 5200)                    Server (ports 3001, 3002)
+-- HomePage - Create/join room          +-- Socket.IO /hub namespace
+-- LobbyPage - Video chat               |   +-- games/hub/plugin.ts
+-- GamePage - Phaser canvas             |
    +-- PhaserGame.tsx                   +-- Colyseus 'hub' room
        +-- colyseusService.ts               +-- games/hub/HubRoom.ts
            +-- game/scenes/Game.ts
```
