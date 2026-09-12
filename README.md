# BobMasterBillie — Reference site

A single-page reference site: command sheets with click-to-copy lines,
live-stream prompts, a real add/remove veto-power tracker with a
running total, a movie/show backlog with platform/duration/language,
and outreach templates. Content lives in Supabase and updates live for
anyone with the page open — no refresh needed. Editing is gated by one
shared password (not individual logins).

Plain HTML/CSS/JS for the page itself, no framework, no build step.
Four small Vercel Functions handle the password check and the actual
database writes, since that can't happen safely in the browser (see
"How the password protection actually works" below).

The page shows a dashboard-style overview grid of all sections by
default — click one to see just that section, full-width, with a
"← All sections" link back. Nothing scrolls past everything else the
way an all-on-one-page layout would.

## Setup, start to finish (from a brand new Supabase project)

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a new project.
Note the database password it asks you to set.

### 2. Run the four SQL files, in this order

In Supabase's **SQL Editor → New query**, paste and run each as a
separate query, in this order:

1. **`sql/reference-sections.sql`** — creates `reference_sections`,
   sets it so anyone can read it but nobody can write to it directly
   from a browser, and seeds/syncs the 7 sections' text content. Safe
   to re-run — uses `ON CONFLICT DO UPDATE`, so re-running always
   brings content back to match this file. **This cuts both ways**: if
   you've since edited a section through the page, re-running this
   overwrites that edit back to the original wording.
2. **`sql/veto-entries.sql`** — creates `veto_entries` (any number of
   viewers, each with an addable/removable/adjustable veto count) and
   the atomic `adjust_veto_entry()` function. Safe to re-run — uses
   `ON CONFLICT DO NOTHING` for the two starter entries, so it never
   resets a real count.
3. **`sql/backlog-items.sql`** — creates `backlog_items` (title, kind,
   platform, duration, language). Starts empty. Safe to re-run.
4. **`sql/auth-attempts.sql`** — creates `auth_attempts`, which the
   rate-limiting on every `/api` function depends on. Safe to re-run.
   If this hasn't been run yet, the site still works — rate limiting
   fails open rather than locking everyone out over a missing table —
   but the password check has no brute-force protection until it has.

### 3. Get your keys

Supabase → **Project Settings → API Keys**:

- **Publishable key** (or legacy `anon` `public` key) — safe to be
  public, goes in `js/config.js`.
- **Secret key** (or legacy `service_role` key) — privileged, bypasses
  every access rule. Goes **only** in a Vercel environment variable,
  never in any file in this repo.

### 4. Fill in `js/config.js`

```js
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-publishable-or-anon-key";
```

### 5. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

### 6. Deploy on Vercel

1. **Add New → Project** → pick your repo.
2. Framework preset: **Other**. Leave build/output/install commands
   empty.
3. Add three **Environment Variables** before deploying:
   - `EDIT_PASSWORD` — whatever password gates editing
   - `SUPABASE_URL` — same as in `js/config.js`
   - `SUPABASE_SERVICE_ROLE_KEY` — the **secret** key from step 3
4. Deploy.

### 7. Try it

Click **🔒 Unlock editing**, enter the password. You get:

- Edit text / Delete on every section, **+ Add a section** on the
  overview grid
- Veto Power: add a viewer, **−/+** their count, remove them, a
  running **Total veto power** line that updates as you go
- Movie Backlog: an add form (title, movie/show, platform, duration,
  language), remove per item, a live "X left to watch" count
- A small **⧉** copy icon on every command/prompt line and every
  chat-message template, for anything you'll paste into chat more
  than once

## Security hardening

Two things added after an outside review of the original design:

- **Rate limiting on the password check.** A password that can be
  guessed at unlimited speed isn't really protecting anything. Every
  `/api` function now checks `auth_attempts` first — after 10 wrong
  guesses from the same IP in 15 minutes, further attempts (even
  correct ones) are rejected with a 429 until the window passes. See
  `api/_lib/rate-limit.js`. If `sql/auth-attempts.sql` hasn't been run
  yet, this fails open (allows the request through) rather than
  locking everyone out over a missing table — worth running that file
  before relying on the protection.
