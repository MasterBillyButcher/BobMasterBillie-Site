# BobMasterBillie — Reference site

A single-page reference site: command sheets, live-stream prompts,
live veto-rights counters, a real add/remove movie backlog, and
outreach templates. Content lives in Supabase and updates live for
anyone with the page open — no refresh needed. Editing is gated by one
shared password (not individual logins).

Plain HTML/CSS/JS for the page itself, no framework, no build step.
Three small Vercel Functions handle the password check and the actual
database writes, since that can't happen safely in the browser (see
"How the password protection actually works" below).

The page shows a dashboard-style overview grid of all sections by
default — click one to see just that section, full-width, with a
"← All sections" link back. Nothing scrolls past everything else the
way an all-on-one-page layout would.

## Setup, start to finish (from a brand new Supabase project)

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a new project.
Note the database password it asks you to set — you won't need it day
to day, but keep it somewhere.

### 2. Run the three SQL files, in this order

In Supabase's **SQL Editor → New query**, paste and run each of these
as a separate query, in this exact order (later ones don't depend on
earlier ones existing, but running them in this order matches the
numbering below and is easiest to follow):

1. **`sql/reference-sections.sql`** — creates the `reference_sections`
   table, sets it so anyone can read it but nobody can write to it
   directly from a browser, and seeds/syncs the 7 sections' text
   content. Safe to re-run any time — uses `ON CONFLICT DO UPDATE`, so
   re-running always brings content back to match this file. **This
   cuts both ways**: if you've since edited a section through the
   page, re-running this file overwrites that edit back to the
   original wording. Only re-run it if you want that.
2. **`sql/reference-counters.sql`** — creates `reference_counters`
   (the live veto-rights numbers) and the atomic
   `adjust_reference_counter()` function. Safe to re-run — uses
   `ON CONFLICT DO NOTHING`, so it never resets a real count.
3. **`sql/backlog-items.sql`** — creates `backlog_items` (the real,
   addable/removable movie list). Starts empty — the original doc's
   placeholder tags never had real titles, so there's nothing genuine
   to seed. Safe to re-run.

### 3. Get your keys

In Supabase, go to **Project Settings → API Keys**. You need two:

- **Publishable key** (or the legacy `anon` `public` key) — safe to be
  public, goes in `js/config.js`.
- **Secret key** (or the legacy `service_role` key) — privileged, it
  bypasses every access rule on your database. Goes **only** in a
  Vercel environment variable, never in any file in this repo.

### 4. Fill in `js/config.js`

```js
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-publishable-or-anon-key";
```

This file is loaded in the browser and is meant to be public — it's
the RLS policies from step 2, not secrecy of this key, that protect
the data.

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
   empty — nothing here needs a build step, Vercel just needs to see
   the `/api` folder to turn it into serverless functions.
3. Before clicking Deploy, add three **Environment Variables**
   (Settings → Environment Variables):
   - `EDIT_PASSWORD` — whatever password you want to gate editing with
   - `SUPABASE_URL` — same URL as in `js/config.js`
   - `SUPABASE_SERVICE_ROLE_KEY` — the **secret** key from step 3,
     never the publishable one
4. Deploy.

### 7. Try it

Open your Vercel URL. Click **🔒 Unlock editing** in the sidebar,
enter the password from step 6. You'll get:

- Edit/Delete on every section, and a **+ Add a section** card on the
  overview grid
- **−/+** buttons next to each veto-rights number
- **Add** / **Remove** on the movie backlog, with a live count badge

## How the password protection actually works

If the password check happened in the page's JavaScript, it wouldn't
protect anything — anyone can open dev tools and read it straight out
of the code, or skip the check and write to the database directly
using the public key. A password only means something if it's checked
somewhere a visitor can't see.

That's what the three files in `api/` are: tiny functions that run on
Vercel's servers, not in the browser. `EDIT_PASSWORD` and
`SUPABASE_SERVICE_ROLE_KEY` are only ever read inside those files —
the browser never receives them, so there's nothing to find by viewing
page source.

- **`verify-password.js`** — checks the password when you click
  "Unlock editing." Doesn't write anything, just tells the page yes/no.
- **`save-section.js`** — the only thing that writes to
  `reference_sections`. Re-checks the password independently, then
  writes using the service-role key.
- **`adjust-counter.js`** — the only thing that writes to
  `reference_counters`. The actual increment happens as one atomic SQL
  statement (`GREATEST(0, value + delta)`), so two people clicking at
  nearly the same moment can't race each other into a wrong number —
  there's no "read the value, then write it back" step a second click
  could land in the middle of.
- **`backlog.js`** — the only thing that writes to `backlog_items`.
  Handles both adding a title and removing one by id.

## File map

```
index.html                    the whole page — overview grid, single-section
                               view, all client-side logic
js/config.js                   Supabase URL + publishable/anon key
sql/reference-sections.sql     reference_sections table + RLS + seed text content
sql/reference-counters.sql     reference_counters table + atomic increment
                                function + seed veto-rights counters
sql/backlog-items.sql          backlog_items table + RLS, starts empty
package.json, package-lock.json   exist only so Vercel installs
                                @supabase/supabase-js for /api — the page
                                itself needs no build step, no dependencies
api/
  verify-password.js            checks EDIT_PASSWORD, read-only
  save-section.js                 writes to reference_sections
  adjust-counter.js                writes to reference_counters
  backlog.js                       writes to backlog_items
favicon.ico, apple-touch-icon.png
```

## Known limitations

- **One shared password, not individual accounts.** Anyone with the
  password can edit or delete anything on the page — there's no way to
  tell who made a given change, and no per-person access levels.
- **Raw HTML editing** for section text — a plain textarea, not a
  rich-text editor. The movie backlog and veto counters don't have
  this problem, they're plain forms/buttons.
- **No edit history.** Saving overwrites previous content with no
  version history or undo beyond your own copy-paste discipline.
- **No offline handling.** A dropped connection mid-save shows a toast
  error, not an automatic retry.

## Status — what's actually been verified

**Unit-tested, not deployed:** all four `/api` functions were tested
directly with mocked requests — wrong password, missing env vars,
invalid input (bad slugs/ids, non-integer or oversized counter deltas,
empty/oversized movie titles), wrong HTTP method — all correctly
rejected with the right status code. `@supabase/supabase-js` was
confirmed to install and resolve correctly. **Not tested:** the actual
database reads/writes once a request passes every check, or the whole
thing end-to-end on a real Vercel deployment (env vars actually set,
realtime updates actually firing across two open tabs, the atomic
counter function actually preventing a race under real concurrent
clicks). This sandbox has no network path to Supabase or Vercel to
verify further than that.

If something breaks after deployment, check the Vercel Function's
logs first (Vercel dashboard → your project → Deployments → the
function) — the actual Supabase error will show up there.
