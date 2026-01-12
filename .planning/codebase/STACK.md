# Technology Stack

**Analysis Date:** 2026-01-12

## Languages

**Primary:**
- TypeScript 5.x - All application code (client and server)
- JavaScript - Legacy components, build scripts, config files

**Secondary:**
- CSS/SCSS - Styling with Tailwind CSS utility classes
- HTML - React JSX templates

## Runtime

**Environment:**
- Node.js 18.x+ (required, specified in engines field)
- Browser runtime (React SPAs for all game clients)

**Package Manager:**
- npm (primary)
- Lockfiles: `package-lock.json` present in all projects

## Frameworks

**Core:**
- React 18.x/19.x - UI framework for all game clients
- Express 4.x - Web server for backends (`GameBuddieGamesServer`, game servers)
- Socket.io 4.x - Real-time WebSocket communication

**UI Libraries (varies by project):**
- Tailwind CSS 3.x - Primary styling framework (`BingoBuddies/client`, `ThinkAlike/client`, etc.)
- Material UI (@mui/material) - `SchoolQuizGame` UI components
- Bootstrap 5.x + React Bootstrap - `SchoolQuizGame` layout
- Framer Motion - Animations (`ThinkAlike/client`)

**3D/Graphics:**
- Three.js + @react-three/fiber - 3D rendering (`ThinkAlike/client`)
- Phaser - 2D game engine (`RetroArcade/client`)
- Fabric.js - Canvas manipulation (`SchoolQuizGame`)
- MediaPipe - Vision/body tracking (`DDF/client`, `ThinkAlike/client`)

**Testing:**
- Playwright 1.x - E2E testing (`GameBuddieGamesServer/playwright.config.ts`)
- Jest - Unit tests (via react-scripts in `SchoolQuizGame`)

**Build/Dev:**
- Vite 5.x/7.x - Build tool and dev server (most projects)
- Create React App (react-scripts) - `SchoolQuizGame`
- tsx - TypeScript execution without compilation (`GameBuddieGamesServer`)
- ESLint 8.x/9.x - Linting
- PostCSS + Autoprefixer - CSS processing

## Key Dependencies

**Critical:**
- `socket.io` / `socket.io-client` 4.x - Real-time multiplayer communication
- `@supabase/supabase-js` 2.x - Database and auth (`GameBuddieGamesServer`, `SchoolQuizGame`)
- `zustand` 4.x - State management (`BingoBuddies`)
- `react-router-dom` 6.x - Client-side routing

**Validation/Utilities:**
- `joi` 17.x - Schema validation (`GameBuddieGamesServer`)
- `zod` 4.x - Schema validation (`GameBuddieGamesServer`)
- `uuid` 9.x - ID generation
- `axios` 1.x - HTTP client

**Infrastructure:**
- `helmet` 7.x - Security headers
- `compression` 1.x - Response compression
- `cors` 2.x - CORS handling
- `dotenv` 16.x - Environment variable loading

## Configuration

**Environment:**
- `.env` files for secrets (gitignored)
- `dotenv` package loads environment variables
- Key configs: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_KEY`

**Build:**
- `vite.config.ts` - Vite configuration (most projects)
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS customization
- `postcss.config.js` - PostCSS plugins
- `eslint.config.js` or `.eslintrc` - Linting rules

## Platform Requirements

**Development:**
- Any platform with Node.js 18+
- No external dependencies (databases in-memory or Supabase cloud)
- Standard ports: 5173 (client dev), 3001 (server dev)

**Production:**
- Render.com - Primary deployment target
- Static files served from Express in production
- Optimized for 512MB RAM (Render.com free tier)
- Memory-conscious build flags: `--max-old-space-size=450`

---

*Stack analysis: 2026-01-12*
*Update after major dependency changes*
