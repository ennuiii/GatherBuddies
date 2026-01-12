# Codebase Structure

**Analysis Date:** 2026-01-12

## Directory Layout

```
GameBuddiesProject/
├── .planning/              # GSD planning documents
├── BingoBuddies/           # Bingo game (git submodule)
├── Bomberman/              # Bomberman game (standalone)
├── CanvasChaos/            # Canvas-based game (git submodule)
├── ClueScale/              # Clue-based game (git submodule)
├── DDF/                    # Dance/gesture game (git submodule)
├── GameBuddieGamesServer/  # Unified backend server (git submodule)
├── Gamebuddies.Io/         # Main platform website (git submodule)
├── GameBuddiesTemplate/    # Template for new games
├── RetroArcade/            # Retro arcade collection
├── SchoolQuizGame/         # "Schooled" quiz game (git submodule)
├── SkyOffice/              # Virtual office game
├── SUSD/                   # Task Master AI integration (git submodule)
├── ThinkAlike/             # Word sync game (git submodule)
├── shared/                 # Root shared utilities
├── CLAUDE.md               # Root AI assistant documentation
└── docs/                   # Documentation
```

## Directory Purposes

**BingoBuddies/**
- Purpose: Custom bingo card game with multiplayer support
- Contains: `client/` (React), `server/` (Express), `shared/` (types)
- Key files: `client/src/stores/gameStore.ts`, `server/src/managers/RoomManager.ts`
- Structure: Standard client/server/shared monorepo

**GameBuddieGamesServer/**
- Purpose: Unified backend server for multiple games
- Contains: `core/` (server core), `games/` (game-specific handlers)
- Key files: `core/server.ts`, `playwright.config.ts`
- Structure: Core + plugins architecture

**Gamebuddies.Io/**
- Purpose: Main GameBuddies platform website
- Contains: `client/` (React), `server/` (Express)
- Key files: Game launcher, user portal
- Structure: Standard client/server

**GameBuddiesTemplate/**
- Purpose: Template for creating new games
- Contains: Complete boilerplate with WebRTC video chat
- Key files: `client/src/components/WebcamDisplay.tsx`
- Structure: Reference implementation

**SchoolQuizGame/**
- Purpose: Educational quiz game ("Schooled")
- Contains: Combined client/server in single package
- Key files: `src/App.tsx`, `server/index.js`
- Structure: Create React App with embedded server

**ThinkAlike/**
- Purpose: 1v1 word synchronization game
- Contains: `client/` (React with Three.js)
- Key files: `client/src/App.tsx`, 3D components
- Structure: Client-only with shared server

## Key File Locations

**Entry Points:**
- `GameBuddieGamesServer/core/server.ts` - Unified server entry
- `*/client/src/main.tsx` - Vite-based client entry
- `*/client/src/index.tsx` - CRA-based client entry
- `SchoolQuizGame/server/index.js` - Quiz game server

**Configuration:**
- `*/tsconfig.json` - TypeScript config per project
- `*/client/vite.config.ts` - Vite build config
- `*/client/tailwind.config.js` - Tailwind customization
- `*/client/postcss.config.js` - PostCSS plugins
- `.env` files (gitignored) - Environment variables

**Core Logic:**
- `*/server/src/managers/RoomManager.ts` - Room management
- `*/server/src/managers/SessionManager.ts` - Session handling
- `*/server/src/services/SocketHandler.ts` - Socket.io events
- `*/client/src/stores/gameStore.ts` - Client state (Zustand)

**Integration:**
- `*/client/src/services/GameBuddiesIntegration.js` - Platform integration
- `*/client/src/components/GameBuddiesReturnButton.tsx` - Return navigation
- `*/server/src/services/gameBuddiesService.js` - Server-side integration

**Testing:**
- `GameBuddieGamesServer/playwright.config.ts` - E2E test config
- `GameBuddieGamesServer/tests/` - Test files
- `SchoolQuizGame/src/**/*.test.*` - Unit tests (CRA)

**Documentation:**
- `CLAUDE.md` - Root AI documentation
- `*/CLAUDE.md` or `*/claude.md` - Per-project AI docs
- `docs/` - Additional documentation

## Naming Conventions

**Files:**
- kebab-case for most files: `game-store.ts`, `room-manager.ts`
- PascalCase for React components: `GameLobby.tsx`, `PlayerCard.tsx`
- camelCase for some services: `gameBuddiesService.js`
- `*.test.ts` or `*.spec.ts` for test files

**Directories:**
- kebab-case: `shared/`, `services/`, `managers/`
- lowercase: `client/`, `server/`, `src/`
- PascalCase for game projects: `BingoBuddies/`, `ThinkAlike/`

**Special Patterns:**
- `index.ts` for barrel exports
- `types.ts` or `types.d.ts` for type definitions
- `*PhaseView.tsx` for game phase UI components

## Where to Add New Code

**New Game:**
- Copy `GameBuddiesTemplate/` as starting point
- Create `{GameName}/client/` and `{GameName}/server/`
- Add to `.gitmodules` if using submodules
- Register in `GameBuddieGamesServer/games/` if using unified server

**New Component:**
- Implementation: `*/client/src/components/{ComponentName}.tsx`
- Styles: Same directory or `*/client/src/styles/`
- Types: `*/shared/types.ts` or inline

**New Socket Event:**
- Server handler: `*/server/src/services/SocketHandler.ts`
- Manager logic: `*/server/src/managers/RoomManager.ts`
- Client emit: Via Zustand store actions

**New API Route:**
- Express route: `*/server/src/routes/` or inline in server.ts
- Validation: Joi/Zod schema in same file

**Utilities:**
- Shared: `*/shared/` for cross-client/server
- Client-only: `*/client/src/utils/`
- Server-only: `*/server/src/utils/`

## Special Directories

**node_modules/**
- Purpose: npm dependencies
- Source: `npm install`
- Committed: No (gitignored)

**dist/**
- Purpose: Compiled TypeScript output
- Source: `npm run build`
- Committed: No (gitignored)

**client/dist/**
- Purpose: Vite production build
- Source: `npm run build` in client
- Committed: No (gitignored)

**.planning/**
- Purpose: GSD project planning files
- Source: Created by planning workflow
- Committed: Yes

---

*Structure analysis: 2026-01-12*
*Update when directory structure changes*
