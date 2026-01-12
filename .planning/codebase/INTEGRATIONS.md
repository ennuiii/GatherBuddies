# External Integrations

**Analysis Date:** 2026-01-12

## APIs & External Services

**Supabase:**
- Purpose: Database and authentication for persistent data
- SDK/Client: `@supabase/supabase-js` v2.x
- Auth: `SUPABASE_URL`, `SUPABASE_KEY` env vars
- Used in: `GameBuddieGamesServer`, `SchoolQuizGame`
- Features used: Database queries, user auth (optional)

**No Other External APIs:**
- Games are self-contained with in-memory state
- No payment processing (free games)
- No external analytics (yet)
- No email/SMS services

## Data Storage

**Primary Approach: In-Memory**
- All game state stored in-memory on server
- No persistence across server restarts (by design)
- Automatic cleanup of inactive rooms after 2 hours
- Session tokens stored in-memory for reconnection

**Optional Supabase Database:**
- Type: PostgreSQL (Supabase hosted)
- Connection: `DATABASE_URL` or Supabase SDK
- Client: `@supabase/supabase-js`
- Usage: User accounts, game history (when needed)

**File Storage:**
- None (no file uploads in current games)
- Static assets served from client build

**Caching:**
- None (in-memory state is the cache)

## Authentication & Identity

**Primary: Anonymous/Session-Based**
- No required login for most games
- Session tokens for reconnection
- Host identified by socket connection

**Optional Supabase Auth:**
- Provider: Supabase Auth
- Methods: Email/password, OAuth (if configured)
- Token storage: Client-side (Supabase SDK handles)
- Used for: Persistent user profiles, leaderboards

**GameBuddies Platform Identity:**
- Platform passes: `playerId`, `name`, `role` via URL params
- Games detect via `GameBuddiesIntegration` service
- No separate auth - trusts platform params

## Monitoring & Observability

**Error Tracking:**
- None configured (rely on console logging)
- Errors visible in Render.com logs

**Analytics:**
- None (no Mixpanel, Google Analytics, etc.)
- Could add platform-level analytics in future

**Logs:**
- stdout/stderr to Render.com logs
- Console.log for development
- No structured logging service

## CI/CD & Deployment

**Hosting:**
- Platform: Render.com (primary)
- Deployment: Auto-deploy on git push
- Static files: Served from Express in production

**CI Pipeline:**
- Trigger: Git push to main/development branch
- Steps: Build, deploy (Render.com handles)
- No GitHub Actions configured for tests
- Manual testing before merge

**Environments:**
- Development: Local (localhost:5173 client, localhost:3001 server)
- Production: Render.com URLs

## Environment Configuration

**Development:**
- Required env vars: None for basic operation
- Optional: `SUPABASE_URL`, `SUPABASE_KEY` for database features
- Secrets: `.env` files (gitignored)
- No mock services needed (in-memory works locally)

**Production (Render.com):**
- Env vars set in Render.com dashboard
- `NODE_ENV=production`
- Supabase credentials for production database
- No separate staging environment

## WebSocket Communication

**Socket.io:**
- Purpose: Real-time multiplayer communication
- Server: `socket.io` v4.x
- Client: `socket.io-client` v4.x
- Transport: WebSocket with polling fallback
- Namespace: Default `/` namespace

**Connection Lifecycle:**
1. Client connects on page load
2. Server assigns socket ID
3. Client joins room via `room:join` event
4. Server manages room membership
5. Heartbeats detect disconnection
6. Session tokens enable reconnection

## GameBuddies Platform Integration

**Integration Service:**
- Location: `*/client/src/services/GameBuddiesIntegration.js`
- Purpose: Detect platform context, enable communication

**URL Parameters (Incoming):**
- `room`: Room code to join
- `name`: Player name
- `playerId`: Platform player ID
- `role`: Player role (host, player, spectator)

**External Game Status API (Outgoing):**
- Reports game state back to platform
- Status: in_progress, finished
- Enables platform to show game status

**Return Navigation:**
- `GameBuddiesReturnButton` component
- Navigates back to platform when game ends
- Location: `*/client/src/components/GameBuddiesReturnButton.tsx`

## Third-Party Libraries (Not Services)

**MediaPipe:**
- Purpose: Body/gesture tracking in DDF and ThinkAlike
- Runs client-side (no external API calls)
- Models loaded from CDN

**Three.js:**
- Purpose: 3D rendering in ThinkAlike
- Runs entirely client-side
- No external service integration

---

*Integration audit: 2026-01-12*
*Update when adding/removing external services*