- **Content sanitization on render.** Section content is raw HTML,
  editable by anyone with the shared password. If that password were
  ever guessed or leaked, the worst case shouldn't be "arbitrary
  JavaScript now runs in every visitor's browser." Every bit of
  content gets run through DOMPurify (loaded via CDN, same pattern as
  supabase-js) against an allowlist matching exactly what this site's
  content actually uses, before it's ever inserted into the page.
  `<script>` tags, `onclick`/`onerror`/etc. attributes, `javascript:`
  URLs, and `<iframe>`s are stripped regardless of what got saved to
  the database. This was verified directly — actual XSS payloads
  (script injection, event-handler injection, iframe injection) were
  run through the real sanitizer and confirmed neutralized, and the
  real seed content was confirmed to pass through byte-for-byte
  unchanged.

What this doesn't fix, because it can't be fixed from outside a real
deployment: whether the live database writes, realtime sync, and
atomic functions actually behave correctly under real concurrent use.
See "Status" below.

## How the password protection actually works

If the password check happened in the page's JavaScript, it wouldn't
protect anything — dev tools would show it, or someone could skip the
check and write to the database directly with the public key. A
password only means something if it's checked somewhere a visitor
can't see.

The four files in `api/` run on Vercel's servers, not the browser.
`EDIT_PASSWORD` and `SUPABASE_SERVICE_ROLE_KEY` are only ever read
inside those files — the browser never receives them.

- **`verify-password.js`** — checks the password for "Unlock editing."
  Read-only.
- **`save-section.js`** — the only thing that writes to
  `reference_sections`.
- **`veto.js`** — the only thing that writes to `veto_entries`.
  Add/remove are plain inserts/deletes; the +/- adjustment goes
  through `adjust_veto_entry()`, one atomic SQL statement, so two
  people clicking the same person's counter at nearly the same moment
  can't race each other into a wrong number.
- **`backlog.js`** — the only thing that writes to `backlog_items`.

All four re-check the password independently — none of them trust a
client's claim that it already unlocked editing.

## File map

```
index.html                    overview grid, single-section view, veto/backlog
                               widgets, copy-line behavior, content sanitization,
                               all client-side logic
js/config.js                   Supabase URL + publishable/anon key
sql/reference-sections.sql     reference_sections table + RLS + seed text content
sql/veto-entries.sql            veto_entries table + atomic adjust function + seed
sql/backlog-items.sql           backlog_items table + RLS, starts empty
sql/auth-attempts.sql           auth_attempts table (rate-limit bookkeeping only)
package.json, package-lock.json   exist only so Vercel installs
                                @supabase/supabase-js for /api
api/
  _lib/rate-limit.js             shared rate-limit helper, used by all 4 below
                                  (underscore prefix keeps Vercel from making
                                  this its own route — it's a library, not an
                                  endpoint)
  verify-password.js            checks EDIT_PASSWORD, rate-limited, read-only
  save-section.js                 writes to reference_sections, rate-limited
  veto.js                          writes to veto_entries, rate-limited
  backlog.js                       writes to backlog_items, rate-limited
favicon.ico, apple-touch-icon.png
```

## Known limitations

- **One shared password, not individual accounts** — no way to tell
  who made a given change, no per-person access levels.
- **Raw HTML editing** for section text (the free-text sections, not
  veto power or the movie backlog, which have real forms).
- **No edit history** — saves overwrite, no version history or undo.
- **No offline handling** — a dropped connection mid-save shows a
  toast error, not an automatic retry.

## Status — what's actually been verified

**Unit-tested, not deployed:** all four `/api` functions were tested
directly with mocked requests — wrong password, missing env vars,
invalid input (bad slugs/ids, non-integer or oversized deltas, empty
or oversized titles/usernames), unknown actions, wrong HTTP method —
all correctly rejected with the right status code.
`@supabase/supabase-js` was confirmed to install and resolve
correctly. **Not tested:** the actual database reads/writes once a
request passes every check, or the whole thing end-to-end on a real
Vercel deployment (env vars actually set, realtime updates actually
firing across two open tabs, the atomic functions actually preventing
a race under real concurrent clicks). This sandbox has no network path
to Supabase or Vercel to verify further than that.

If something breaks after deployment, check the Vercel Function's
logs first (Vercel dashboard → your project → Deployments → the
function) — the actual Supabase error will show up there.
