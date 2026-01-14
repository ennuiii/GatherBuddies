# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-14)

**Core value:** Social game launching - Players meet organically in a shared virtual space and form groups to play games together
**Current focus:** v1.2 Avatar Polish — Fix avatar creation to show only valid LPC combinations

## Current Position

Phase: 7 of 8 (LPC Reference Audit & Manifest Alignment)
Plan: 1 of 1 in current phase
Status: Phase complete
Last activity: 2026-01-14 — Completed 07-01-PLAN.md

Progress: █████░░░░░ 50% (1 of 2 phases complete)

## v1.2 Scope

**Milestone Goal:** Fix avatar creation to show only valid LPC combinations with clear UX feedback

**Features:**
- LPC Reference Alignment: Audit manifest against LPC-Reference folder
- Body Type Filtering: Fix missing options (e.g., male tops)
- Animation Validation: Only show items with idle/sit/run/walk
- Disabled Options UX: Gray out with tooltips (not hidden)
- Error Logging: Proper error tracking for debugging

**Constraints:**
- Must check against C:\GameBuddiesProject\LPC-Reference folder
- Only combinations with idle/sit/run/walk animations valid
- Maintain backward compatibility with existing saved avatars

## Shipped Milestones

### v1.1 Avatar Customization (2026-01-14)

**Delivered:** Full LPC-based avatar customization replacing preset avatars

### v1.0 MVP (2026-01-14)

**Delivered:** Virtual 2D lobby world with proximity video chat and game launching

## Key Decisions (v1.1)

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 4 | Placeholder-then-swap pattern for OtherPlayer | Prevents blocking player join on async avatar loading |
| 4 | Event-based character updates | Allows Game.ts to handle async composition without coupling |
| 4 | AvatarManifest as source of truth | Centralizes all avatar options |
| 5 | C key for editor (not E) | E already used for chair/cabinet interactions |
| 5 | Scene overlay pattern | Editor launches as overlay to preserve game state |
| 6 | Force editor on first join | Players must customize or quick-start |
| 6 | Quick Start option | Users who want to play immediately can skip |
| 6 | Config migration | Old saved avatars automatically upgraded |

## Session Continuity

Last session: 2026-01-14
Stopped at: Completed 07-01-PLAN.md (Phase 7 complete)
Resume: Run /gsd:plan-phase 8 to create Phase 8 plans

## Research Findings (v1.2)

Key discoveries from Phase 7 research:

1. **Root Cause**: Manifest only includes `tshirt` for tops, which only has female/teen assets
2. **LPC Structure**: Sheet definitions have `layer_1` object with body type keys - presence/absence determines support
3. **Extended Animations**: Items with `animations` array have idle/sit/run/walk; others only have walk
4. **Male Tops Available**: `longsleeve`, `shortsleeve`, `sleeveless` have male assets but NO extended animations
5. **Male Extended Tops**: Only `shortsleeve_polo` has male support WITH extended animations

See: `.planning/phases/07-lpc-reference-audit/07-RESEARCH.md` for full analysis

## Roadmap Evolution

- v1.0 MVP shipped: 2026-01-14 (Phases 1-3, 13 plans)
- v1.1 Avatar Customization shipped: 2026-01-14 (Phases 4-6, 3 plans)
- v1.2 Avatar Polish created: 2026-01-14 (Phases 7-8)

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
