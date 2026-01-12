# Architecture

**Analysis Date:** 2026-01-12

## Pattern Overview

**Overall:** Monorepo with Multiple Full-Stack Game Applications

**Key Characteristics:**
- Monorepo containing independent game projects as submodules
- Each game: React SPA client + Express/Socket.io server
- Shared unified game server (`GameBuddieGamesServer`) for multiple games
- Real-time multiplayer via WebSockets (Socket.io)
- In-memory state (no persistent database by design)
- GameBuddies.io platform integrates all games

## Layers

**Platform Layer (Gamebuddies.io):**
- Purpose: Central hub/portal for all games
- Contains: Landing page, game launcher, user management
- Location: `Gamebuddies.Io/`
- Used by: End users to discover and launch games

**Game Client Layer:**
- Purpose: React SPAs providing game UI and user interaction
- Contains: React components, state management, Socket.io client
- Location: `*/client/` directories (e.g., `BingoBuddies/client/`, `ThinkAlike/client/`)
- Depends on: Server layer via WebSocket connections
- Key files: `*/client/src/App.tsx`, `*/client/src/stores/gameStore.ts`

**Game Server Layer:**
- Purpose: Game logic, room management, real-time synchronization
- Contains: Express routes, Socket.io handlers, game state managers
- Location: `*/server/` directories or unified `GameBuddieGamesServer/`
- Depends on: Socket.io for client communication, optional Supabase for persistence
- Key files: `GameBuddieGamesServer/core/server.ts`

**Shared Layer:**
- Purpose: Common types and utilities across client/server
- Contains: TypeScript type definitions
- Location: `*/shared/` directories, `shared/` root
- Used by: Both client and server code

## Data Flow

**Multiplayer Game Session:**

1. User opens game URL (via GameBuddies platform or direct link)
2. React client loads, connects to Socket.io server
3. User creates/joins room via Socket.io events
4. Server manages room state in-memory
5. Game actions emit Socket.io events → Server validates → Broadcasts to room
6. Clients update UI optimistically, reconcile with server state
7. Session tokens enable reconnection after disconnects
8. Room auto-cleanup after 2 hours of inactivity

**GameBuddies Integration Flow:**

1. Platform passes URL params: `room`, `name`, `playerId`, `role`
2. Game client detects params via `GameBuddiesIntegration` service
3. Game reports status back to platform via External Game Status API
4. Return button navigates back to GameBuddies platform

**State Management:**
- Server: In-memory via Manager classes (RoomManager, SessionManager)
- Client: Zustand stores or React state
- No database persistence (by design for simplicity)
- Optional Supabase integration for user data/analytics

## Key Abstractions

**RoomManager:**
- Purpose: Manages game rooms, player lifecycle, game state transitions
- Location: `*/server/src/managers/RoomManager.ts`
- Pattern: Singleton managing in-memory room map

**SessionManager:**
- Purpose: Handles player sessions and reconnection logic
- Location: `*/server/src/managers/SessionManager.ts`
- Pattern: Singleton with session token mapping

**SocketHandler:**
- Purpose: Processes Socket.io events, routes to managers
- Location: `*/server/src/services/SocketHandler.ts`
- Pattern: Event dispatcher with validation layer

**GameBuddiesIntegration:**
- Purpose: Detects platform context, handles communication
- Location: `*/client/src/services/GameBuddiesIntegration.js`
- Pattern: Service singleton with URL parameter detection

**Game Store (Client):**
- Purpose: Central UI state management
- Location: `*/client/src/stores/gameStore.ts`
- Pattern: Zustand store with Socket.io integration

## Entry Points

**Unified Game Server:**
- Location: `GameBuddieGamesServer/core/server.ts`
- Triggers: `npm run dev` or `npm start`
- Responsibilities: Start Express server, initialize Socket.io, register game handlers

**Game Clients:**
- Location: `*/client/src/main.tsx` or `*/client/src/index.tsx`
- Triggers: Vite dev server or built static files
- Responsibilities: Mount React app, establish Socket.io connection

**Individual Game Servers:**
- Location: `*/server/src/index.ts`
- Triggers: `npm run dev` in server directory
- Responsibilities: Game-specific server logic

## Error Handling

**Strategy:** Validate at boundaries, fail fast, broadcast errors to clients

**Patterns:**
- Joi/Zod schemas validate incoming Socket.io payloads
- Server validates before any state mutation
- Errors broadcast as error events to specific clients
- Clients show toast notifications for user-facing errors
- Console logging for development debugging

## Cross-Cutting Concerns

**Logging:**
- Console logging in development
- Server logs all Socket.io events
- No structured logging service (stdout for Render.com)

**Validation:**
- Joi schemas on server for Socket.io events
- Zod schemas for configuration parsing
- Input sanitization via React's default escaping (XSS prevention)

**Authentication:**
- Session tokens for reconnection
- Host verification for admin actions
- Optional Supabase auth for persistent accounts

**Security:**
- Helmet.js security headers
- CORS configuration
- Rate limiting on room creation and chat
- Input validation before broadcasting

**Real-time Sync:**
- Server is single source of truth
- Clients perform optimistic updates
- Full state sync on reconnection
- Periodic heartbeats detect connection issues

---

*Architecture analysis: 2026-01-12*
*Update when major patterns change*
