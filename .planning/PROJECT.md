# GameBuddies Hub

## What This Is

A virtual 2D lobby world where players walk around as avatars, interact via proximity-based video chat, and launch into GameBuddies games together through arcade cabinet portals. Built with Phaser3 for the 2D world, Colyseus for real-time state sync, and WebRTC for video/audio communication.

## Core Value

**Social game launching** - Players meet organically in a shared virtual space and form groups to play games together, rather than clicking through menus alone.

## Architecture

```
+-----------------------------------------------------------------+
|                    GameBuddies Platform                          |
+-----------------------------------------------------------------+
|  Hub Client (GameBuddiesTemplate structure)                      |
|  +-- HomePage - Create/join hub room                             |
|  +-- LobbyPage - Standard lobby (video chat, player list)        |
|  +-- GamePage - Phaser3 2D world canvas                          |
|        +-- Avatar movement with WASD/arrows                      |
|        +-- Proximity video chat (WebRTC)                         |
|        +-- Arcade cabinets -> window.open(gamebuddies.io/game)   |
+-----------------------------------------------------------------+
|  GameBuddieGamesServer (unified backend)                         |
|  +-- Socket.IO - Room management, WebRTC signaling               |
|  +-- Colyseus - 2D world state sync (hub only)                   |
|  |     +-- HubRoom - Player positions, animations                |
|  +-- Shared httpServer (Express)                                 |
+-----------------------------------------------------------------+
```

**Key Integration Points:**
1. **Colyseus inside GameBuddieGamesServer** - Shares httpServer with Socket.IO
2. **Hub as GamePlugin** - Uses Socket.IO namespace for room flow, Colyseus for world state
3. **GameBuddiesTemplate client** - Standard create/join/lobby flow, Phaser in GamePage
4. **Arcade cabinets** - URL navigation to gamebuddies.io/gamename with invite notifications

## Requirements

### Validated

- Colyseus server integrated into GameBuddieGamesServer - v1.0
- Hub as a game plugin with Colyseus room for 2D state - v1.0
- Client using GameBuddiesTemplate structure - v1.0
- Phaser3 2D world in GamePage component - v1.0
- Avatar movement with keyboard controls - v1.0
- Multiplayer position sync via Colyseus - v1.0
- Proximity-based video chat (WebRTC, from template) - v1.0
- Arcade cabinet game launching via URL - v1.0
- Preset avatar selection (4 characters) - v1.0
- Text chat with dialog bubbles - v1.0
- Avatar customization system (body, skin, hair, clothing) - v1.1
- LPC asset compositing with live preview - v1.1
- First-join avatar editor with Quick Start option - v1.1
- Avatar persistence via localStorage with migration - v1.1

### Active

- [ ] Additional game integrations beyond BingoBuddies
- [ ] Mobile touch controls
- [ ] Room capacity management

### Out of Scope (v1)

- Persistent accounts/profiles - Session-based like current games
- Embedded whiteboards - Not needed for game hub
- Screen sharing - Not relevant for game launching
- Private hub instances - Focus on shared public hub

## Context

**Current State (v1.1 shipped):**
- ~103,800 lines TypeScript across Hub client and server
- Tech stack: React, Vite, Phaser3, Colyseus, Socket.IO, WebRTC
- Full LPC-based avatar customization with body/skin/hair/clothing
- Phaser-native avatar editor with live preview
- 8 arcade cabinet game portals
- Proximity video chat with conversation isolation

**Source Projects:**

- `SkyOffice/` - Reference for Phaser3 world implementation
- `GameBuddiesTemplate/` - Client architecture followed
- `GameBuddieGamesServer/` - Server extended with Colyseus

## Constraints

- **Hosting**: Must work on Render.com free tier (512MB RAM limit)
- **Server Integration**: Colyseus INSIDE GameBuddieGamesServer (not separate)
- **Client Structure**: Follow GameBuddiesTemplate patterns
- **Assets**: Use SkyOffice LimeZu assets with attribution
- **Browser**: Desktop browsers only (mobile deferred)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Colyseus inside GameBuddieGamesServer | Single server, shared infrastructure, easier deployment | Good |
| Hub client from GameBuddiesTemplate | Consistent UX, reuse video/lobby components | Good |
| Phaser3 in GamePage component | Template pattern - HomePage->LobbyPage->GamePage | Good |
| Arcade cabinets via URL navigation | Simple implementation, no complex bridging | Good |
| Socket.IO for room flow, Colyseus for world | Template handles room creation, Colyseus handles positions | Good |
| 750ms debounce for proximity | Stable connections, prevents flickering | Good |
| Higher sessionId initiates P2P | Prevents duplicate WebRTC connections | Good |
| Hub room code as game room code | Avoids CORS issues with cross-origin API calls | Good |
| Games open in new tab | Preserves Hub session while playing game | Good |
| Web Audio API gain-based routing | Clean conversation isolation without track manipulation | Good |
| Placeholder-then-swap for avatar loading | Prevents blocking player join on async composition | Good |
| AvatarManifest as centralized source | Single source of truth for all avatar options | Good |
| C key for avatar editor | E key already used for interactions | Good |
| Scene overlay pattern for editor | Preserves game state during customization | Good |
| Force editor on first join | Ensures all players have custom avatars | Good |
| Quick Start option | Respects users who want to play immediately | Good |
| localStorage with migration | Backward compatible with old avatar configs | Good |

---
*Last updated: 2026-01-14 after v1.1 milestone*
