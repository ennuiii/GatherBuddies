# GameBuddies Hub

## What This Is

A virtual 2D lobby world where players walk around as avatars, interact via proximity-based video chat, and launch into GameBuddies games together through portal zones. Built by combining SkyOffice's virtual office architecture (Phaser3 + Colyseus + PeerJS) with the GameBuddies platform infrastructure.

## Core Value

**Social game launching** - Players meet organically in a shared virtual space and form groups to play games together, rather than clicking through menus alone.

## Requirements

### Validated

- SkyOffice codebase exists with working Phaser3 + Colyseus + PeerJS stack
- GameBuddiesTemplate provides reference architecture for game integration
- GameBuddieGamesServer provides unified backend infrastructure

### Active

- [ ] 2D world with tile-based avatar movement (from SkyOffice)
- [ ] Proximity-based video chat - start video when near other players (from SkyOffice/PeerJS)
- [ ] Room/zone system for different areas of the hub
- [ ] Portal zones that launch games with nearby players
- [ ] Integration with GameBuddieGamesServer for game launching
- [ ] Preset avatar selection (no customization yet)
- [ ] Text chat with dialog bubbles
- [ ] Basic lobby UI showing online players

### Out of Scope

- Persistent accounts/profiles — Keep session-based like current games for v1
- Custom avatar creation — Use preset avatars, defer customization to v2
- Embedded whiteboards — Nice SkyOffice feature but not needed for game hub
- Screen sharing — Not relevant for game launching context
- Private room creation UI — Focus on shared public hub first

## Context

**Source Projects:**
- `SkyOffice/` - Virtual office with Phaser3, Colyseus, React, PeerJS
  - Phaser3 for 2D world rendering and physics
  - Colyseus v0.14 for real-time state sync
  - PeerJS for WebRTC video/audio
  - React/Redux for UI layer
  - Tile-based movement, proximity detection

- `GameBuddiesTemplate/` - Reference game implementation
  - Standard client/server structure
  - GameBuddies platform integration patterns
  - WebRTC video chat component

- `GameBuddieGamesServer/` - Unified game backend
  - Express + Socket.io (will need Colyseus adapter or bridge)
  - Game room management
  - Player session handling

**Key Technical Decisions Ahead:**
- How Colyseus (SkyOffice) integrates with Socket.io (GameBuddieGamesServer)
- Whether hub runs as separate Colyseus server or integrates into unified server
- How portal zones trigger game room creation and player handoff

## Constraints

- **Hosting**: Must work on Render.com free tier (512MB RAM limit)
- **Server Integration**: Must integrate with or extend GameBuddieGamesServer
- **Tech Stack**: Uses Colyseus (from SkyOffice) - need to bridge with existing Socket.io infrastructure
- **Assets**: Use SkyOffice assets (LimeZu pixel art) with attribution
- **Browser Only**: Desktop browsers only (mobile not supported, matching SkyOffice)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Base on SkyOffice architecture | Has working Phaser3 + Colyseus + PeerJS stack for virtual worlds | — Pending |
| Use Colyseus for hub state | SkyOffice already uses it, better state sync for persistent worlds | — Pending |
| Portal zones for game launch | More immersive than menu-based, fits virtual world metaphor | — Pending |
| Preset avatars only for v1 | Reduces scope, can add customization later | — Pending |

---
*Last updated: 2026-01-12 after initialization*
