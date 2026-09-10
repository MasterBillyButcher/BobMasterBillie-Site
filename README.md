# BobMasterBillie console (static HTML/CSS/JS + Supabase)

A plain HTML/CSS/JS version of the manager/mod console, no Next.js, no
build step, no server of any kind. It talks to Supabase directly from
the browser. Deploy it by uploading these files anywhere that serves
static files (Netlify, GitHub Pages, Vercel's static hosting, or your
own web host), there's nothing to build.

## How this is secured, since there's no server

With no server, there's no server-side password check possible. This
uses Supabase's own login system instead: you create a real user
account in Supabase, sign in with that email and password, and Supabase
issues a session token that the database checks on every request. The
database itself (via Row Level Security policies) refuses to read or
write anything unless that valid session is present. That's real
security, a client-side-only password would not be, since anyone can
read the JavaScript source and see it.

## Setup, start to finish

### 1. Create the Supabase project and database

1. Go to [supabase.com](https://supabase.com), sign up or log in,
   click **New Project**. Choose the free plan.
2. Once it's ready, open the **SQL Editor**, paste in the entire
   contents of `sql/schema.sql`, and click **Run**. This creates all
   nine tables and one example client.
3. Still in the SQL Editor, run a **new query** with the entire
   contents of `sql/policies.sql`. This is what allows a logged-in
   user to actually read and write the data, without it every request
   gets silently blocked.
4. Still in the SQL Editor, run a **new query** with the entire
   contents of `sql/functions.sql`. The dashboard's toggle buttons
   (live status, hype/treasure train, VIP resolved, veto count,
   ticket status, invoice status) call these as Postgres RPC
   functions, they will fail with an "RPC not found" error until this
   is run.

### 2. Create your login

1. In Supabase, go to **Authentication > Users**, click **Add user**,
   and create yourself an account with an email and password. (Turn
   off "auto confirm user" only if you've set up email sending,
   otherwise leave auto-confirm on so you can log in immediately.)
2. This is the email and password you'll use on `login.html`. Add one
   user per person who needs access, everyone with a Supabase Auth
   account in this project can fully manage every client, there's no
   per-user permission split in this version.

### 3. Connect the site to your project

1. In Supabase, go to **Project Settings > API**.
2. Open `js/config.js` in this project and fill in:
   - `SUPABASE_URL`: your Project URL
   - `SUPABASE_ANON_KEY`: the **anon / public** key (not service_role)

   It's fine that this file is publicly readable once deployed, the
   anon key is meant to be public, the RLS policies from step 1 are
   what actually protects the data.

### 4. Deploy

Any static host works. Two easy options:

- **Netlify**: drag this whole folder onto
  [app.netlify.com/drop](https://app.netlify.com/drop).
- **Vercel**: run `vercel deploy` from inside this folder (no
  `vercel.json` needed, it auto-detects a static site).

Or just open `index.html` directly in a browser for local testing,
though some browsers restrict certain requests from `file://` URLs, a
quick `python3 -m http.server` in this folder and visiting
`http://localhost:8000` is more reliable for local testing.

## What's in it

- `login.html` / `js/auth.js`: Supabase Auth sign-in
- `index.html` / `js/app.js`: the dashboard itself, nine tabs (client
  switcher at the top, everything below it scoped to whichever client
  is selected):
  - **Overview**: live status, hype/treasure train checkpoints, a
    glance at open veto rights, tickets, and pending invoices
  - **Moderation log**: manually logged bans, timeouts, warns, kicks
  - **Discord**: role reference and a support ticket queue
  - **Veto & VIP**: add viewers, track veto rights, VIP watch
  - **Backlog**: the movie/segment queue
  - **Schedule**: who's covering chat, when
  - **Billing**: hours and rate per period, pending or paid
  - **Clients**: add, view, remove clients on your roster
  - **Reference**: a static command cheat sheet
- `sql/schema.sql`: the database structure
- `sql/policies.sql`: the access rules that make it safe to use the
  anon key from the browser

Nothing here connects to Twitch or Discord's own APIs automatically
unless you complete the "Webhook integrations" section below, everything
is entered by hand otherwise. There's no image upload feature anywhere
in this build.

## Webhook integrations (optional)

Everything above works with zero setup beyond steps 1 through 4. These
three additions bring back real Twitch and Discord auto-logging,
without needing any server beyond Supabase itself. They run as
**Supabase Edge Functions** (small serverless functions Supabase hosts
for you) instead of a Next.js/Vercel backend.

### Deploy the functions

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli).
2. From this project's folder: `supabase login`, then
   `supabase link --project-ref YOUR-PROJECT-REF` (find your ref in
   the Supabase dashboard URL).
3. Deploy each function:
   ```bash
   supabase functions deploy twitch-webhook --no-verify-jwt
   supabase functions deploy twitch-callback --no-verify-jwt
   supabase functions deploy twitch-connect
   supabase functions deploy discord-poll
   supabase functions deploy discord-notify
   ```
4. Set the secrets these functions need:
   ```bash
   supabase secrets set TWITCH_CLIENT_ID=xxx TWITCH_CLIENT_SECRET=xxx \
     TWITCH_WEBHOOK_SECRET=xxx TWITCH_EVENTSUB_SCOPES=channel:moderate \
     DISCORD_BOT_TOKEN=xxx DASHBOARD_URL=https://your-deployed-site.example/index.html
   ```
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to every
   Edge Function automatically, don't set those yourself.
5. Run `sql/integrations.sql` in the SQL Editor, it adds the columns
   these functions read and write.

### 1. Twitch: bans and unbans auto-log

1. Create a Twitch app at
   [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps).
   Set its OAuth redirect URL to
   `https://YOUR-PROJECT-REF.supabase.co/functions/v1/twitch-callback`.
2. In the dashboard's Clients tab, make sure the client has their
   Twitch channel login name filled in, then click **Connect Twitch
   webhooks** on that client's card.

Twitch's exact scope requirement for this (currently `channel:moderate`
in the secrets above) has changed before. If the connect step
completes but nothing gets logged, check the current requirement at
[dev.twitch.tv/docs/eventsub/eventsub-subscription-types](https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types).

