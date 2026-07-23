# Light For Change

A digital candle map where visitors light virtual candles for peace, remembrance, solidarity, and civic expression. As more people participate, a world map gradually illuminates with warm glowing flames.

## Run & Operate

- `pnpm --filter @workspace/light-for-change run dev` — run the frontend (port from $PORT)
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `ADMIN_PASSWORD` — admin dashboard password (default: `lightforchange_admin_2024`)
- Optional env: `SESSION_SECRET` — JWT signing secret for admin tokens

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, Framer Motion, MapLibre GL JS, Recharts
- API: Express 5 (artifacts/api-server)
- DB: PostgreSQL + Drizzle ORM (lib/db)
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- Map tiles: OpenFreeMap dark style (https://tiles.openfreemap.org/styles/dark)

## Where things live

- `artifacts/light-for-change/src/` — React frontend
  - `pages/Home.tsx` — hero landing page
  - `pages/MapPage.tsx` — full-screen interactive map
  - `pages/LightCandle.tsx` — 3-step candle lighting wizard
  - `pages/Stats.tsx` — leaderboard and statistics
  - `pages/Admin.tsx` — admin dashboard (password protected)
  - `pages/ShareCard.tsx` — share card for individual candles
  - `components/CandleMap.tsx` — MapLibre map with WebGL fallback
  - `components/Navigation.tsx` — top navigation
- `artifacts/api-server/src/routes/` — API route handlers
  - `candles.ts` — CRUD, clusters, timeline, recent
  - `stats.ts` — global stats, country/state/city leaderboards
  - `locations.ts` — country/state/city lookup dropdowns
  - `admin.ts` — admin auth + moderation
- `lib/db/src/schema/` — Drizzle schema
  - `candles.ts` — candles table
  - `banned_ips.ts` — banned IPs table
  - `rate_limits.ts` — rate limit table (not actively used; rate limiting done via candles table query)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)

## Architecture decisions

- Rate limiting: 1 candle per IP per 24 hours, enforced by querying the candles table for recent IPs (no Redis required)
- Coordinates rounded to 2 decimal places (~1km precision) — never exact GPS
- MapLibre WebGL gracefully falls back to a dot-scatter visualization in environments without WebGL support (e.g. Replit preview pane); the full interactive map renders in real browsers
- Admin auth uses JWT signed with SESSION_SECRET, stored in localStorage
- Candle clusters served directly from PostgreSQL using grid-based aggregation (no PostGIS extension required)

## Product

- **Hero** (`/`) — India-centered map + live counters + "Light My Candle" CTA
- **Map** (`/map`) — Full world map, candle clusters, sidebar feed, timeline slider
- **Light** (`/light`) — 3-step wizard: location → name + message → animated confirmation
- **Stats** (`/stats`) — Leaderboard tables + timeline chart + recent messages
- **Admin** (`/admin`) — Password login, moderation (hide/delete/ban IP), stats
- **Share** (`/share/:id`) — Individual candle share card

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any OpenAPI spec change, run codegen before touching backend or frontend
- MapLibre CSS must be imported in the component: `import 'maplibre-gl/dist/maplibre-gl.css'`
- The `@workspace/db` lib must be rebuilt (`pnpm run typecheck:libs`) after schema changes before the API server can typecheck
- Admin JWT tokens expire in 24h; users must re-login after that

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
