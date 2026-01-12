# Coding Conventions

**Analysis Date:** 2026-01-12

## Naming Patterns

**Files:**
- kebab-case for modules: `room-manager.ts`, `game-store.ts`
- PascalCase for React components: `GameLobby.tsx`, `PlayerCard.tsx`
- camelCase for some services: `gameBuddiesService.js`
- Test files: `*.test.ts` alongside source

**Functions:**
- camelCase for all functions: `createRoom()`, `handlePlayerJoin()`
- `handle*` prefix for event handlers: `handleClick`, `handleSubmit`
- No special prefix for async functions

**Variables:**
- camelCase for variables: `roomCode`, `playerList`
- UPPER_SNAKE_CASE for constants: `MAX_PLAYERS`, `SOCKET_EVENTS`
- No underscore prefix for private members

**Types:**
- PascalCase for interfaces: `Player`, `GameState`, `RoomConfig`
- No `I` prefix (use `Player` not `IPlayer`)
- PascalCase for type aliases: `PlayerMap`, `SocketCallback`
- PascalCase for enums: `GamePhase.LOBBY`, `PlayerStatus.READY`

## Code Style

**Formatting:**
- 2 space indentation
- Single quotes for strings (TypeScript/JavaScript)
- Semicolons required
- Max line length: ~100 characters (not strictly enforced)
- Trailing commas in multi-line arrays/objects

**Linting:**
- ESLint with `@typescript-eslint/` plugins
- Config: `eslint.config.js` or inline in package.json
- Run: `npm run lint`
- Extends: `@typescript-eslint/recommended`

**TypeScript:**
- Strict mode enabled
- Explicit return types on public functions
- Interface over type where possible
- `type: "module"` in package.json (ES modules)

## Import Organization

**Order:**
1. React and framework imports (`react`, `react-dom`)
2. External packages (`socket.io-client`, `zustand`, `lodash`)
3. Internal absolute imports (`@/services`, `@/components`)
4. Relative imports (`./utils`, `../types`)
5. Type imports (`import type { ... }`)
6. CSS imports

**Grouping:**
- Blank line between groups
- Alphabetical within each group (not strictly enforced)
- Named imports preferred over default where possible

**Path Aliases:**
- Some projects use `@/` for `src/`
- Configured in `tsconfig.json` paths
- Not universally applied across monorepo

## Error Handling

**Patterns:**
- Throw errors in services, catch at boundaries (handlers)
- Use descriptive error messages
- Async functions use try/catch, not .catch() chains

**Socket.io Errors:**
```typescript
// Server - emit error to specific client
socket.emit('error', { message: 'Invalid room code' });

// Client - handle error events
socket.on('error', (data) => toast.error(data.message));
```

**Validation:**
- Joi schemas for Socket.io payloads
- Validate before any state mutation
- Fail fast on invalid input

## Logging

**Framework:**
- Console logging (console.log, console.error)
- No structured logging library
- Logs go to stdout for Render.com

**Patterns:**
- Log Socket.io events in development
- Log errors with context before throwing
- No console.log in production client code (remove or comment)

## Comments

**When to Comment:**
- Explain "why" not "what"
- Document business rules and game logic
- Explain non-obvious algorithms or workarounds
- Mark technical debt with TODO/FIXME

**JSDoc/TSDoc:**
- Optional for internal functions
- Types provide most documentation
- Use `@param`, `@returns` for complex functions

**TODO Comments:**
- Format: `// TODO: description`
- `// FIXME: description` for bugs
- Link to issue if exists: `// TODO: Fix race condition (issue #123)`

## Function Design

**Size:**
- Keep functions under 50 lines when possible
- Extract helpers for complex logic
- Single responsibility per function

**Parameters:**
- Max 3 positional parameters
- Use options object for 4+ parameters
- Destructure objects in parameter list

**Return Values:**
- Explicit return statements
- Return early for guard clauses
- Consistent return types (avoid mixed undefined/null)

## React Patterns

**Components:**
- Functional components only (no class components)
- PascalCase naming: `PlayerCard`, `GameLobby`
- One component per file typically
- Props interface defined above component

**State:**
- Zustand for global state (`gameStore.ts`)
- React state for local UI state
- Avoid prop drilling with Zustand

**Hooks:**
- Custom hooks in `hooks/` directory
- `use*` prefix: `useSocket`, `useGameBuddies`
- Extract complex logic into hooks

## Socket.io Patterns

**Event Naming:**
- Namespace convention: `room:*`, `game:*`, `player:*`, `chat:*`
- Examples: `room:create`, `game:start`, `player:ready`

**Server Handler Pattern:**
```typescript
socket.on('room:create', (data, callback) => {
  try {
    const result = roomManager.createRoom(data);
    callback({ success: true, room: result });
  } catch (error) {
    callback({ success: false, error: error.message });
  }
});
```

**Client Emit Pattern:**
```typescript
socket.emit('room:join', { roomCode, playerName }, (response) => {
  if (response.success) {
    setRoom(response.room);
  } else {
    toast.error(response.error);
  }
});
```

## Module Design

**Exports:**
- Named exports preferred
- Default exports for React components
- Barrel exports via `index.ts` where useful

**File Organization:**
- One class/major function per file
- Group related utilities in single file
- Types can be inline or in `types.ts`

---

*Convention analysis: 2026-01-12*
*Update when patterns change*
