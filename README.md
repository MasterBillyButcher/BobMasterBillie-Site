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

## Content sections

Every section — Twitch, Nightbot, Custom Commands, Predictions,
Channels, Stream Notes, Backlog, Veto Power, Quick Links, CV — is just a
plain text document, like a Word doc or Google Doc per page. One big
textarea, autosaves 1.5s after you stop typing (plus an explicit Save
button and save-on-blur so nothing gets lost switching tabs). Backed by
one row per section in a `dashboard_docs` table in Supabase (same
lockdown pattern as `dashboard_auth`: RLS on, no anon/authenticated
policies, server-side only).

The actual editor logic lives once in `public/js/doc.js`; each page is
just a `<textarea>` inside a `data-doc-editor` wrapper naming its
section. The Dashboard home page lists all ten sections with their
last-edited time, pulled from `/api/docs`.

There's no structured fields, no add/edit/delete forms, no per-item
anything — just type, and it saves. Exactly like using a Word doc to
jot things down, just in the browser and organized by section.

### Navigation & keyboard

- **Cmd/Ctrl + K** — quick-jump palette; type to filter, arrows to move,
  Enter to go.
- **g then 1–9** — jump straight to a section by position.
- **e** — toggle edit mode on the current page.
- **/** — focus the Dashboard search box.
- **?** — keyboard shortcut cheatsheet (also reachable from the sidebar).
- **Esc** — close any overlay.
- Shortcuts are ignored while you're typing in a field, so they never
  collide with the editor.

### Pinned sections

Click the pin icon next to any page title to float that section into a
"Pinned" group at the top of the sidebar. Pins are stored per-browser in
localStorage — they're a viewing preference, not content, so they don't
touch the database.

### Mobile

Below 860px the sidebar becomes a proper slide-in drawer with a sticky
top bar and hamburger toggle (tap the scrim or ✕ to close), the toolbar
buttons wrap to full width, cards go single-column, and the per-row copy
icons stay permanently visible since there's no hover on touch.

### Print / PDF

A "Print" button on every page (and on the Dashboard) opens the browser
print dialog — choose "Save as PDF" there to export. The print stylesheet
strips the sidebar, toolbars, and icons, switches to black-on-white, and
avoids breaking sections across pages. If you're mid-edit, it saves and
switches to the formatted view first so you never print a raw textarea.

### Per-page extras

- **Color identity per section** — Twitch, Nightbot, Commands, etc. each
  get their own accent color, used consistently in the sidebar icon, the
  page header icon, the palette, and the dashboard card.
- **Structured view** — content isn't dumped as a flat text block.
  Standalone short lines become titles, the first line of a group
  becomes a section header, `term → description` lines render as a
  command chip + description, and `•`/`-`/`1.` lines render as proper
  list items. This is a light heuristic (not full markdown), so content
  that doesn't fit the pattern falls back to plain paragraphs.
- **Copy support** — a "Copy" button grabs the whole page's text;
  hovering any `term → description` row reveals a copy icon that copies
  just that term (handy for pasting a command into Twitch or Nightbot).
- **Double-click to select works properly** — the view pane doesn't swap
  into edit mode on click, so normal text selection behaves as expected.
- **View / Edit toggle** — "Edit" switches to a monospace textarea so
  command syntax lines up; "Done" saves and returns to the formatted view.
- **Counters as badges** — word count, character count, and estimated
  reading time as separate pills.
- **Undo last save** — every save keeps the previous version; the button
  appears only when there's something to revert to.
- **Ctrl/Cmd + S** — saves immediately instead of the browser's
  save-page dialog.
- **Unsaved changes warning** before closing the tab mid-edit.
- **Download** — that page's content as a `.txt` file.
- Leading/trailing blank lines are trimmed on save; internal spacing is
  left alone.

### Dashboard extras

- **Colored, icon-badged cards** matching the sidebar.
- **Content previews** — a snippet of what's actually in each section.
- **Search** across the full text of every section at once, with
  match snippets.
- **Export all as .txt** — everything in one file, headed by section.
- **Print** — the whole overview, print-styled.

## Setup — no local commands needed

You can set the dashboard password entirely through the deployed site.

1. **Create the Supabase tables.** Run this in Supabase → SQL Editor:
   ```sql
   create table if not exists public.dashboard_auth (
     id integer primary key default 1,
     password_hash text not null,
     password_version integer not null default 1,
     updated_at timestamptz not null default now(),
     constraint dashboard_auth_single_row check (id = 1)
   );
   alter table public.dashboard_auth enable row level security;

   create table if not exists public.dashboard_docs (
     section text primary key,
     content text not null default '',
     previous_content text,
     previous_updated_at timestamptz,
     updated_at timestamptz not null default now()
   );
   alter table public.dashboard_docs enable row level security;

   -- No CREATE POLICY statements on either table: default-deny.

   -- If you already had dashboard_docs from an earlier version, just
   -- add the two new columns instead of recreating the table:
   -- alter table public.dashboard_docs add column if not exists previous_content text;
   -- alter table public.dashboard_docs add column if not exists previous_updated_at timestamptz;

   -- If you previously created dashboard_items for an earlier version,
   -- it's unused now and can be dropped:
   -- drop table if exists public.dashboard_items;
   ```
   (Same content as `supabase/schema.sql`. Safe to run again if
   `dashboard_auth` already exists — `create table if not exists` just
   skips it.)
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
