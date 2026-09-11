# BobMasterBillie — Private Dashboard (HTML / CSS / JS)

A single-password-protected personal dashboard, built with plain HTML,
CSS, and vanilla JavaScript on the frontend and a small Node/Express
backend (deployable to Vercel as a single serverless function). There is
no user registration, no multiple accounts, and no roles — one shared
password unlocks the entire application (Dashboard, Twitch, Nightbot,
Custom Commands, Predictions, Channels, Stream Notes, Backlog, Veto
Power, Quick Links, CV, Settings).

## Project layout

```
public/            <- everything here is what the browser can see
  login.html
  dashboard.html
  settings.html
  twitch.html, nightbot.html, ...   (stub sections)
  css/styles.css
  js/nav.js         <- renders the sidebar + logout button
  js/login.js        <- login form submit handler
  js/settings.js      <- change-password form submit handler
lib/
  auth.js           <- hashPassword/verifyPassword + requireAuthPage/Api middleware
  session.js        <- signs/verifies the session JWT
  supabase-admin.js <- server-only Supabase client (service role key)
server.js           <- Express app: static files, protected page routes, API routes
scripts/seed-password.mjs
supabase/schema.sql
vercel.json
```

Nothing under `public/` ever contains the password, its hash, or any
server secret — it's plain markup, CSS, and client JS that only talks to
`/api/*` endpoints.

## How the auth model works

- The password is **never** stored in HTML, client JS, or any file under
  `public/`. Only a bcrypt hash lives in Supabase, in a table
  (`dashboard_auth`) with Row Level Security enabled and **no** policies
  for `anon`/`authenticated` — unreachable except via the service-role
  key, which only ever lives in `lib/supabase-admin.js`, loaded solely by
  `server.js`.
- Logging in (`POST /api/login`) sets a signed, `HttpOnly`, `Secure` (in
  production), `SameSite=Lax` session cookie. The cookie carries no
  secret — just a boolean flag and a version number.
- **Every** protected page (`/`, `/settings.html`, `/twitch.html`, etc.)
  is served through an Express route wrapped in `requireAuthPage`
  (`lib/auth.js`), which re-verifies the session against the current
  password version in the database before sending back any HTML. An
  unauthenticated request never receives the page — it's redirected to
  `/login.html` server-side, not hidden with client-side CSS/JS.
- Every API route that touches private data (`/api/change-password`) is
  wrapped in `requireAuthApi`, which returns `401 Unauthorized` with no
  body instead of a redirect.
- Changing the password bumps `password_version` in the database, which
  immediately invalidates every other open session — no server-side
  session store needed, because each session's embedded version is
  checked against the current one on every request.

## Hardening

Beyond the core password/session model above:

- **Security headers** (`helmet`): a strict Content-Security-Policy with
  no `unsafe-inline`/`unsafe-eval` (every page's JS lives in `/public/js`
  as separate files, and inline `style=""` attributes were replaced with
  CSS classes specifically so this could be strict), plus
  `X-Content-Type-Options: nosniff`, `X-Frame-Options`,
  `frame-ancestors 'none'`, and HSTS in production.
- **CSRF protection**: a double-submit cookie pattern (`lib/csrf.js`). The
  server sets a random, readable `bmb_csrf` cookie; every state-changing
  request (`/api/login`, `/api/logout`, `/api/change-password`) must echo
  that value back in an `X-CSRF-Token` header, which an attacker's page
  can't read due to the same-origin policy. This is on top of, not
  instead of, `SameSite=Lax` on the session cookie itself.
- **Rate limiting** (`express-rate-limit`): `/api/login` is limited to 10
  attempts per 15 minutes per IP; `/api/change-password` to 20.
- **Automated tests** (`npm test`, Node's built-in test runner): exercises
  the same cases as the manual checklist below — logged-out redirects,
  wrong password, missing CSRF token, the full login → change-password →
  old-session-dies → new-session-lives → logout flow, and the presence of
  the security headers. Tests run against an in-memory auth store
  (`AUTH_TEST_MODE=1`, set only by the `test` script) so they need no real
  Supabase project or network access — that flag is never read anywhere
  except `lib/supabase-admin.js` and is never set in `server.js` itself.

## Setup

1. **Create the Supabase table.** Run `supabase/schema.sql` in your
   project's SQL editor.
2. **Copy the env file:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, a random
   `SESSION_SECRET` (`openssl rand -base64 48`), and a `DASHBOARD_PASSWORD`
   you want to start with.
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Seed the password hash into Supabase:**
   ```bash
   npm run seed:password
   ```
   This hashes `DASHBOARD_PASSWORD` with bcrypt and stores only the hash.
   You can delete `DASHBOARD_PASSWORD` from `.env.local` afterwards — it's
   never read again at runtime.
5. **Run the app:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`.
6. **Run the automated tests** (no Supabase project needed for this):
   ```bash
   npm test
   ```

## Deploying to Vercel

`vercel.json` routes every request through `server.js` as a single Node
serverless function, so no separate static hosting config is needed.

Add these as **Environment Variables** in the Vercel project settings
(never in a committed file):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
- `SESSION_DURATION_HOURS` (optional, defaults to 12)

Run `npm run seed:password` once locally (pointed at the same Supabase
project) — it only needs to run once, not on every deploy.

## Changing the password later

Go to **Settings → Change Password** while logged in. This requires the
current password, hashes the new one server-side, and bumps the stored
`password_version`, which immediately signs out every other session
(other tabs/devices) — the current browser gets a fresh session so you
stay logged in.

## Manual testing checklist

- [ ] Opening the site while logged out → redirected to `/login.html`
- [ ] Entering an incorrect password → generic error, no session set
- [ ] Entering the correct password → redirected in, `HttpOnly` cookie
      set (check DevTools → Application → Cookies)
- [ ] Refreshing after login → still logged in
- [ ] Opening a private route directly (e.g. `/settings.html`) while
      logged out → redirected to `/login.html`
- [ ] Calling `/api/change-password` while logged out → `401
      Unauthorized`, no data returned
- [ ] Logging out → cookie cleared, redirected to `/login.html`, private
      routes inaccessible again
- [ ] Changing the password → old sessions (other tabs/devices)
      immediately stop working; current tab stays logged in
- [ ] Using an expired session (set `SESSION_DURATION_HOURS` very low to
      test) → treated as logged out
- [ ] Calling `/api/login`, `/api/logout`, or `/api/change-password`
      without the `X-CSRF-Token` header (or with a wrong value) → `403
      Invalid or missing CSRF token`, even with a valid session cookie
- [ ] Trying to access private data without authentication by hitting
      Supabase directly with any client-side key → blocked by RLS (no
      policies exist for anon/authenticated roles)
- [ ] Trying to bypass login via browser DevTools (viewing page source,
      forging the cookie, calling `/api/*` directly) → every check
      happens server-side in `requireAuthPage`/`requireAuthApi`, so
      client tampering has no effect

## Adding more dashboard data

For any new table (custom commands, backlog items, stream notes, etc.),
follow the same pattern used for `dashboard_auth`:

1. `enable row level security` on the table.
2. Add **no** policies for `anon`/`authenticated`.
3. Read and write it only from `server.js` routes that call
   `requireAuthApi` first and use the service-role client from
   `lib/supabase-admin.js`.

This keeps every private route protected server-side — never rely on
hiding UI after login as the only protection.
