-- Run this in Supabase's SQL Editor. Safe to run more than once —
-- uses ON CONFLICT DO UPDATE, so re-running always syncs content back
-- to match this file, rather than silently skipping rows that already
-- exist (unlike a plain ON CONFLICT DO NOTHING).

CREATE TABLE IF NOT EXISTS reference_sections (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reference_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read" ON reference_sections;
CREATE POLICY "public_read" ON reference_sections
  FOR SELECT
  USING (true);

-- Deliberately no INSERT/UPDATE/DELETE policy for anon or
-- authenticated. Writes only happen through /api/save-section.js
-- using the service_role key, which bypasses RLS entirely and is
-- never exposed to the browser.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'reference_sections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reference_sections;
  END IF;
END $$;

-- Content transcribed as closely as possible from the original
-- BobMasterBillie.docx: same emoji, same "→" arrow style, same
-- wording, just reformatted from Word's bold/bullet styling into
-- HTML bullet lists instead of tables.

INSERT INTO reference_sections (slug, title, content) VALUES

('prompts', 'Live stream prompts', $$<h3>🟣 Twitch Channel</h3>
<ul class="plain">
  <li>• Will We Complete Lvl 1 Hype Train? 🚂</li>
  <li>• Will We Complete Lvl 1 Treasure Train? 🎁</li>
  <li>• /announcepurple 🎯 SATTA LIVE — Make your predictions now!</li>
</ul>
<h3>🟣 TimepassTime</h3>
<ul class="plain">
  <li>⏰ Will Babu arrive before 00:00?</li>
</ul>
<p><strong>📌 Prediction Session</strong></p>
<ul class="plain">
  <li>• Each prediction is open for 5 minutes.</li>
  <li>• New predictions every 15 minutes.</li>
  <li>• Don't miss your chance to vote and see what happens! 🎉</li>
</ul>
<div class="msg-block">🚨 No stream tonight, y'all.<br>💜 He'll see everyone tomorrow night!</div>
<div class="msg-block">💬 Stream chat will still happen at the usual time.<br>⏳ Wait for it 💜</div>$$),

('veto', '🟣 Veto Power', $$<div class="note-block">⭐ mickey_17__ gets one chance to earn VIP back. (Special case, not part of the veto count list below.)</div>$$),

('backlog', '🎬 Movie Backlog', $$<div class="note-block">This section's list is managed above with real Add/Remove — this space is for any extra notes about the backlog, if you want them.</div>$$),

('twitch', '🎮 Twitch Commands', $$<h3>✨ Basic (Everyone)</h3>
<ul class="plain">
  <li>🛡️ /mods → Show moderators list</li>
  <li>💎 /vips → Show VIP list</li>
  <li>🎁 /gift [qty] → Gift subs</li>
  <li>🗳️ /vote → Vote in poll</li>
  <li>🎨 /color [name] → Change username color (preset list)</li>
  <li>🌈 /color #[hex] → Custom color (Turbo users only)</li>
  <li>🚫 /block [user] → Block user's chat/whispers</li>
  <li>✅ /unblock [user] → Unblock user</li>
  <li>🔌 /disconnect → Disconnect from chat</li>
  <li>✉️ /w [user] [msg] → Whisper privately</li>
  <li>📣 @username → Tag user in chat</li>
  <li>↩️ (Replies): @username + hotkey (Ctrl+R Win / Option+R Mac)</li>
</ul>
<h3>🛠️ Broadcaster &amp; Moderator</h3>
<ul class="plain">
  <li>📌 /pin [msg] → Highlight chat message</li>
  <li>📢 /shoutout [user] → Share streamer's channel (follow button)</li>
  <li>⚡ /announce [msg] → Highlight announcement</li>
  <li>👀 /monitor [user] / /unmonitor [user] → Watch/unwatch user's messages</li>
  <li>🚷 /restrict [user] / /unrestrict [user] → Restrict/remove restriction</li>
  <li>👤 /user [user] → View user profile, history, notes</li>
  <li>⏳ /timeout [user] [sec] → Temporary ban (default 10m, or set duration)</li>
  <li>🔨 /ban [user] → Permanent ban</li>
  <li>♻️ /unban [user] → Remove ban/timeout</li>
  <li>🐢 /slow [sec] → Enable slow mode</li>
  <li>⚡ /slowoff → Disable slow mode</li>
  <li>👥 /followers [time] → Followers-only chat (30m, 1w, 3mo, etc.)</li>
  <li>🚫 /followersoff → Disable followers-only mode</li>
  <li>💠 /subscribers → Sub-only chat</li>
  <li>💬 /subscribersoff → Disable sub-only mode</li>
  <li>🧹 /clear → Wipe chat</li>
  <li>🎯 /requests → Open Channel Points request queue</li>
  <li>🔄 /uniquechat → Prevent repeated/copypaste messages</li>
  <li>❌ /uniquechatoff → Disable uniquechat</li>
  <li>😜 /emoteonly / /emoteonlyoff → Emote-only toggle</li>
  <li>📊 /poll / /endpoll / /deletepoll → Poll management</li>
</ul>
<h3>🎬 Channel Editor &amp; Broadcaster</h3>
<ul class="plain">
  <li>📺 /commercial [30|60|90|120|150|180] → Run ad</li>
  <li>🎯 /goal → Manage sub/follower goals</li>
  <li>🎲 /prediction → Manage predictions</li>
  <li>🚀 /raid [channel] → Start raid</li>
  <li>🛑 /unraid → Cancel raid</li>
  <li>📝 /marker [desc] → Add stream marker</li>
</ul>
<h3>👑 Broadcaster Only</h3>
<ul class="plain">
  <li>🛡️ /mod [user] / /unmod [user] → Add/remove moderators</li>
  <li>💎 /vip [user] / /unvip [user] → Add/remove VIPs</li>
  <li>📜 /rules → Show channel rules</li>
  <li>🤝 /sharedchat → Start/join shared chat</li>
</ul>$$),

('nightbot', '🤖 Nightbot Commands', $$<h3>⚙️ General</h3>
<ul class="plain">
  <li>📜 !commands → Show available commands</li>
  <li>🎮 !game → Show current game</li>
  <li>📝 !title → Show stream title</li>
  <li>⏱️ !uptime → Show how long stream has been live</li>
  <li>👥 !followers → Show follower count</li>
  <li>💠 !subs → Show subscriber count</li>
</ul>
<h3>🎉 Fun &amp; Viewer Interaction</h3>
<ul class="plain">
  <li>🎵 !sr [url/keywords] → Request a song</li>
  <li>🎶 !songlist → Show song list</li>
  <li>🎶 !currentsong → Show current song</li>
  <li>🎶 !songs skip → Skip current song</li>
  <li>🎶 !songs Pause → Pause song</li>
  <li>🎶 !songs Play → Play song</li>
  <li>🎵 !songs delete [queue_postion] → Delete song From the Playlist</li>
  <li>📃 !playlist → Show playlist</li>
  <li>🎶 !songs next → Go to the next song in the queue</li>
  <li>💾 !songs save [playlist_name] → Save the current queue as a playlist</li>
  <li>🎵 !songs promote [queue_position] → Move a song up in the queue</li>
  <li>🎚️ !songs volume [0-100] → Set the playback volume</li>
  <li>🎧 !queue → Show song queue</li>
  <li>🎲 !roll → Roll random number (1–100)</li>
  <li>🔮 !8ball [question] → Magic 8-ball response</li>
  <li>📊 !poll → Start/view poll</li>
</ul>
<h3>🛡️ Mod &amp; Stream Tools</h3>
<ul class="plain">
  <li>🔨 !ban [user] → Ban user</li>
  <li>⏳ !timeout [user] [sec] → Timeout user</li>
  <li>🔗 !permit [user] → Allow links temporarily</li>
  <li>🎁 !winner → Pick a random viewer</li>
  <li>🎟️ !raffle → Start a raffle</li>
</ul>
<h3>🔧 Variables (For Custom Commands)</h3>
<ul class="plain">
  <li>🙋 $(user) → Username of caller</li>
  <li>👉 $(touser [name]) → Mentions target user</li>
  <li>🔢 $(count) → Counter value</li>
  <li>💬 $(query) → Returns user's input after command</li>
  <li>🌐 $(urlfetch [url]) → Fetch data from API/URL</li>
</ul>$$),

('custom', '📕 Custom Commands', $$<ul class="plain">
  <li>!addcom ![Name] [Command]</li>
  <li>!editcom ![Name] [Command]</li>
  <li>!editcom !now 🎥 Currently Watching ➜ [New Movie/Show]</li>
</ul>
<h3>Main Channel</h3>
<ul class="plain">
  <li>!title Indian Streamer Reacts 🍿 → Movies / Shows Title</li>
  <li>!title Indian Streamer Reacts 💰 → Shark Tank Title</li>
  <li>!title Indian Streamer Reacts 👨‍🍳 → MasterChef Title</li>
  <li>!title Indian Streamer Reacts 💔 → Splitsvilla Title</li>
</ul>
<h3>Timepass Time Channel</h3>
<ul class="plain">
  <li>!title Timepass Time 👁️ → Bigg Boss Title</li>
  <li>!title Timepass Time 🍿 → Movies / Shows Title</li>
  <li>!title Timepass Time 👨‍🍳 → MasterChef Title</li>
  <li>!title Timepass Time 💰 → Shark Tank Title</li>
  <li>!title Timepass Time 💔 → Splitsvilla Title</li>
  <li>!addcom !prediction 🗳️ Share your predictions on who will be eliminated this week! 👇 🔗 https://twitch-predcon-frntend-v2.vercel.app/predict</li>
</ul>$$),

('outreach', '📖 CV', $$<div class="card" id="pitch-discord">
  <h4>Discord Moderator</h4>
  <p>Hey [Server Name]! 👋</p>
  <p>I'm <strong>@BobMasterBillie</strong> — experienced Discord mod ready to take your server to the next level!</p>
  <p>💪 What I do:</p>
  <ul>
    <li>• Keep chats safe, friendly &amp; drama-free ✅</li>
    <li>• Expert in server setup, roles, channels &amp; bots 🤖</li>
    <li>• Run polls, events &amp; engagement to grow activity 🎉</li>
    <li>• Reliable &amp; always active — no downtime</li>
  </ul>
  <p class="quote">I don't just moderate — I <strong>boost community engagement and make your server thrive</strong>.</p>
  <p class="quote">Let's chat so I can start helping your community shine! 💬</p>
  <div class="sign">— BobMasterBillie</div>
</div>
<div class="card" id="pitch-stream">
  <h4>Streaming Moderator (Twitch/YouTube)</h4>
  <p>Hey [Streamer Name]! 👋</p>
  <p>I'm <strong>@BobMasterBillie</strong> — your next mod who keeps streams smooth, safe &amp; engaging!</p>
  <p>💪 What I do:</p>
  <ul>
    <li>• Spam-free, positive chat moderation ✅</li>
    <li>• Nightbot, MEE6, Dyno &amp; StreamElements expert 🤖</li>
    <li>• Run polls, games &amp; chat prompts to increase viewer interaction 🎮</li>
    <li>• Calm, reliable &amp; always present during streams</li>
  </ul>
  <p class="quote">I don't just moderate — I <strong>enhance your streams and grow your community</strong>.</p>
  <p class="quote">Can we chat about me joining your team? 💬</p>
  <div class="sign">— BobMasterBillie</div>
</div>$$)

ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  updated_at = now();
