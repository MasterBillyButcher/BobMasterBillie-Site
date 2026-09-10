-- Run this in Supabase's SQL Editor. Additive only — doesn't touch any
-- existing table from schema.sql/policies.sql/functions.sql.
--
-- Holds the content for reference.html: one row per section, content
-- stored as HTML. Anyone can read it (so the public page works and
-- updates live for visitors). Nobody can write to it directly from
-- the browser, not even with the publishable/anon key — writes only
-- happen through the /api/save-section Vercel Function, which checks
-- the shared password server-side and then writes using the
-- service_role key (which bypasses RLS entirely). That's the actual
-- security boundary: the password check, not this table's policies.

CREATE TABLE IF NOT EXISTS reference_sections (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reference_sections ENABLE ROW LEVEL SECURITY;

-- Public read, including for the anon/publishable-key role, so the
-- page loads without any login.
CREATE POLICY "public_read" ON reference_sections
  FOR SELECT
  USING (true);

-- Deliberately no INSERT/UPDATE/DELETE policy for anon or
-- authenticated. The only way to write is the service_role key,
-- which is never exposed to the browser and always bypasses RLS,
-- used exclusively inside /api/save-section.js.

-- Required for the live-update behavior on the page: adds this table
-- to the publication Supabase's realtime system watches.
ALTER PUBLICATION supabase_realtime ADD TABLE reference_sections;

-- Seed the 7 sections with their current content so the page isn't
-- empty on first load. Safe to run more than once.
INSERT INTO reference_sections (slug, title, content) VALUES
('prompts', 'Live stream prompts', $$<h3>Twitch Channel — predictions</h3>
<ul class="plain">
  <li>Will We Complete Lvl 1 Hype Train? 🚂</li>
  <li>Will We Complete Lvl 1 Treasure Train? 🎁</li>
  <li>/announcepurple 🎯 SATTA LIVE — Make your predictions now!</li>
</ul>
<h3>TimepassTime Channel — predictions</h3>
<ul class="plain">
  <li>⏰ Will Babu arrive before 00:00?</li>
</ul>
<div class="note-block">Prediction session rules: each prediction is open for 5 minutes, new predictions go up every 15 minutes.</div>
<h3>Stream cancellation notice (template)</h3>
<ul class="plain">
  <li>🚨 No stream tonight, y'all. He'll see everyone tomorrow night!</li>
  <li>💬 Stream chat will still happen at the usual time. Wait for it.</li>
</ul>$$),

('veto', 'Veto power tracker', $$<table class="status-table">
  <tr><td>Lolwazi</td><td class="dim"><span class="pill grey">0 active veto rights</span></td></tr>
  <tr><td>Chadboy_hz</td><td class="dim"><span class="pill grey">0 active veto rights</span></td></tr>
  <tr><td>mickey_17__</td><td><span class="pill gold">⭐ one chance to earn VIP back</span></td></tr>
</table>$$),

('backlog', 'Movie / segment backlog', $$<div class="note-block">Titles weren't recorded in the original list — add them here going forward.</div>
<table class="status-table">
  <tr><td>Item 1</td><td class="dim">— add title —</td></tr>
  <tr><td>Item 2</td><td class="dim">— add title —</td></tr>
</table>$$),

('twitch', 'Twitch commands', $$<h3>Basic (everyone)</h3>
<div class="cmd-wrap"><table class="cmd-table">
  <tr><th>Command</th><th>Description</th><th>Notes</th></tr>
  <tr><td class="cmd">/mods</td><td>Show moderators list</td><td class="note"></td></tr>
  <tr><td class="cmd">/vips</td><td>Show VIP list</td><td class="note"></td></tr>
  <tr><td class="cmd">/gift [qty]</td><td>Gift subs</td><td class="note"></td></tr>
  <tr><td class="cmd">/vote</td><td>Vote in poll</td><td class="note"></td></tr>
  <tr><td class="cmd">/color [name]</td><td>Change username color</td><td class="note">Preset list</td></tr>
  <tr><td class="cmd">/color #[hex]</td><td>Custom color</td><td class="note">Turbo users only</td></tr>
  <tr><td class="cmd">/block [user]</td><td>Block user's chat/whispers</td><td class="note"></td></tr>
  <tr><td class="cmd">/unblock [user]</td><td>Unblock user</td><td class="note"></td></tr>
  <tr><td class="cmd">/disconnect</td><td>Disconnect from chat</td><td class="note"></td></tr>
  <tr><td class="cmd">/w [user] [msg]</td><td>Whisper privately</td><td class="note"></td></tr>
  <tr><td class="cmd">@username</td><td>Tag user in chat</td><td class="note"></td></tr>
  <tr><td class="cmd">Ctrl+R / Option+R</td><td>Reply to a message</td><td class="note">Win / Mac</td></tr>
</table></div>
<h3>Broadcaster &amp; moderator</h3>
<div class="cmd-wrap"><table class="cmd-table">
  <tr><th>Command</th><th>Description</th><th>Notes</th></tr>
  <tr><td class="cmd">/pin [msg]</td><td>Highlight a chat message</td><td class="note"></td></tr>
  <tr><td class="cmd">/shoutout [user]</td><td>Share streamer's channel</td><td class="note">Adds follow button</td></tr>
  <tr><td class="cmd">/announce [msg]</td><td>Highlight announcement</td><td class="note"></td></tr>
  <tr><td class="cmd">/monitor [user]</td><td>Watch user's messages</td><td class="note">/unmonitor to undo</td></tr>
  <tr><td class="cmd">/restrict [user]</td><td>Restrict user</td><td class="note">/unrestrict to undo</td></tr>
  <tr><td class="cmd">/user [user]</td><td>View profile, history, notes</td><td class="note"></td></tr>
  <tr><td class="cmd">/timeout [user] [sec]</td><td>Temporary ban</td><td class="note">Default 10m</td></tr>
  <tr><td class="cmd">/ban [user]</td><td>Permanent ban</td><td class="note"></td></tr>
  <tr><td class="cmd">/unban [user]</td><td>Remove ban / timeout</td><td class="note"></td></tr>
  <tr><td class="cmd">/slow [sec]</td><td>Enable slow mode</td><td class="note">/slowoff to disable</td></tr>
  <tr><td class="cmd">/followers [time]</td><td>Followers-only chat</td><td class="note">30m, 1w, 3mo…</td></tr>
  <tr><td class="cmd">/subscribers</td><td>Sub-only chat</td><td class="note">/subscribersoff to disable</td></tr>
  <tr><td class="cmd">/clear</td><td>Wipe chat</td><td class="note"></td></tr>
  <tr><td class="cmd">/requests</td><td>Open Channel Points queue</td><td class="note"></td></tr>
  <tr><td class="cmd">/uniquechat</td><td>Block repeated messages</td><td class="note">/uniquechatoff to disable</td></tr>
  <tr><td class="cmd">/emoteonly</td><td>Emote-only toggle</td><td class="note">/emoteonlyoff to disable</td></tr>
  <tr><td class="cmd">/poll</td><td>Poll management</td><td class="note">/endpoll, /deletepoll</td></tr>
</table></div>
<h3>Channel editor &amp; broadcaster</h3>
<div class="cmd-wrap"><table class="cmd-table">
  <tr><th>Command</th><th>Description</th><th>Notes</th></tr>
  <tr><td class="cmd">/commercial [sec]</td><td>Run an ad</td><td class="note">30/60/90/120/150/180</td></tr>
  <tr><td class="cmd">/goal</td><td>Manage sub/follower goals</td><td class="note"></td></tr>
  <tr><td class="cmd">/prediction</td><td>Manage predictions</td><td class="note"></td></tr>
  <tr><td class="cmd">/raid [channel]</td><td>Start a raid</td><td class="note">/unraid to cancel</td></tr>
  <tr><td class="cmd">/marker [desc]</td><td>Add a stream marker</td><td class="note"></td></tr>
</table></div>
<h3>Broadcaster only</h3>
<div class="cmd-wrap"><table class="cmd-table">
  <tr><th>Command</th><th>Description</th><th>Notes</th></tr>
  <tr><td class="cmd">/mod [user]</td><td>Add/remove moderators</td><td class="note">/unmod to remove</td></tr>
  <tr><td class="cmd">/vip [user]</td><td>Add/remove VIPs</td><td class="note">/unvip to remove</td></tr>
  <tr><td class="cmd">/rules</td><td>Show channel rules</td><td class="note"></td></tr>
  <tr><td class="cmd">/sharedchat</td><td>Start/join shared chat</td><td class="note"></td></tr>
</table></div>$$),

('nightbot', 'Nightbot commands', $$<h3>General</h3>
<div class="cmd-wrap"><table class="cmd-table">
  <tr><th>Command</th><th>Description</th></tr>
  <tr><td class="cmd">!commands</td><td>Show available commands</td></tr>
  <tr><td class="cmd">!game</td><td>Show current game</td></tr>
  <tr><td class="cmd">!title</td><td>Show stream title</td></tr>
  <tr><td class="cmd">!uptime</td><td>Show how long stream has been live</td></tr>
  <tr><td class="cmd">!followers</td><td>Show follower count</td></tr>
  <tr><td class="cmd">!subs</td><td>Show subscriber count</td></tr>
</table></div>
<h3>Fun &amp; viewer interaction</h3>
<div class="cmd-wrap"><table class="cmd-table">
  <tr><th>Command</th><th>Description</th></tr>
  <tr><td class="cmd">!sr [url/keywords]</td><td>Request a song</td></tr>
  <tr><td class="cmd">!songlist</td><td>Show song list</td></tr>
  <tr><td class="cmd">!currentsong</td><td>Show current song</td></tr>
  <tr><td class="cmd">!songs skip</td><td>Skip current song</td></tr>
  <tr><td class="cmd">!songs pause / play</td><td>Pause or play song</td></tr>
  <tr><td class="cmd">!songs delete [pos]</td><td>Delete song from playlist</td></tr>
  <tr><td class="cmd">!playlist</td><td>Show playlist</td></tr>
  <tr><td class="cmd">!songs next</td><td>Go to next song in queue</td></tr>
  <tr><td class="cmd">!songs save [name]</td><td>Save queue as a playlist</td></tr>
  <tr><td class="cmd">!songs promote [pos]</td><td>Move a song up the queue</td></tr>
  <tr><td class="cmd">!songs volume [0–100]</td><td>Set playback volume</td></tr>
  <tr><td class="cmd">!queue</td><td>Show song queue</td></tr>
  <tr><td class="cmd">!roll</td><td>Roll a random number (1–100)</td></tr>
  <tr><td class="cmd">!8ball [question]</td><td>Magic 8-ball response</td></tr>
  <tr><td class="cmd">!poll</td><td>Start/view a poll</td></tr>
</table></div>
<h3>Mod &amp; stream tools</h3>
<div class="cmd-wrap"><table class="cmd-table">
  <tr><th>Command</th><th>Description</th></tr>
  <tr><td class="cmd">!ban [user]</td><td>Ban user</td></tr>
  <tr><td class="cmd">!timeout [user] [sec]</td><td>Timeout user</td></tr>
  <tr><td class="cmd">!permit [user]</td><td>Allow links temporarily</td></tr>
  <tr><td class="cmd">!winner</td><td>Pick a random viewer</td></tr>
  <tr><td class="cmd">!raffle</td><td>Start a raffle</td></tr>
</table></div>
<h3>Variables (for custom commands)</h3>
<div class="cmd-wrap"><table class="cmd-table">
  <tr><th>Variable</th><th>Description</th></tr>
  <tr><td class="cmd">$(user)</td><td>Username of caller</td></tr>
  <tr><td class="cmd">$(touser [name])</td><td>Mentions target user</td></tr>
  <tr><td class="cmd">$(count)</td><td>Counter value</td></tr>
  <tr><td class="cmd">$(query)</td><td>Returns input after the command</td></tr>
  <tr><td class="cmd">$(urlfetch [url])</td><td>Fetch data from an API/URL</td></tr>
</table></div>$$),

('custom', 'Custom commands', $$<p>Syntax: <code>!addcom ![Name] [Command]</code> · <code>!editcom ![Name] [Command]</code></p>
<h3>Main channel</h3>
<div class="cmd-wrap"><table class="cmd-table">
  <tr><th>Command</th><th>Purpose</th></tr>
  <tr><td class="cmd">!title Indian Streamer Reacts 🍿</td><td>Movies / shows title</td></tr>
  <tr><td class="cmd">!title Indian Streamer Reacts 💰</td><td>Shark Tank title</td></tr>
  <tr><td class="cmd">!title Indian Streamer Reacts 👨‍🍳</td><td>MasterChef title</td></tr>
  <tr><td class="cmd">!title Indian Streamer Reacts 💔</td><td>Splitsvilla title</td></tr>
</table></div>
<h3>Timepass Time channel</h3>
<div class="cmd-wrap"><table class="cmd-table">
  <tr><th>Command</th><th>Purpose</th></tr>
  <tr><td class="cmd">!title Timepass Time 👁️</td><td>Bigg Boss title</td></tr>
  <tr><td class="cmd">!title Timepass Time 🍿</td><td>Movies / shows title</td></tr>
  <tr><td class="cmd">!title Timepass Time 👨‍🍳</td><td>MasterChef title</td></tr>
  <tr><td class="cmd">!title Timepass Time 💰</td><td>Shark Tank title</td></tr>
  <tr><td class="cmd">!title Timepass Time 💔</td><td>Splitsvilla title</td></tr>
  <tr><td class="cmd">!addcom !prediction</td><td>🗳️ Share your predictions on who will be eliminated this week! 👇 twitch-predcon-frntend-v2.vercel.app/predict</td></tr>
</table></div>$$),

('outreach', 'Outreach templates', $$<div class="card" id="pitch-discord">
  <h4>Discord moderator — pitch</h4>
  <p>Hey [Server Name]! 👋</p>
  <p>I'm <strong>@BobMasterBillie</strong> — experienced Discord mod ready to take your server to the next level!</p>
  <ul>
    <li>Keep chats safe, friendly &amp; drama-free ✅</li>
    <li>Expert in server setup, roles, channels &amp; bots 🤖</li>
    <li>Run polls, events &amp; engagement to grow activity 🎉</li>
    <li>Reliable &amp; always active — no downtime</li>
  </ul>
  <p class="quote">I don't just moderate — I boost community engagement and make your server thrive. Let's chat so I can start helping your community shine! 💬</p>
  <div class="sign">— BobMasterBillie</div>
</div>
<div class="card" id="pitch-stream">
  <h4>Streaming moderator (Twitch/YouTube) — pitch</h4>
  <p>Hey [Streamer Name]! 👋</p>
  <p>I'm <strong>@BobMasterBillie</strong> — your next mod who keeps streams smooth, safe &amp; engaging!</p>
  <ul>
    <li>Spam-free, positive chat moderation ✅</li>
    <li>Nightbot, MEE6, Dyno &amp; StreamElements expert 🤖</li>
    <li>Run polls, games &amp; chat prompts to increase viewer interaction 🎮</li>
    <li>Calm, reliable &amp; always present during streams</li>
  </ul>
  <p class="quote">I don't just moderate — I enhance your streams and grow your community. Can we chat about me joining your team? 💬</p>
  <div class="sign">— BobMasterBillie</div>
</div>$$)

ON CONFLICT (slug) DO NOTHING;
