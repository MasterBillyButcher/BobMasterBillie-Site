# BobMasterBillie — Private Dashboard

A single-password-protected personal dashboard. There is no user
registration, no multiple accounts, no roles, and no database — one
password, stored in one environment variable, unlocks the entire
application (Dashboard, Twitch, Nightbot, Custom Commands, Predictions,
Channels, Stream Notes, Backlog, Veto Power, Quick Links, CV, Settings).

## The whole password model

- `DASHBOARD_PASSWORD` — set this env var to whatever you want your
  password to be. That's it. No hashing, no seeding, no table.
- It's compared with a constant-time check (`crypto.timingSafeEqual`) so
  response timing can't leak how close a guess was.
- It's never sent to the browser, never in any file under `public/`,
  never logged.
- **To change it:** update `DASHBOARD_PASSWORD` in Vercel → Environment
  Variables, redeploy. That's the entire "change password" flow —
  there's a note about this on the Settings page in the app.

## How the session/security model works

- Logging in (`POST /api/login`) sets a signed, `HttpOnly`, `Secure` (in
  production), `SameSite=Lax` session cookie. The cookie carries nothing
  but a boolean flag and an expiry.
- Every protected page (`/`, `/settings.html`, `/twitch.html`, etc.) is
  served through an Express route wrapped in `requireAuthPage`
  (`lib/auth.js`), which checks the session cookie server-side before
  sending back any HTML. An unauthenticated request never receives the
  page — it's redirected to `/login.html`, not hidden with client-side
  CSS/JS.
- **Security headers** (`helmet`): a strict Content-Security-Policy with
  no `unsafe-inline`/`unsafe-eval` — every page's JS lives in
  `/public/js` as separate files, and there are no inline `style=""`
  attributes anywhere, specifically so this could be strict.
- **CSRF protection**: a double-submit cookie pattern (`lib/csrf.js`).
  Login/logout requests must echo a readable `bmb_csrf` cookie back as an
  `X-CSRF-Token` header, which an attacker's page can't read.
- **Rate limiting**: `/api/login` is limited to 10 attempts per 15
  minutes per IP (`express-rate-limit`).

## Project layout

```
public/            <- everything here is what the browser can see
  login.html
  dashboard.html
  settings.html
  twitch.html, nightbot.html, ...   (stub sections)
  css/styles.css     <- design system (see "Interface" below)
  js/nav.js          <- renders the sidebar + logout
  js/login.js        <- login form handler
  js/settings.js     <- settings page logout handler
  js/csrf.js         <- reads the CSRF cookie for fetch() calls
lib/
  auth.js           <- checkPassword() + requireAuthPage/requireAuthApi middleware
  session.js        <- signs/verifies the session JWT
  csrf.js           <- double-submit CSRF cookie pattern
server.js           <- Express app: static files, protected routes, API routes
vercel.json
```

## Setup

1. **Set the env vars** — locally in `.env.local` (copy `.env.example`),
   or in Vercel → Project Settings → Environment Variables:
   - `DASHBOARD_PASSWORD` — your password
   - `SESSION_SECRET` — random, 32+ characters (`openssl rand -base64 48`)
   - `SESSION_DURATION_HOURS` — optional, defaults to 12
2. **Install & run:**
   ```bash
   npm install
   npm run dev
   ```
   Visit `http://localhost:3000` and log in.
3. **Run the tests:**
   ```bash
   npm test
   ```

## Deploying to Vercel

`vercel.json` routes every request through `server.js` as a single Node
serverless function. Add `DASHBOARD_PASSWORD`, `SESSION_SECRET`, and
optionally `SESSION_DURATION_HOURS` in Vercel's Environment Variables,
deploy, and log in. No database, no seed step, no setup page.

## Interface

The design is a "broadcast console" aesthetic — dark background, a
signal-teal accent, monospace labels for a console-readout feel, and a
pulsing "session active" indicator in the sidebar as the one signature
touch. Everything is plain CSS (no framework) in `public/css/styles.css`,
with a mobile layout that collapses the sidebar into a horizontal
icon bar under ~760px width.

## Manual testing checklist

- [ ] Opening the site while logged out → redirected to `/login.html`
- [ ] Entering an incorrect password → generic error shown inline
- [ ] Entering the correct password → redirected in, `HttpOnly` cookie set
- [ ] Refreshing after login → still logged in
- [ ] Opening a private route directly (e.g. `/settings.html`) while
      logged out → redirected to `/login.html`
- [ ] Calling `/api/login` or `/api/logout` without the `X-CSRF-Token`
      header → `403`
- [ ] Logging out → cookie cleared, redirected to `/login.html`, private
      routes inaccessible again
- [ ] Using an expired session (set `SESSION_DURATION_HOURS` very low to
      test) → treated as logged out
- [ ] Trying to bypass login via browser DevTools (viewing page source,
      forging the cookie, calling `/api/*` directly) → every check
      happens server-side, so client tampering has no effect
