# Netlify deployment

This repository is configured for Netlify. The frontend is published from `artifacts/light-for-change/dist/public`; `/api/*` requests are rewritten to the `api` Netlify Function, which runs the existing Express API.

## One-time Netlify settings

1. Import this repository into Netlify. Keep the base directory empty.
2. Netlify will read `netlify.toml`; use its build command and publish directory without changing them.
3. In **Site configuration → Environment variables**, add these values from your private local environment (never commit them):
   - `DATABASE_URL` — production PostgreSQL/Supabase connection string. It must allow SSL connections from Netlify.
   - `ADMIN_PASSWORD` — a new long, unique password for `/admin`.
   - `SESSION_SECRET` — a new long random value used to sign admin sessions.
4. Deploy. Netlify uses Node 22 and pnpm 10 as declared in `netlify.toml`.

## Before the first public deployment

- Ensure the database schema has been applied to the same database referenced by `DATABASE_URL`.
- Rotate any database or Supabase credentials that were ever placed in a committed file, public message, screenshot, or deployment log.
- Do not add `DATABASE_URL`, Supabase keys, passwords, or JWT secrets to `VITE_` variables: Vite exposes those to every visitor.

## What is included

- SPA fallback: direct visits to routes such as `/map`, `/voices`, and `/legal` work after deployment.
- API rewrite: browser calls to `/api/...` work without changing frontend code.
- Serverless API: the existing Express routes are packaged as `netlify/functions/api.ts`.

## Smoke test after deployment

Open `https://YOUR-SITE.netlify.app/api/health`, then open the home page and submit a test candle. Remove the test entry from the admin dashboard if desired.
