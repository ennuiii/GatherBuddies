# GameBuddies Hub

## What This Is

A virtual 2D lobby world where players walk around as avatars, interact via proximity-based video chat, and launch into GameBuddies games together through portal zones. Built by integrating SkyOffice's Phaser3+Colyseus virtual world into the GameBuddies platform infrastructure.

## Core Value

**Social game launching** - Players meet organically in a shared virtual space and form groups to play games together, rather than clicking through menus alone.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GameBuddies Platform                          │
├─────────────────────────────────────────────────────────────────┤
│  Hub Client (GameBuddiesTemplate structure)                      │
│  ├── HomePage - Create/join hub room                             │
│  ├── LobbyPage - Standard lobby (video chat, player list)        │
│  └── GamePage - Phaser3 2D world canvas                          │
│        ├── Avatar movement with WASD/arrows                      │
│        ├── Proximity video chat (PeerJS)                         │
│        └── Portal zones → window.open(gamebuddies.io/gamename)   │
├─────────────────────────────────────────────────────────────────┤
│  GameBuddieGamesServer (unified backend)                         │
│  ├── Socket.IO - Room management, WebRTC signaling               │
│  ├── Colyseus - 2D world state sync (hub only)                   │
│  │     └── HubRoom - Player positions, animations                │
│  └── Shared httpServer (Express)                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Integration Points:**
1. **Colyseus inside GameBuddieGamesServer** - Shares httpServer with Socket.IO
2. **Hub as GamePlugin** - Uses Socket.IO namespace for room flow, Colyseus for world state
3. **GameBuddiesTemplate client** - Standard create/join/lobby flow, Phaser in GamePage
4. **Portal zones** - Simple URL navigation to gamebuddies.io/gamename

## Requirements

### Validated

- SkyOffice codebase exists with working Phaser3 + Colyseus + PeerJS stack
- GameBuddiesTemplate provides client architecture (pages, components, contexts)
- GameBuddieGamesServer provides unified backend with plugin system

### Active

- [ ] Colyseus server integrated into GameBuddieGamesServer
- [ ] Hub as a game plugin with Colyseus room for 2D state
- [ ] Client using GameBuddiesTemplate structure
- [ ] Phaser3 2D world in GamePage component
- [ ] Avatar movement with keyboard controls
- [ ] Multiplayer position sync via Colyseus
- [ ] Proximity-based video chat (PeerJS, from template WebRTC)
- [ ] Portal zones with game launching via URL
- [ ] Preset avatar selection
- [ ] Text chat with dialog bubbles

### Out of Scope (v1)

- Persistent accounts/profiles - Session-based like current games
- Custom avatar creation - Use preset avatars, defer to v2
- Embedded whiteboards - Not needed for game hub
- Screen sharing - Not relevant for game launching
- Private hub instances - Focus on shared public hub

## Context

**Source Projects:**

- `SkyOffice/` - Reference for Phaser3 world implementation
  - Phaser3 scenes (Bootstrap, Game)
  - Character classes (MyPlayer, OtherPlayer)
  - Colyseus rooms and schemas
  - Proximity detection algorithms

- `GameBuddiesTemplate/` - Client architecture to follow
  - Pages: HomePage, LobbyPage, GamePage
  - Components: core/, lobby/, video/
  - Contexts: WebRTCContext, ThemeContext
  - Services: socketService, gameBuddiesSession

- `GameBuddieGamesServer/` - Server to extend
  - UnifiedGameServer class
  - GamePlugin interface
  - RoomManager, SessionManager
  - Existing game plugins as reference

## Constraints

- **Hosting**: Must work on Render.com free tier (512MB RAM limit)
- **Server Integration**: Colyseus INSIDE GameBuddieGamesServer (not separate)
- **Client Structure**: Follow GameBuddiesTemplate patterns
- **Assets**: Use SkyOffice LimeZu assets with attribution
- **Browser**: Desktop browsers only (mobile deferred)

## Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| Colyseus inside GameBuddieGamesServer | Single server, shared infrastructure, easier deployment | Confirmed |
| Hub client from GameBuddiesTemplate | Consistent UX, reuse video/lobby components | Confirmed |
| Phaser3 in GamePage component | Template pattern - HomePage→LobbyPage→GamePage | Confirmed |
| Portal zones via URL navigation | Simple implementation, no complex bridging | Confirmed |
| Socket.IO for room flow, Colyseus for world | Template handles room creation, Colyseus handles positions | Confirmed |

## Migration from Current Implementation

The current `GameBuddiesHub/` has standalone Colyseus server and Phaser client. Migration path:

1. **Server**: Move Colyseus setup into GameBuddieGamesServer
2. **Client**: Restructure to use GameBuddiesTemplate pages/components
3. **Reuse**: Keep Phaser scenes, character classes, animations

---
*Last updated: 2026-01-12 - Architecture revised for proper integration*
