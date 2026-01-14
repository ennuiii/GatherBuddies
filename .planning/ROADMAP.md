# Roadmap: GameBuddies Hub

## Overview

Integrate a SkyOffice-style 2D virtual world into the GameBuddies platform. Players navigate as avatars, chat via proximity video, and launch games through arcade cabinet portals. Uses Colyseus for world state (inside GameBuddieGamesServer) and GameBuddiesTemplate for client structure.

## Milestones

- ✅ [v1.0 MVP](milestones/v1.0-ROADMAP.md) (Phases 1-3) - SHIPPED 2026-01-14
- ✅ [v1.1 Avatar Customization](milestones/v1.1-ROADMAP.md) (Phases 4-6) - SHIPPED 2026-01-14
- 🚧 **v1.2 Avatar Polish** - Phases 7-8 (in progress)

## Completed Milestones

<details>
<summary>✅ v1.0 MVP (Phases 1, 1.5, 2, 3) - SHIPPED 2026-01-14</summary>

- [x] Phase 1: Foundation (2/2 plans) - completed 2026-01-12
- [x] Phase 1.5: Integration (3/3 plans) - completed 2026-01-12
- [x] Phase 2: Social Features (6/6 plans) - completed 2026-01-13
- [x] Phase 3: Game Integration (2/2 plans) - completed 2026-01-14

</details>

<details>
<summary>✅ v1.1 Avatar Customization (Phases 4-6) - SHIPPED 2026-01-14</summary>

- [x] Phase 4: LPC Asset Integration (1/1 plans) - completed 2026-01-14
- [x] Phase 5: Avatar Editor UI (1/1 plans) - completed 2026-01-14
- [x] Phase 6: First-Join & Persistence (1/1 plans) - completed 2026-01-14

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 2/2 | Complete | 2026-01-12 |
| 1.5. Integration | v1.0 | 3/3 | Complete | 2026-01-12 |
| 2. Social Features | v1.0 | 6/6 | Complete | 2026-01-13 |
| 3. Game Integration | v1.0 | 2/2 | Complete | 2026-01-14 |
| 4. LPC Asset Integration | v1.1 | 1/1 | Complete | 2026-01-14 |
| 5. Avatar Editor UI | v1.1 | 1/1 | Complete | 2026-01-14 |
| 6. First-Join & Persistence | v1.1 | 1/1 | Complete | 2026-01-14 |
| 7. LPC Reference Audit | v1.2 | 0/? | Not started | - |
| 8. UI/UX Implementation | v1.2 | 0/? | Not started | - |

## Notes

**v1.0 delivered:**
- Virtual 2D lobby world with Phaser3
- Proximity-based video chat with conversation isolation
- 4 preset avatar selection
- 8 arcade cabinet game portals with invite notifications
- Text chat with speech bubbles

**v1.1 delivered:**
- Full LPC-based avatar customization system
- Phaser-native avatar editor with live preview
- First-join customization flow with Quick Start option
- localStorage persistence with migration support
- Colyseus sync for multiplayer avatar updates

### 🚧 v1.2 Avatar Polish (In Progress)

**Milestone Goal:** Fix avatar creation to show only valid LPC combinations with clear UX feedback for incompatible options.

#### Phase 7: LPC Reference Audit & Manifest Alignment

**Goal**: Compare current AvatarManifest against LPC-Reference folder, identify all valid body/clothing/hair combinations that have required animations (idle, sit, run, walk)
**Depends on**: v1.1 complete
**Research**: Unlikely (internal folder structure analysis)
**Status**: Not started

Plans:
- [ ] 07-01: TBD (run /gsd:plan-phase 7 to break down)

#### Phase 8: UI/UX Implementation

**Goal**: Implement disabled options with tooltips explaining incompatibility, add error logging, validation feedback
**Depends on**: Phase 7
**Research**: Unlikely (internal UI patterns)
**Status**: Not started

Plans:
- [ ] 08-01: TBD (run /gsd:plan-phase 8 to break down)
