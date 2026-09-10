# Dev context: BobMasterBillie console (static + Supabase build)

Handoff document for continuing this project in a new session. Written
to be read cold, without the original conversation. This supersedes
any earlier dev context document from the Next.js version of this
project, the architecture has changed since then.

## What this project actually is

A plain HTML/CSS/JS dashboard (no framework, no build step) for a
Discord/Twitch moderation business, talking directly to Supabase from
the browser. A roster of clients (streamers/servers), each with a
moderation log, Discord role/ticket tracking, veto/VIP tracking, a
movie backlog, a shift schedule, and billing. Real Twitch/Discord
auto-logging is layered on top via Supabase Edge Functions.

There is still no image upload feature anywhere in this codebase. If
a future request references "the image issue," get specifics before
acting on it, that phrase has come up before in this project's history
with no actual image bug ever described.

## Current state, honestly

**Verified working:** the core dashboard (all 9 tabs), syntax-checked
with `node --check` on every `.js` file, served locally and confirmed
every file loads with the correct HTTP status. The RLS policy model
and atomic RPC functions are logically reviewed line by line, but
**never executed against a real Supabase project**, because this
session never had live credentials.

**Reference page (`reference.html` + `api/`), added later:** the two
Vercel Functions (`api/verify-password.js`, `api/save-section.js`)
were unit-tested directly in this sandbox with mocked request/response
objects — wrong password, missing env vars, invalid slug, missing
title, wrong HTTP method all confirmed to fail with the correct status
code. The `@supabase/supabase-js` package was installed and confirmed
to resolve correctly. What was **not** tested: the actual database
write once a request passes every check (this sandbox has no network
path to supabase.co), and the whole thing end-to-end on a real Vercel
deployment (env vars actually set, `/api` functions actually
deployed, realtime subscription actually firing across two open
tabs). Same caveat as the Edge Functions below: written carefully,
not the same as confirmed working.

**Not verified at all:** the five Supabase Edge Functions
(`twitch-webhook`, `twitch-connect`, `twitch-callback`, `discord-poll`,
`discord-notify`). These are TypeScript/Deno files. This sandbox does
not have Deno installed, so they were never type-checked, never run,
never deployed. They were written carefully against Twitch's and
Discord's documented APIs and the Supabase Edge Functions/pg_cron
docs, but "written carefully" is not the same as "confirmed working."
Treat them as a strong first draft, not finished, tested code.

**Specific known risks in the Edge Functions**, roughly most to least
likely to need a fix:
1. `TWITCH_EVENTSUB_SCOPES` (default `channel:moderate`) is Twitch's
   documented requirement as of when this was written, but Twitch has
   changed this before. If `twitch-connect` completes but
   `twitch-webhook` never receives anything, check Twitch's current
   EventSub subscription docs first.
2. `channel.unban` as an EventSub subscription type was never
   confirmed to exist, it's wrapped in `Promise.allSettled` in
   `twitch-callback` specifically because of that uncertainty, so a
   failure there won't block `channel.ban` from working, but it might
   just silently not subscribe.
3. `sql/schedule-discord-poll.sql` uses `vault.create_secret` and
   `net.http_post`, the officially documented Supabase pattern for
   this at the time it was written, but Supabase's Vault/pg_net API
   has had breaking changes before. If the cron job doesn't fire,
   check `select * from cron.job_run_details order by start_time desc`
   first, and check Supabase's current pg_cron docs if that's empty.
4. The Discord audit log action type numbers (20/22/23/24) and the
   `communication_disabled_until` change key for detecting timeouts
   are from Discord's documented API, not independently verified
   against a live server.

**Never attempted in this project at all:** per-user permissions
(every Supabase Auth account has full access to every client), any
kind of automated testing, rate limiting, or handling Twitch/Discord
API outages gracefully beyond a generic error toast.

## Stack

- Plain HTML/CSS/JS, no framework, no build step, no package.json
- `@supabase/supabase-js` v2, loaded via the `unpkg` CDN in the HTML
  (`<script src="https://unpkg.com/@supabase/supabase-js@2">`), not
  npm-installed
- Supabase Postgres for data, Supabase Auth for login, Supabase Edge
  Functions (Deno) for the three-way webhook integrations
- `pg_cron` + `pg_net` (both built into Supabase, including the free
  tier) for scheduling the Discord poll, no external cron service
- No Next.js, no Vercel, no Node server of any kind. An earlier
  version of this project (superseded) used Next.js on Vercel with a
  Neon Postgres database, then a second version used Next.js with
  Supabase. Both were abandoned in favor of this static build, per
  explicit direction partway through the project. Don't resurrect
  either without checking that's actually still wanted.

## Auth and security model

- Login is real Supabase Auth (email/password), not a shared password.
  Create one Auth user per person who needs access, in Supabase's
  dashboard under Authentication > Users. There is no self-serve
  signup flow built.
