/**
 * Optional one-time content seed. Writes the starter text for every
 * dashboard section (Twitch, Nightbot, Custom Commands, Predictions,
 * Stream Notes, Backlog, Veto Power, Quick Links, CV) into the
 * `dashboard_docs` table, so the site isn't blank on first login.
 *
 * Safe to re-run — it's an upsert keyed on `section`. Editing a section
 * afterward in the app just overwrites its row normally; running this
 * script again would reset that section back to the starter text, so
 * only run it again on purpose.
 *
 * Usage:
 *   1. Fill in .env.local with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *   2. Run supabase/schema.sql against your project first.
 *   3. npm run seed:content
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) config({ path: '.env.local' });
else config();

const docs = {
  twitch: `🟣 Twitch Channel
• Will We Complete Lvl 1 Hype Train? 🚂
• Will We Complete Lvl 1 Treasure Train? 🎁
• /announcepurple 🎯 SATTA LIVE — Make your predictions now!

🎮 Twitch Commands

✨ Basic (Everyone)
🛡️ /mods → Show moderators list
💎 /vips → Show VIP list
🎁 /gift [qty] → Gift subs
🗳️ /vote → Vote in poll
🎨 /color [name] → Change username color (preset list)
🌈 /color #[hex] → Custom color (Turbo users only)
🚫 /block [user] → Block user's chat/whispers
✅ /unblock [user] → Unblock user
🔌 /disconnect → Disconnect from chat
✉️ /w [user] [msg] → Whisper privately
📣 @username → Tag user in chat
↩️ (Replies): @username + hotkey (Ctrl+R Win / Option+R Mac)

🛠️ Broadcaster & Moderator
📌 /pin [msg] → Highlight chat message
📢 /shoutout [user] → Share streamer's channel (follow button)
⚡ /announce [msg] → Highlight announcement
👀 /monitor [user] / /unmonitor [user] → Watch/unwatch user's messages
🚷 /restrict [user] / /unrestrict [user] → Restrict/remove restriction
👤 /user [user] → View user profile, history, notes
⏳ /timeout [user] [sec] → Temporary ban (default 10m, or set duration)
🔨 /ban [user] → Permanent ban
♻️ /unban [user] → Remove ban/timeout
🐢 /slow [sec] → Enable slow mode
⚡ /slowoff → Disable slow mode
👥 /followers [time] → Followers-only chat (30m, 1w, 3mo, etc.)
🚫 /followersoff → Disable followers-only mode
💠 /subscribers → Sub-only chat
💬 /subscribersoff → Disable sub-only mode
🧹 /clear → Wipe chat
🎯 /requests → Open Channel Points request queue
🔄 /uniquechat → Prevent repeated/copypaste messages
❌ /uniquechatoff → Disable uniquechat
😜 /emoteonly / /emoteonlyoff → Emote-only toggle
📊 /poll / /endpoll / /deletepoll → Poll management

🎬 Channel Editor & Broadcaster
📺 /commercial [30|60|90|120|150|180] → Run ad
🎯 /goal → Manage sub/follower goals
🎲 /prediction → Manage predictions
🚀 /raid [channel] → Start raid
🛑 /unraid → Cancel raid
📝 /marker [desc] → Add stream marker

👑 Broadcaster Only
🛡️ /mod [user] / /unmod [user] → Add/remove moderators
💎 /vip [user] / /unvip [user] → Add/remove VIPs
📜 /rules → Show channel rules
🤝 /sharedchat → Start/join shared chat`,

  predictions: `🟣 TimepassTime
⏰ Will Babu arrive before 00:00?

📌 Prediction Session
• Each prediction is open for 5 minutes.
• New predictions every 15 minutes.
• Don't miss your chance to vote and see what happens! 🎉

🟣 Twitch Channel predictions
• Will We Complete Lvl 1 Hype Train? 🚂
• Will We Complete Lvl 1 Treasure Train? 🎁
• /announcepurple 🎯 SATTA LIVE — Make your predictions now!

🔗 Predictions link: https://twitch-predcon-frntend-v2.vercel.app/predict`,

  notes: `🚨 No stream tonight, y'all.
💜 He'll see everyone tomorrow night!

💬 Stream chat will still happen at the usual time.
⏳ Wait for it 💜`,

  backlog: `🎬 Movie Backlog (2)
Two items queued — titles/tags not filled in yet, add them here.`,

  veto: `🚫 Lolwazi — 0 Active Veto Rights
🚫 Chadboy_hz — 0 Active Veto Rights
⭐ mickey_17__ gets one chance to earn VIP back.`,

  links: `Predictions (Timepass Time) -> https://twitch-predcon-frntend-v2.vercel.app/predict`,

  commands: `📕 Custom Commands
!addcom ![Name] [Command]
!editcom ![Name] [Command]
!editcom !now 🎥 Currently Watching ➜ [New Movie/Show]

Main Channel
!title Indian Streamer Reacts 🍿 → Movies / Shows Title
!title Indian Streamer Reacts 💰 → Shark Tank Title
!title Indian Streamer Reacts 👨‍🍳 → MasterChef Title
!title Indian Streamer Reacts 💔 → Splitsvilla Title

Timepass Time Channel
!title Timepass Time 👁️ → Bigg Boss Title
!title Timepass Time 🍿 → Movies / Shows Title
!title Timepass Time 👨‍🍳 → MasterChef Title
!title Timepass Time 💰 → Shark Tank Title
!title Timepass Time 💔 → Splitsvilla Title
!addcom !prediction 🗳️ Share your predictions on who will be eliminated this week! 👇 🔗 https://twitch-predcon-frntend-v2.vercel.app/predict`,

  nightbot: `⚙️ General
📜 !commands → Show available commands
🎮 !game → Show current game
📝 !title → Show stream title
⏱️ !uptime → Show how long stream has been live
👥 !followers → Show follower count
💠 !subs → Show subscriber count

🎉 Fun & Viewer Interaction
🎵 !sr [url/keywords] → Request a song
🎶 !songlist → Show song list
🎶 !currentsong → Show current song
🎶 !songs skip → Skip current song
🎶 !songs Pause → Pause song
🎶 !songs Play → Play song
🎵 !songs delete [queue_position] → Delete song from the playlist
📃 !playlist → Show playlist
🎶 !songs next → Go to next song in the queue
💾 !songs save [playlist_name] → Save current queue as a playlist
🎵 !songs promote [queue_position] → Move a song up in the queue
🎚️ !songs volume [0-100] → Set playback volume
🎧 !queue → Show song queue
🎲 !roll → Roll random number (1-100)
🔮 !8ball [question] → Magic 8-ball response
📊 !poll → Start/view poll

🛡️ Mod & Stream Tools
🔨 !ban [user] → Ban user
⏳ !timeout [user] [sec] → Timeout user
🔗 !permit [user] → Allow links temporarily
🎁 !winner → Pick a random viewer
🎟️ !raffle → Start a raffle

🔧 Variables (for custom commands)
🙋 $(user) → Username of caller
👉 $(touser [name]) → Mentions target user
🔢 $(count) → Counter value
💬 $(query) → Returns user's input after command
🌐 $(urlfetch [url]) → Fetch data from API/URL`,

  cv: `Discord Moderator

Hey [Server Name]! 👋

I'm @BobMasterBillie — experienced Discord mod ready to take your server to the next level!

💪 What I do:
• Keep chats safe, friendly & drama-free ✅
• Expert in server setup, roles, channels & bots 🤖
• Run polls, events & engagement to grow activity 🎉
• Reliable & always active — no downtime

I don't just moderate — I boost community engagement and make your server thrive.

Let's chat so I can start helping your community shine! 💬

— BobMasterBillie

---

Streaming Moderator (Twitch/YouTube)

Hey [Streamer Name]! 👋

I'm @BobMasterBillie — your next mod who keeps streams smooth, safe & engaging!

💪 What I do:
• Spam-free, positive chat moderation ✅
• Nightbot, MEE6, Dyno & StreamElements expert 🤖
• Run polls, games & chat prompts to increase viewer interaction 🎮
• Calm, reliable & always present during streams

I don't just moderate — I enhance your streams and grow your community.

Can we chat about me joining your team? 💬

— BobMasterBillie`,
};

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = Object.entries(docs).map(([section, content]) => ({
    section,
    content,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('dashboard_docs')
    .upsert(rows, { onConflict: 'section' });

  if (error) {
    console.error('Failed to seed content:', error.message);
    process.exit(1);
  }
  console.log(`✅ Seeded starter content for ${rows.length} sections: ${Object.keys(docs).join(', ')}.`);
  console.log('   ("channels" and "settings" were left blank — no matching content was provided.)');
}

main();
