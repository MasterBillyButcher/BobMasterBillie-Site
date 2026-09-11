# BobMasterBillie — Reference site

A single-page reference site: command sheets, live-stream prompts,
tracker tables, and outreach templates. Content lives in Supabase and
updates live for anyone with the page open — no refresh needed.
Editing is gated by one shared password (not individual logins).

Plain HTML/CSS/JS for the page itself, no framework, no build step.
Two small Vercel Functions handle the password check and the actual
database write, since that can't happen safely in the browser (see
"How the password protection actually works" below).

## Setup, start to finish

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com), create a new project.
2. Note the database password it asks you to set — you won't need it
   day to day, but keep it somewhere.

### 2. Create the table

1. In Supabase, open the **SQL Editor** → **New query**.
2. Paste in the entire contents of `sql/reference-sections.sql` and
   click **Run**.
3. This creates the `reference_sections` table (if it doesn't already
   exist), sets it so anyone can read it but nobody can write to it
   directly from a browser, and seeds/syncs the 7 sections' content.
   Safe to re-run any time — it uses `ON CONFLICT DO UPDATE`, so
   running it again always brings the content back to what's in this
   file, rather than silently skipping rows that already exist. **This
   cuts both ways** — if you've since edited any section through the
   page itself, re-running this file overwrites that edit back to the
   original wording. Only re-run it if you actually want that.

### 3. Get your keys

In Supabase, go to **Project Settings → API Keys**. You need two:

- **Publishable key** (or the legacy `anon` `public` key) — safe to be
  public, goes in `js/config.js`.
- **Secret key** (or the legacy `service_role` key) — this one is
  privileged, it bypasses every access rule on your database. It goes
  **only** in a Vercel environment variable, never in any file in
  this repo.

### 4. Fill in `js/config.js`

Open `js/config.js` and replace the placeholders:

```js
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-publishable-or-anon-key";
```

This file is loaded in the browser and is meant to be public — it's
the RLS policy from step 2, not secrecy of this key, that protects
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
enter the password from step 6. You'll get Edit/Delete on every
section, and a **+ Add a new section** button at the bottom.

## How the password protection actually works

If the password check happened in the page's JavaScript, it wouldn't
protect anything — anyone can open dev tools and read it straight out
of the code, or skip the check and write to the database directly
using the public key. A password only means something if it's checked
somewhere a visitor can't see.

That's what `api/verify-password.js` and `api/save-section.js` are:
tiny functions that run on Vercel's servers, not in the browser. The
`EDIT_PASSWORD` and `SUPABASE_SERVICE_ROLE_KEY` env vars are only ever
read inside those two files — the browser never receives them, so
there's nothing to find by viewing page source.

- `verify-password.js` — checks the password when you click "Unlock
  editing." Doesn't write anything, just tells the page yes/no.
- `save-section.js` — the only thing that writes to the database. It
  re-checks the password itself (never trusts that the page already
  unlocked), and only writes if it matches, using the service-role
  key to bypass the "nobody can write directly" rule from the table's
  RLS policy.

## File map

```
index.html          the whole page — content, styling, and all client-side logic
js/config.js         Supabase URL + publishable/anon key (fill in from step 4)
sql/reference-sections.sql   creates the table + RLS policies + seed content
package.json          exists only so Vercel installs @supabase/supabase-js
                       for the two functions below — the page itself needs
                       no build step and no dependencies
api/
  verify-password.js   checks EDIT_PASSWORD, read-only
  save-section.js       the only thing that writes to the database
favicon.ico, apple-touch-icon.png
```

## Known limitations

- **One shared password, not individual accounts.** Anyone with the
  password can edit or delete any section — there's no way to tell
  who made a given change, and no per-person access levels. If you
  need that, it's a real step up in complexity (real user accounts,
  per-user RLS), not something this version does.
- **Raw HTML editing.** The edit form is a plain textarea of HTML, not
  a rich-text editor. Fine if you're comfortable with basic HTML tags;
  not friendly for someone who isn't.
- **No edit history.** Saving overwrites the previous content with no
  version history or undo beyond your own copy-paste discipline.
- **No offline handling.** If the network drops mid-save, you'll see
  a toast error, not an automatic retry.

## Status — what's actually been verified

**Unit-tested, not deployed:** `api/verify-password.js` and
`api/save-section.js` were tested directly with mocked requests —
wrong password, missing env vars, invalid input, wrong HTTP method all
correctly rejected with the right status code. `@supabase/supabase-js`
was confirmed to install and resolve correctly. **Not tested:** the
actual database write once a request passes every check, or the whole
thing end-to-end on a real Vercel deployment (env vars actually set,
realtime updates actually firing across two open tabs). This sandbox
has no network path to Supabase or Vercel to verify further than that.

If something breaks after deployment, check the Vercel Function's
logs first (Vercel dashboard → your project → Deployments → the
function) — the actual Supabase error will show up there.
