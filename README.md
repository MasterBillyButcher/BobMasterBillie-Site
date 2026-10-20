# BobMasterBillie Command Center

The whole community doc, live in the browser. Built for **@BobMasterBillie**: Twitch
prediction setups you copy-paste straight into chat, separate Veto Power and VIP boards with
monthly VIP events, a movie planner calendar, the full Twitch/Nightbot command reference,
moderation CV templates, and an auto-written activity log that records every single update.

## Features

| Section | What it does |
|---------|--------------|
| Dashboard | Backlog Count (+/-) up top: +1 per bits goal completed, -1 per movie watched, so you never watch more or less than expected. Movies to Watch, Movies Watched, an editable backlog ledger with one-tap buttons (date is added automatically), announcements, pinned prediction copy buttons, and the movie calendar at the bottom |
| Predictions | One clean copy-paste block ready to start a prediction: the command, title, options and duration, nothing extra. Per-field copies with Twitch char limits (title 45, options 25). Mark predictions used with an outcome |
| Veto Power | Per-viewer cards (Chadboy_hz, Lolwazi, and more) with +/- active veto rights |
| VIP Board | Separate from veto: VIP members, monthly VIP events (grant / one-chance / revoke / earn-back), history grouped by month, plus a built-in VIP Prediction generator: a ready-to-start Twitch prediction about a member's VIP fate with one copy button, saved to the Predictions board if you want it tracked |
| Movie Backlog | Movies are planned / watching / watched. Plan movies on real calendar dates, click any day to see its movies and logged updates. Marking a movie watched auto-adds a -1 to the backlog count |
| Commands | Every Twitch, Nightbot and custom command from the doc, searchable, one-tap copy |
| CV Templates | Discord and Streaming Moderator application templates with copy buttons |
| Activity Log | Every change anywhere in the app is auto-logged; filter by type, pin, or write manual log entries |

Every mutation (movie added, veto changed, VIP granted, prediction used) writes an entry to the
Activity Log automatically, so "every log and every update" lives here, not in a doc.

The site is read-only for visitors: an admin password (the `ADMIN_PASSWORD` environment
variable) must be entered once with the Locked button in the header before anything can be
edited. Viewing is always open.

The site also ships a favicon, a Terms & Conditions page (`/terms`) and a Privacy Policy page
(`/privacy`), both linked from the footer.

## Deploy it free: GitHub + Supabase + Vercel

The app is a standard **Next.js 16** project using **Prisma**. Locally it runs on SQLite; in
production it connects to **Supabase Postgres** (free tier), because file databases don't
survive on Vercel serverless.

### Step 1: Create the Supabase database (free)

1. Go to [supabase.com](https://supabase.com) and create a **New project** (free plan is fine).
2. Open the **SQL Editor** in the Supabase dashboard.
3. Paste the contents of [`supabase/init.sql`](supabase/init.sql) and click **Run**. This
   creates all 8 tables.
4. Paste the contents of [`supabase/seed.sql`](supabase/seed.sql) and click **Run**. This adds
   only the real community data: the two veto contenders (Lolwazi, Chadboy_hz) and the VIP
   board entry (mickey_17__, one more chance). No setup movies, no setup activity logs -
   you add those yourself in the app, and every action is auto-logged from then on.
5. Already ran an older seed and your live site shows setup data (demo movies, "Backlog
   tracker live" logs, etc.)? Run
   [`supabase/clear-data.sql`](supabase/clear-data.sql) in the SQL Editor first, then run
   `seed.sql`. clear-data wipes every table but keeps them. This cannot be undone, so only
   run it when you are sure.
6. Get your connection string: **Project Settings -> Database -> Connection string ->
   Connection pooling** (port `6543`). It looks like:
   ```
   postgresql://postgres.<project-ref>:<YOUR-PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
   Append `?pgbouncer=true&connection_limit=1` to the end (needed for serverless).
   Keep this string secret, you will paste it into Vercel in Step 3.

### Step 2: Push the code to GitHub

```bash
# from this project folder
git init
git add .
git commit -m "BobMasterBillie Command Center"
git branch -M main
git remote add origin https://github.com/<your-username>/bobmasterbillie-command-center.git
git push -u origin main
```

> Don't want the terminal? Create the repo on github.com, then use GitHub's
> "uploading an existing file" flow (drag-and-drop the project files).
> `.env` is git-ignored, so your local database never gets uploaded.

### Step 3: Deploy on Vercel (free)

1. Go to [vercel.com](https://vercel.com), click **Add New -> Project** and import your GitHub
   repo.
2. Framework preset: **Next.js** (auto-detected). Don't touch the build command:
   [`vercel.json`](vercel.json) already points Prisma at the Postgres schema.
3. Connect the database. Two ways that both work:
   - **Supabase x Vercel integration:** connect the two projects from the Vercel
     "Integrations" or Supabase "Connect" flow. It creates `POSTGRES_PRISMA_URL` and friends
     automatically, and the site reads those, so nothing else is needed, or
   - **Manual variable:** add `DATABASE_URL` with the Supabase pooled connection string from
     Step 1.
   The site checks `DATABASE_URL` first, then `POSTGRES_PRISMA_URL`, then `POSTGRES_URL`, so
   any of the three connects it.
4. Add the admin password variable:
   - **Key:** `ADMIN_PASSWORD`
   - **Value:** any strong password you choose. The site is READ-ONLY until this password is
     entered with the Locked button in the header. Everyone can view; only the password
     holder can change anything.
5. Click **Deploy**.

Your Command Center will be live at `https://<your-project>.vercel.app`. Open it, and every
change you make saves to Supabase and appears in the Activity Log.

### Step 3.5: Verify the database connection

Open `https://<your-project>.vercel.app/api/health`. You should see:

```json
{ "status": "ok", "database": "connected", "counts": { "movies": 0, ... } }
```

All counts start at 0 - that is correct, the site is clean and waiting for your data. If you
get `"database": "unreachable"` instead, the `DATABASE_URL` in Vercel is wrong or
`init.sql` was not run - fix that and redeploy.

### Step 4: Keep it alive

- **Supabase free projects pause after about a week of inactivity.** Open the dashboard once a
  week (or stream more) to keep it awake. Restoring is one click.
- Vercel's free "Hobby" tier covers personal projects like this one.
- Every future `git push` to `main` auto-redeploys the site.

## Local development (optional)

```bash
bun install               # or npm install
bun run db:push           # create the local SQLite database
bun run dev               # start the dev server
```

The local database starts empty too. To wipe everything and start over, run
`bun run scripts/seed.ts` (it clears all tables and inserts nothing).

## Project structure

```
prisma/schema.prisma            # local dev schema (SQLite)
prisma/schema.postgres.prisma   # production schema (Supabase Postgres)
supabase/init.sql               # create production tables
supabase/clear-data.sql         # wipe all production data (one-time reset)
supabase/seed.sql               # veto contenders + VIP entry only (no setup logs)
src/app                         # pages: dashboard (/), terms, privacy + favicon
src/app/api                     # REST API (movies, predictions, vetoes, vips, vip-events, backlog-events, logs, announcements, health)
src/components/center           # Dashboard, Predictions, Veto, VIP, Movie Calendar, Commands, CV, Activity Log
src/components/ui               # the 15 shadcn/ui primitives actually used
src/lib/commands-data.ts        # Twitch / Nightbot / custom command reference data
scripts/seed.ts                 # local dev seed script
```
