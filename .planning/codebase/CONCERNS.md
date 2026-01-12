# Codebase Concerns

**Analysis Date:** 2026-01-12

## Tech Debt

**Inconsistent GameBuddies Integration:**
- Issue: Some games have full integration, others partial/missing
- Files: `BingoBuddies/` missing full integration, `DDF/` has reference implementation
- Why: Games developed at different times with varying requirements
- Impact: Inconsistent user experience across platform games
- Fix approach: Follow `GAMEBUDDIES_INTEGRATION_REQUIREMENTS.md`, copy from `DDF/` reference

**Mixed Build Systems:**
- Issue: Some games use Vite, `SchoolQuizGame` uses Create React App
- Files: `SchoolQuizGame/package.json` (react-scripts), others use Vite
- Why: Legacy project started with CRA
- Impact: Inconsistent build performance, different dev experience
- Fix approach: Migrate `SchoolQuizGame` to Vite (significant effort)

**Duplicate Server Code:**
- Issue: Individual game servers vs. unified `GameBuddieGamesServer`
- Files: `*/server/` directories alongside `GameBuddieGamesServer/`
- Why: Evolutionary architecture, games originally standalone
- Impact: Code duplication, inconsistent patterns, harder maintenance
- Fix approach: Migrate all games to use `GameBuddieGamesServer`

**JavaScript in TypeScript Codebase:**
- Issue: Some services written in JavaScript
- Files: `*/services/GameBuddiesIntegration.js`, `*/services/gameBuddiesService.js`
- Why: Rapid prototyping without type setup
- Impact: No type safety, potential runtime errors
- Fix approach: Convert to TypeScript with proper interfaces

## Known Bugs

**Race Condition in Session Reconnection:**
- Symptoms: Player shows as disconnected briefly after reconnect
- Trigger: Fast page refresh during active game
- Files: `*/server/src/managers/SessionManager.ts`
- Workaround: State eventually syncs (self-healing)
- Root cause: Session validation timing vs. socket reconnect
- Fix: Add polling/retry in reconnection logic

## Security Considerations

**Input Validation Gaps:**
- Risk: Not all Socket.io events have Joi/Zod validation
- Files: Various `SocketHandler.ts` files
- Current mitigation: React escapes XSS, some events validated
- Recommendations: Add validation schemas for ALL events

**Host Verification:**
- Risk: Host-only actions verified by socket ID, not cryptographic proof
- Files: `*/server/src/managers/RoomManager.ts`
- Current mitigation: Socket ID comparison
- Recommendations: Add signed host tokens for sensitive actions

**No Rate Limiting on All Events:**
- Risk: Spam potential on some Socket.io events
- Files: Rate limiting only on room creation and chat
- Current mitigation: Partial rate limiting
- Recommendations: Add rate limiting to all player-initiated events

## Performance Bottlenecks

**Memory Growth in Long Sessions:**
- Problem: In-memory state grows without cleanup
- Files: `*/server/src/managers/RoomManager.ts`
- Measurement: Not measured, but 2-hour cleanup exists
- Cause: Room/player objects accumulate
- Improvement path: More aggressive cleanup, memory monitoring

**Render.com Free Tier Constraints:**
- Problem: 512MB RAM limit, server sleeps after inactivity
- Measurement: `--max-old-space-size=450` in start scripts
- Cause: Free tier limitations
- Improvement path: Upgrade tier or optimize memory usage further

**No Server-Side Rendering:**
- Problem: Initial load requires full JS bundle
- Measurement: Time to interactive varies by game
- Cause: SPA architecture
- Improvement path: Consider SSR for landing pages (if needed)

## Fragile Areas

**Socket.io Event Handlers:**
- Files: `*/server/src/services/SocketHandler.ts`
- Why fragile: Many events, complex state transitions, minimal tests
- Common failures: Missing validation, race conditions in async handlers
- Safe modification: Add event-level tests before changes
- Test coverage: Playwright E2E covers some flows, gaps in error cases

**Game Phase Transitions:**
- Files: `*/server/src/managers/RoomManager.ts` (phase logic)
- Why fragile: State machine with multiple paths, timing dependencies
- Common failures: Invalid phase transitions, stuck games
- Safe modification: Add phase transition tests
- Test coverage: Limited

**CSS Z-Index Management:**
- Files: Various CSS files across projects
- Why fragile: Scattered z-index values, no centralized management
- Common failures: Overlays blocked by other elements
- Safe modification: `SchoolQuizGame` has `z-index-constants.css` (good pattern)
- Fix approach: Adopt centralized z-index system across all games

## Scaling Limits

**In-Memory State:**
- Current capacity: Hundreds of concurrent rooms (estimated)
- Limit: Server RAM (512MB on free tier)
- Symptoms at limit: Out of memory errors, server crash
- Scaling path: Redis for distributed state, or accept limit

**Single Server Instance:**
- Current capacity: One Render.com instance per game server
- Limit: Single process handles all connections
- Symptoms at limit: Slow responses, connection failures
- Scaling path: Load balancer + multiple instances + Redis

## Dependencies at Risk

**react-hot-toast:**
- Risk: Used in `BingoBuddies`, maintenance status unclear
- Impact: Toast notifications break on React upgrade
- Migration plan: Consider `sonner` or similar

**Old React Versions:**
- Risk: `SchoolQuizGame` on React 18.2, `ThinkAlike` on React 19
- Files: Various `package.json` files
- Impact: Inconsistent behavior, can't use latest features everywhere
- Migration plan: Align React versions across projects

## Missing Critical Features

**Persistent Game History:**
- Problem: No record of completed games
- Current workaround: None (data lost on room cleanup)
- Blocks: Leaderboards, player statistics, game replay
- Implementation complexity: Medium (Supabase integration exists)

**Error Reporting to Platform:**
- Problem: Game errors not reported to GameBuddies platform
- Current workaround: Check individual game logs
- Blocks: Platform-level monitoring
- Implementation complexity: Low (add error event to integration)

**Comprehensive Automated Tests:**
- Problem: Limited test coverage across games
- Current workaround: Manual testing
- Blocks: Confident refactoring, regression detection
- Implementation complexity: Medium (add Playwright tests per game)

## Test Coverage Gaps

**Socket.io Event Handlers:**
- What's not tested: Individual event validation, error paths
- Risk: Bugs in event handling discovered only in production
- Priority: High
- Difficulty to test: Medium (Playwright can test via UI)

**Game Phase State Machines:**
- What's not tested: Edge cases in phase transitions
- Risk: Games stuck in invalid states
- Priority: High
- Difficulty to test: Medium (need state machine testing pattern)

**Reconnection Flows:**
- What's not tested: Various reconnection scenarios
- Risk: Players unable to rejoin games
- Priority: Medium
- Difficulty to test: Medium (need to simulate disconnects)

---

*Concerns audit: 2026-01-12*
*Update as issues are fixed or new ones discovered*
