# Roadmap: GameBuddies Hub

## Overview

Integrate a SkyOffice-style 2D virtual world into the GameBuddies platform. Players navigate as avatars, chat via proximity video, and launch games through arcade cabinet portals. Uses Colyseus for world state (inside GameBuddieGamesServer) and GameBuddiesTemplate for client structure.

## Milestones

- ✅ [v1.0 MVP](milestones/v1.0-ROADMAP.md) (Phases 1-3) - SHIPPED 2026-01-14
- 🚧 **v1.1 Avatar Customization** - Phases 4-6 (in progress)

## Completed Milestones

<details>
<summary>✅ v1.0 MVP (Phases 1, 1.5, 2, 3) - SHIPPED 2026-01-14</summary>

- [x] Phase 1: Foundation (2/2 plans) - completed 2026-01-12
- [x] Phase 1.5: Integration (3/3 plans) - completed 2026-01-12
- [x] Phase 2: Social Features (6/6 plans) - completed 2026-01-13
- [x] Phase 3: Game Integration (2/2 plans) - completed 2026-01-14

</details>

### 🚧 v1.1 Avatar Customization (In Progress)

**Milestone Goal:** Replace preset avatars with full LPC-based customization system allowing players to customize body type, clothing, hair, and shoes.

#### Phase 4: LPC Asset Integration ✓

**Goal**: Load and composite avatar layers (body, clothing, hair, shoes) into animated spritesheets
**Depends on**: v1.0 complete
**Research**: Unlikely (assets exist, internal compositing patterns)
**Status**: Complete (2026-01-14)

Plans:
- [x] 04-01: Asset manifest + OtherPlayer composition + live updates

#### Phase 5: Avatar Editor UI ✓

**Goal**: Phaser-based customization scene with category tabs and live preview
**Depends on**: Phase 4
**Research**: Unlikely (following existing CharacterSelect pattern)
**Status**: Complete (2026-01-14)

Plans:
- [x] 05-01: AvatarEditorScene with tabs, live preview, and game integration

#### Phase 6: First-Join & Persistence

**Goal**: Force customization on first join, save/load from localStorage, sync to Colyseus server
**Depends on**: Phase 5
**Research**: Unlikely (localStorage + Colyseus sync, internal patterns)
**Plans**: TBD

Plans:
- [ ] 06-01: TBD (run /gsd:plan-phase 6 to break down)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 2/2 | Complete | 2026-01-12 |
| 1.5. Integration | v1.0 | 3/3 | Complete | 2026-01-12 |
| 2. Social Features | v1.0 | 6/6 | Complete | 2026-01-13 |
| 3. Game Integration | v1.0 | 2/2 | Complete | 2026-01-14 |
| 4. LPC Asset Integration | v1.1 | 1/1 | Complete | 2026-01-14 |
| 5. Avatar Editor UI | v1.1 | 1/1 | Complete | 2026-01-14 |
| 6. First-Join & Persistence | v1.1 | 0/? | Not started | - |

## Notes

**v1.0 delivered:**
- Virtual 2D lobby world with Phaser3
- Proximity-based video chat with conversation isolation
- 4 preset avatar selection
- 8 arcade cabinet game portals with invite notifications
- Text chat with speech bubbles

**v1.1 constraints:**
- Use LPC assets already in public/assets/avatars/
- Keep editor in Phaser (not React modal) for consistency
- Support all existing character animations (walk, idle for 4 directions)
- Existing avatar services may need adaptation for Phaser approach
