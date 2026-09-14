# BobMasterBillie — Private Dashboard

A single-password-protected personal dashboard. No user registration, no
multiple accounts, no roles — one password unlocks the entire application
(Dashboard, Twitch, Nightbot, Custom Commands, Predictions, Channels,
Stream Notes, Backlog, Veto Power, Quick Links, CV, Settings).

## How the auth model works

- The password is **never** stored in HTML, client JS, or any file under
  `public/`. Only a bcrypt hash lives in Supabase, in a table
  (`dashboard_auth`) with Row Level Security enabled and **no** policies
  for `anon`/`authenticated` — unreachable except via the service-role
  key, which only ever lives in `lib/supabase-admin.js`, loaded solely by
  `server.js`.
- Logging in (`POST /api/login`) sets a signed, `HttpOnly`, `Secure` (in
  production), `SameSite=Lax` session cookie carrying a boolean flag and
  a version number — nothing sensitive.
- Every protected page (`/`, `/settings.html`, `/twitch.html`, etc.) is
  served through an Express route wrapped in `requireAuthPage`
  (`lib/auth.js`), which re-verifies the session against the current
  password version in the database before sending back any HTML.
- Changing the password bumps `password_version` in the database, which
  immediately invalidates every other open session.

## Hardening

- **Security headers** (`helmet`): strict CSP with no
  `unsafe-inline`/`unsafe-eval` — every page's JS lives in `public/js` as
  separate files, no inline `style=""` attributes anywhere.
- **CSRF protection**: double-submit cookie pattern (`lib/csrf.js`).
- **Rate limiting**: `/api/login`, `/api/change-password`, and
  `/api/setup` each have their own limits (`express-rate-limit`).
- **Automated tests** (`npm test`): 10 tests covering the full flow
  against an in-memory auth store (`AUTH_TEST_MODE=1`) — no real
  Supabase project needed to run them.

## Setup — no local commands needed

You can set the dashboard password entirely through the deployed site.

1. **Create the Supabase table.** Run this in Supabase → SQL Editor:
   ```sql
   create table if not exists public.dashboard_auth (
     id integer primary key default 1,
     password_hash text not null,
     password_version integer not null default 1,
     updated_at timestamptz not null default now(),
     constraint dashboard_auth_single_row check (id = 1)
   );

   alter table public.dashboard_auth enable row level security;
   -- No CREATE POLICY statements on purpose: default-deny.
   ```
   (Same content as `supabase/schema.sql` in this repo.)
2. **Set these environment variables in Vercel:**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET` — random, 32+ characters
   - `SETUP_SECRET` — random, 16+ characters (separate from your
     password — treat it just as seriously)
3. **Deploy.**
4. **Visit `/setup.html`** once. Enter `SETUP_SECRET` and the password
   you want, submit. Done — it hashes the password and writes it into
   Supabase.
5. Log in at `/login.html`.

Revisit `/setup.html` anytime later (e.g. forgot the password) — it
always works as long as you know `SETUP_SECRET`, and overwrites whatever
password is currently set.

### Alternative: local seed script

```bash
cp .env.example .env.local   # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DASHBOARD_PASSWORD
npm install
npm run seed:password
npm run dev
```

Both paths write to the same `dashboard_auth` table.

## Deploying to Vercel

`vercel.json` routes every request through `server.js` as a single Node
serverless function. Env vars needed: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `SETUP_SECRET`, optionally
`SESSION_DURATION_HOURS`.

## Changing the password later

- **In-app (needs the current password):** Settings → Change Password.
  Bumps `password_version`, signs out every other session; current
  browser gets a fresh session.
- **Forgot the password / no session:** revisit `/setup.html` with
  `SETUP_SECRET`. Overwrites unconditionally — meant as the recovery
  path.

## Interface

"Broadcast console" aesthetic — dark background, signal-teal accent,
monospace console-style labels, a pulsing "session active" indicator in
the sidebar, real line icons per section, and a mobile layout that
collapses the sidebar into a horizontal icon bar under ~760px. Plain CSS,
no framework, in `public/css/styles.css`.

## Project layout

```
public/
  login.html, setup.html, dashboard.html, settings.html, ...
  css/styles.css
  js/nav.js, login.js, settings.js, setup.js, csrf.js
lib/
  auth.js            <- hashPassword/verifyPassword + requireAuthPage/Api middleware
  session.js         <- signs/verifies the session JWT (version-aware)
  supabase-admin.js  <- server-only Supabase client + password row helpers
  csrf.js            <- double-submit CSRF cookie pattern
server.js
supabase/schema.sql
scripts/seed-password.mjs
tests/
```

## Manual testing checklist

- [ ] Opening the site while logged out → redirected to `/login.html`
- [ ] Entering an incorrect password → generic error
- [ ] Entering the correct password → session cookie set, redirected in
- [ ] Refreshing after login → still logged in
- [ ] Opening a private route directly while logged out → redirected
- [ ] Calling any `/api/*` route without the `X-CSRF-Token` header → `403`
- [ ] Calling a protected `/api/*` route while logged out → `401`
- [ ] Logging out → cookie cleared, private routes inaccessible again
- [ ] Changing the password → old sessions die, current session survives
- [ ] `/setup.html` with wrong `SETUP_SECRET` → `403`
- [ ] `/setup.html` with correct `SETUP_SECRET` → password set/reset,
      usable immediately, no prior session needed
- [ ] Trying to bypass login via DevTools → every check happens
      server-side, so client tampering has no effect