- Every table has Row Level Security enabled with exactly one policy:
  any authenticated user gets full access (`sql/policies.sql`). There
  is no per-client or per-role restriction, anyone who can log in can
  see and edit every client's data.
- `js/config.js` holds the Supabase URL and **anon** key, both meant
  to be public, that file is not a secret. The actual security is the
  RLS policy plus requiring a real login.
- `SUPABASE_SERVICE_ROLE_KEY` never appears in any browser-side file.
  It's only used inside the Edge Functions, which run on Supabase's
  servers, not in the browser.

## Reliability improvements made in the most recent pass

- Toggles (`is_live`, `hype_train`, `treasure_train`, `vip_resolved`)
  and counters/status flips (veto count, ticket status, invoice
  status) now use atomic Postgres functions (`sql/functions.sql`,
  called via `supabaseClient.rpc(...)`), replacing an earlier
  read-then-write pattern that had a real race condition if two people
  clicked the same toggle at nearly the same moment.
- Every mutating action goes through a `withBusy()` helper: the
  triggering button disables itself and shows a busy label while the
  request is in flight, re-enables on completion or failure.
- Every Supabase call that can fail now surfaces a visible toast
  notification (`toast()` in `js/app.js`) instead of failing silently.
  Checkbox toggles roll back their visual state if the write fails.
- Destructive actions (removing a client, veto entry, shift, invoice)
  now require a native `confirm()` dialog first.
- Fixed a real bug from an earlier draft of this file: delegated click
  handlers for remove/toggle buttons were originally being re-attached
  inside each tab's render function with `{ once: true }`, which would
  have made every such button stop responding after its first click,
  ever, in that tab. They're now bound exactly once, at script load,
  to the persistent tab-container elements, and read current state
  from `ctx.data` at click time rather than a stale render-time
  closure.

## File map

```
index.html, login.html          the two pages
css/styles.css                  all styles (design tokens + component styles)
js/config.js                    Supabase URL + anon key (fill in before deploying)
js/auth.js                      login.html's sign-in logic
js/app.js                       everything else: auth guard, data loading,
                                 all 9 tabs, toasts, busy states, confirmations
sql/schema.sql                  base tables (run first)
sql/policies.sql                RLS policies (run second, without this nothing works)
sql/functions.sql                atomic toggle/adjust RPC functions (run third)
sql/integrations.sql            extra columns for the webhook features (run fourth, optional)
sql/schedule-discord-poll.sql   pg_cron job for Discord polling (optional, needs Edge Functions deployed first)
supabase/functions/
  twitch-webhook/                receives Twitch EventSub notifications
  twitch-connect/                starts the Twitch OAuth flow (called from the dashboard)
  twitch-callback/                finishes it, creates the EventSub subscriptions
  discord-poll/                   polls Discord audit logs, called by pg_cron
  discord-notify/                 posts alerts into Discord, called from the dashboard
  _shared/cors.ts                 shared CORS headers for the two functions the browser calls directly
favicon.ico, apple-touch-icon.png   the only images in this repo

reference.html                  separate, password-gated command-sheet/prompts/
                                 outreach page, added in a later session. Content
                                 lives in Supabase (reference_sections table),
                                 not hardcoded, updates live via Supabase Realtime.
                                 Unlike the main dashboard, this page doesn't use
                                 per-user Supabase Auth, it uses ONE shared
                                 password (see api/ below). Reuses js/config.js
                                 for its Supabase URL/anon key, same as index.html.
sql/reference-sections.sql      creates reference_sections + its RLS (public
                                 read, no public write) + seeds the 7 sections
package.json                    exists ONLY so Vercel installs
                                 @supabase/supabase-js for api/. The dashboard
                                 itself (index.html etc.) still needs no build
                                 step and no dependencies.
api/
  verify-password.js             checks EDIT_PASSWORD (Vercel env var), used by
                                  reference.html's "Unlock editing" button. Read-
                                  only, doesn't write anything.
  save-section.js                the only thing that writes to reference_sections.
                                  Re-checks EDIT_PASSWORD independently (never
                                  trusts a client's claim it already unlocked),
                                  then writes using SUPABASE_SERVICE_ROLE_KEY
                                  (Vercel env var, bypasses RLS). This is the
                                  actual security boundary for this page, not
                                  reference_sections' RLS policy.
```

## Immediate next steps for whoever picks this up

1. If the task is "make the webhook integrations actually work": get
   real Twitch and Discord developer credentials, deploy the Edge
   Functions per the README, and expect to debug at least one of the
   four specific risks listed above. This has never run against a
   real account.
2. If the task is anything else: the core dashboard (no webhooks) is
   in better shape, confirm what's actually being asked before
   assuming the webhook layer is involved at all.
3. Don't assume real data exists in Supabase yet. Confirm with whoever
   you're working with whether they've actually run the SQL files and
   created a client, or if that's still pending.
