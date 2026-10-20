# 🟣 BobMasterBillie — Command Center

The whole community doc, live in the browser. Built for **@BobMasterBillie** — Twitch
predictions you copy-paste straight into chat, separate Veto Power & VIP boards with monthly
VIP events, a movie planner calendar, the full Twitch/Nightbot command reference, CV templates,
and an **auto-written activity log** that records every single update.

## ✨ Features

| Section | What it does |
|---------|--------------|
| 📊 **Dashboard** | **Backlog Count (+/−)** up top — +1 per bits goal completed, −1 per movie watched, so you never watch more or less than expected. Then Movies to Watch, Movies Watched, an editable backlog ledger, announcements, pinned prediction copy buttons — and the **movie calendar at the bottom** |
| 🗳️ **Predictions** | One clean **copy-paste block ready to start a prediction**: the command, title, options and duration — nothing extra. Per-field copies with Twitch char limits (title 45, options 25). Mark predictions used with an outcome. |
| 🚫 **Veto Power** | Per-viewer cards (Chad, Lolwazi, …) with +/− active veto rights |
| ⭐ **VIP Board** | Separate from veto — VIP members, monthly VIP events (grant / one-chance / revoke / earn-back), history grouped by month |
| 🎬 **Movie Backlog** | Movies are **planned / watching / watched** — plan movies on real calendar dates, click any day to see its movies + logged updates. Marking a movie watched auto-adds a −1 to the backlog count |
| 🎮 **Commands** | Every Twitch, Nightbot and custom command from the doc — searchable, one-tap copy |
| 📖 **CV Templates** | Discord & Streaming Moderator application templates with copy buttons |
| 📜 **Activity Log** | Every change anywhere in the app is auto-logged; filter by type, pin, or write manual log entries |

Every mutation (movie added, veto changed, VIP granted, prediction used…) writes an entry to the
Activity Log automatically — "every log and every update" lives here, not in a doc.

---

## 🚀 Deploy it free: GitHub + Supabase + Vercel

The app is a standard **Next.js 16** project using **Prisma**. Locally it runs on SQLite; in
production it connects to **Supabase Postgres** (free tier) — file databases don't survive on
Vercel serverless, which is why we switch.

### Step 1 — Create the Supabase database (free)

1. Go to [supabase.com](https://supabase.com) → **New project** (free plan is fine).
2. Open the **SQL Editor** in the Supabase dashboard.
3. Paste the contents of [`supabase/init.sql`](supabase/init.sql) → **Run**. This creates all tables.
4. Paste the contents of [`supabase/seed.sql`](supabase/seed.sql) → **Run**. This fills in your
   movies, predictions, veto board, VIP board, announcements and log history.
5. Get your connection string: **Project Settings → Database → Connection string →
   Connection pooling** (port `6543`). It looks like:
   ```
   postgresql://postgres.<project-ref>:<YOUR-PASSWORD>@aws-0-<region>.pooler.supabase.com:6543/postgres
   ```
   Append `?pgbouncer=true&connection_limit=1` to the end (needed for serverless).
   Keep this string secret — you'll paste it into Vercel in Step 3.

### Step 2 — Push the code to GitHub

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
> **"uploading an existing file"** flow (drag-and-drop the project files).
> `.env` is git-ignored — your local database never gets uploaded. ✅

### Step 3 — Deploy on Vercel (free)

1. Go to [vercel.com](https://vercel.com) → **Add New… → Project** → import your GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Don't touch the build command —
   [`vercel.json`](vercel.json) already points Prisma at the Postgres schema.
3. Add the environment variable:
   - **Key:** `DATABASE_URL`
   - **Value:** the Supabase pooled connection string from Step 1
4. Click **Deploy**. 🎉

Your Command Center will be live at `https://<your-project>.vercel.app` — open it, and every
change you make saves to Supabase and appears in the Activity Log.

### Step 4 — Keep it alive

- **Supabase free projects pause after ~1 week of inactivity** — open the dashboard once a
  week (or stream more 😄) to keep it awake. Restoring is one click.
- Vercel's free "Hobby" tier covers personal projects like this one.
- Every future `git push` to `main` auto-redeploys the site.

---

## 🛠️ Local development (optional)

```bash
bun install          # or npm install
bun run db:push      # create the local SQLite database
bun run scripts/seed.ts   # load the initial data
bun run dev          # start on http://localhost:3000
```

Reset the data anytime with `bun run scripts/seed.ts` (it wipes and re-seeds the local DB).

## 📁 Project structure

```
prisma/schema.prisma            # local dev schema (SQLite)
prisma/schema.postgres.prisma   # production schema (Supabase Postgres)
supabase/init.sql               # create production tables
supabase/seed.sql               # production seed data
src/app/api/…                   # REST API (movies, predictions, vetoes, vips, vip-events, logs, announcements)
src/components/center/…         # Dashboard, Predictions, Veto, VIP, Movie Calendar, Commands, CV, Activity Log
src/lib/commands-data.ts        # Twitch / Nightbot / custom command reference data
scripts/seed.ts                 # local dev seed script
```