### 2. Discord: alerts posted into a channel

In the client's Discord server: **Server Settings, Integrations,
Webhooks, New Webhook**, copy the URL, paste it into the "Discord
incoming webhook URL" field when adding that client. The dashboard
then posts into that channel when the client goes live, and when a
new ticket opens.

### 3. Discord: bans, kicks and timeouts auto-log (polling)

Discord has no true webhook for this, so it's polled instead.

1. Create a bot at
   [discord.com/developers/applications](https://discord.com/developers/applications),
   set `DISCORD_BOT_TOKEN` (step above).
2. Invite the bot to each client's server with **View Audit Log**
   permission.
3. Get the server ID (Discord Developer Mode on, right-click the
   server icon, Copy Server ID) and paste it into "Discord server ID"
   when adding that client.
4. Run `sql/schedule-discord-poll.sql` in the SQL Editor, filling in
   your project URL and anon key where marked. This uses `pg_cron`
   (built into every Supabase project, including the free tier) to
   call `discord-poll` every 5 minutes on its own, no external
   scheduler needed.

## Known limitations of the static approach

- **No per-user permissions.** Every account you create in step 2 can
  see and edit every client. If you need different mods to have
  different access levels, that needs proper Supabase Auth roles and
  more detailed RLS policies, a real next step, not something this
  version does.
- **Toggles are atomic** (handled by Postgres RPC functions in
  `sql/functions.sql`), so simultaneous clicks from different people
  won't race each other.
- **No offline handling.** If the network drops mid-action, you'll see
  a Supabase error in the browser console rather than a friendly
  retry. Worth hardening if this becomes daily-critical.

## Setting up the reference page (`reference.html`)

A separate, password-gated page for command sheets, live-stream
prompts, and outreach templates. Content lives in Supabase and updates
live for anyone with the page open. Unlike the main dashboard, editing
here is gated by **one shared password**, not individual logins — this
means it needs two small Vercel Functions (`api/verify-password.js`,
`api/save-section.js`), not just static files.

1. Run `sql/reference-sections.sql` in the Supabase SQL Editor. This
   is additive, it doesn't touch any table from the main dashboard.
2. In Vercel, go to your project's **Settings → Environment
   Variables** and add three:
   - `EDIT_PASSWORD` — whatever password you want to gate editing with.
     Pick something you wouldn't mind a mod team sharing informally,
     since it's one shared password, not a real account.
   - `SUPABASE_URL` — same project URL as in `js/config.js`.
   - `SUPABASE_SERVICE_ROLE_KEY` — from Supabase's **Project Settings →
     API Keys → Secret keys**. This is the privileged key, the one
     that bypasses Row Level Security. It only ever lives in this
     Vercel env var, read server-side inside `api/save-section.js`.
     **Never** put this key in `js/config.js` or anywhere else the
     browser can read.
3. Redeploy (pushing any commit triggers this, or use Vercel's
   "Redeploy" button) so the new env vars and the `/api` functions
   take effect.
4. Visit `/reference.html` on your deployed site, click **Unlock
   editing** in the sidebar, enter the password from step 2.

**Never verified against a live Supabase project or a real Vercel
deployment** — this sandbox has no network path to either. The
request validation, password checks, and error handling for both
`/api` functions were unit-tested directly (missing env vars, wrong
password, invalid input, wrong HTTP method — all confirmed to fail
closed with the right status code), and the one thing that couldn't
be tested here is the actual Supabase write once a request passes
every check. That's a `.from('reference_sections').upsert(...)` call
using the official `@supabase/supabase-js` client, about as standard
as it gets, but "should work" isn't "confirmed working." If saving
fails after deployment, check the Vercel Function's logs first
(Vercel dashboard → your project → Deployments → the function) —
the error message from Supabase will show up there.

