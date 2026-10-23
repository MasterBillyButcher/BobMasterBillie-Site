-- BobMasterBillie Command Center - Commands table + starter commands
-- Paste this whole file into: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run (existing rows are kept, ON CONFLICT DO NOTHING).

CREATE TABLE IF NOT EXISTS "Command" (
  "id"          TEXT PRIMARY KEY,
  "cmd"         TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "group"      TEXT NOT NULL DEFAULT 'Custom Commands',
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Twitch - Basic (Everyone)
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g1_01','/mods','Show moderators list','Twitch - Basic (Everyone)',1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g1_02','/vips','Show VIP list','Twitch - Basic (Everyone)',2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g1_03','/gift [qty]','Gift subs','Twitch - Basic (Everyone)',3) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g1_04','/vote','Vote in poll','Twitch - Basic (Everyone)',4) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g1_05','/color [name]','Change username color (preset list)','Twitch - Basic (Everyone)',5) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g1_06','/color #[hex]','Custom color (Turbo users only)','Twitch - Basic (Everyone)',6) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g1_07','/block [user]','Block user''s chat/whispers','Twitch - Basic (Everyone)',7) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g1_08','/unblock [user]','Unblock user','Twitch - Basic (Everyone)',8) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g1_09','/disconnect','Disconnect from chat','Twitch - Basic (Everyone)',9) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g1_10','/w [user] [msg]','Whisper privately','Twitch - Basic (Everyone)',10) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g1_11','@username','Tag user in chat','Twitch - Basic (Everyone)',11) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g1_12','Ctrl+R / Option+R','Reply to a user (Win / Mac)','Twitch - Basic (Everyone)',12) ON CONFLICT ("id") DO NOTHING;

-- Twitch - Broadcaster & Moderator
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_01','/pin [msg]','Highlight chat message','Twitch - Broadcaster & Moderator',1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_02','/shoutout [user]','Share streamer''s channel (follow button)','Twitch - Broadcaster & Moderator',2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_03','/announce [msg]','Highlight announcement','Twitch - Broadcaster & Moderator',3) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_04','/monitor [user]','Watch user''s messages','Twitch - Broadcaster & Moderator',4) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_05','/unmonitor [user]','Stop watching user messages','Twitch - Broadcaster & Moderator',5) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_06','/restrict [user]','Restrict user','Twitch - Broadcaster & Moderator',6) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_07','/unrestrict [user]','Remove restriction','Twitch - Broadcaster & Moderator',7) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_08','/user [user]','View user profile, history, notes','Twitch - Broadcaster & Moderator',8) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_09','/timeout [user] [sec]','Temporary ban (default 10m, or set duration) ⏳','Twitch - Broadcaster & Moderator',9) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_10','/ban [user]','Permanent ban','Twitch - Broadcaster & Moderator',10) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_11','/unban [user]','Remove ban/timeout','Twitch - Broadcaster & Moderator',11) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_12','/slow [sec]','Enable slow mode','Twitch - Broadcaster & Moderator',12) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_13','/slowoff','Disable slow mode','Twitch - Broadcaster & Moderator',13) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_14','/followers [time]','Followers-only chat (30m, 1w, 3mo, etc.)','Twitch - Broadcaster & Moderator',14) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_15','/followersoff','Disable followers-only mode','Twitch - Broadcaster & Moderator',15) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_16','/subscribers','Sub-only chat','Twitch - Broadcaster & Moderator',16) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_17','/subscribersoff','Disable sub-only mode','Twitch - Broadcaster & Moderator',17) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_18','/clear','Wipe chat','Twitch - Broadcaster & Moderator',18) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_19','/requests','Open Channel Points request queue','Twitch - Broadcaster & Moderator',19) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_20','/uniquechat','Prevent repeated/copypaste messages','Twitch - Broadcaster & Moderator',20) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_21','/uniquechatoff','Disable uniquechat','Twitch - Broadcaster & Moderator',21) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_22','/emoteonly','Emote-only chat on','Twitch - Broadcaster & Moderator',22) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_23','/emoteonlyoff','Emote-only chat off','Twitch - Broadcaster & Moderator',23) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_24','/poll','Poll management','Twitch - Broadcaster & Moderator',24) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_25','/endpoll','End current poll','Twitch - Broadcaster & Moderator',25) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g2_26','/deletepoll','Delete poll','Twitch - Broadcaster & Moderator',26) ON CONFLICT ("id") DO NOTHING;

-- Twitch - Channel Editor & Broadcaster
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g3_01','/commercial [30|60|90|120|150|180]','Run ad','Twitch - Channel Editor & Broadcaster',1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g3_02','/goal','Manage sub/follower goals','Twitch - Channel Editor & Broadcaster',2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g3_03','/prediction','Manage predictions','Twitch - Channel Editor & Broadcaster',3) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g3_04','/raid [channel]','Start raid','Twitch - Channel Editor & Broadcaster',4) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g3_05','/unraid','Cancel raid','Twitch - Channel Editor & Broadcaster',5) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g3_06','/marker [desc]','Add stream marker','Twitch - Channel Editor & Broadcaster',6) ON CONFLICT ("id") DO NOTHING;

-- Twitch - Broadcaster Only
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g4_01','/mod [user]','Add moderator','Twitch - Broadcaster Only',1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g4_02','/unmod [user]','Remove moderator','Twitch - Broadcaster Only',2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g4_03','/vip [user]','Add VIP','Twitch - Broadcaster Only',3) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g4_04','/unvip [user]','Remove VIP','Twitch - Broadcaster Only',4) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g4_05','/rules','Show channel rules','Twitch - Broadcaster Only',5) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g4_06','/sharedchat','Start/join shared chat','Twitch - Broadcaster Only',6) ON CONFLICT ("id") DO NOTHING;

-- Nightbot - General
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g5_01','!commands','Show available commands','Nightbot - General',1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g5_02','!game','Show current game','Nightbot - General',2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g5_03','!title','Show stream title','Nightbot - General',3) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g5_04','!uptime','Show how long stream has been live ⏱','Nightbot - General',4) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g5_05','!followers','Show follower count','Nightbot - General',5) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g5_06','!subs','Show subscriber count','Nightbot - General',6) ON CONFLICT ("id") DO NOTHING;

-- Nightbot - Fun & Viewer Interaction
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_01','!sr [url/keywords]','Request a song','Nightbot - Fun & Viewer Interaction',1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_02','!songlist','Show song list','Nightbot - Fun & Viewer Interaction',2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_03','!currentsong','Show current song','Nightbot - Fun & Viewer Interaction',3) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_04','!songs skip','Skip current song','Nightbot - Fun & Viewer Interaction',4) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_05','!songs Pause','Pause song','Nightbot - Fun & Viewer Interaction',5) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_06','!songs Play','Play song','Nightbot - Fun & Viewer Interaction',6) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_07','!songs delete [queue_position]','Delete song from the playlist','Nightbot - Fun & Viewer Interaction',7) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_08','!playlist','Show playlist','Nightbot - Fun & Viewer Interaction',8) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_09','!songs next','Go to the next song in the queue','Nightbot - Fun & Viewer Interaction',9) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_10','!songs save [playlist_name]','Save the current queue as a playlist','Nightbot - Fun & Viewer Interaction',10) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_11','!songs promote [queue_position]','Move a song up in the queue','Nightbot - Fun & Viewer Interaction',11) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_12','!songs volume [0-100]','Set the playback volume','Nightbot - Fun & Viewer Interaction',12) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_13','!queue','Show song queue','Nightbot - Fun & Viewer Interaction',13) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_14','!roll','Roll random number (1-100)','Nightbot - Fun & Viewer Interaction',14) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_15','!8ball [question]','Magic 8-ball response','Nightbot - Fun & Viewer Interaction',15) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g6_16','!poll','Start/view poll','Nightbot - Fun & Viewer Interaction',16) ON CONFLICT ("id") DO NOTHING;

-- Nightbot - Mod & Stream Tools
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g7_01','!ban [user]','Ban user','Nightbot - Mod & Stream Tools',1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g7_02','!timeout [user] [sec]','Timeout user ⏳','Nightbot - Mod & Stream Tools',2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g7_03','!permit [user]','Allow links temporarily','Nightbot - Mod & Stream Tools',3) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g7_04','!winner','Pick a random viewer','Nightbot - Mod & Stream Tools',4) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g7_05','!raffle','Start a raffle','Nightbot - Mod & Stream Tools',5) ON CONFLICT ("id") DO NOTHING;

-- Nightbot - Variables (For Custom Commands)
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g8_01','$(user)','Username of caller','Nightbot - Variables (For Custom Commands)',1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g8_02','$(touser [name])','Mentions target user','Nightbot - Variables (For Custom Commands)',2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g8_03','$(count)','Counter value','Nightbot - Variables (For Custom Commands)',3) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g8_04','$(query)','Returns user''s input after command','Nightbot - Variables (For Custom Commands)',4) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g8_05','$(urlfetch [url])','Fetch data from API/URL','Nightbot - Variables (For Custom Commands)',5) ON CONFLICT ("id") DO NOTHING;

-- Custom Commands - Management
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g9_01','!addcom ![Name] [Command]','Add a new custom command','Custom Commands - Management',1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g9_02','!editcom ![Name] [Command]','Edit an existing custom command','Custom Commands - Management',2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g9_03','!editcom !now Currently Watching [New Movie/Show]','Update the"now watching" command','Custom Commands - Management',3) ON CONFLICT ("id") DO NOTHING;

-- Custom Commands - Title Presets
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g10_01','!title Indian Streamer Reacts','Movies / Shows title (Main Channel)','Custom Commands - Title Presets',1) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g10_02','!title Indian Streamer Reacts','Shark Tank title (Main Channel)','Custom Commands - Title Presets',2) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g10_03','!title Indian Streamer Reacts','MasterChef title (Main Channel)','Custom Commands - Title Presets',3) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g10_04','!title Indian Streamer Reacts','Splitsvilla title (Main Channel)','Custom Commands - Title Presets',4) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g10_05','!title Timepass Time','Bigg Boss title (Timepass Time Channel)','Custom Commands - Title Presets',5) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g10_06','!title Timepass Time','Movies / Shows title (Timepass Time Channel)','Custom Commands - Title Presets',6) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g10_07','!title Timepass Time','MasterChef title (Timepass Time Channel)','Custom Commands - Title Presets',7) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g10_08','!title Timepass Time','Shark Tank title (Timepass Time Channel)','Custom Commands - Title Presets',8) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g10_09','!title Timepass Time','Splitsvilla title (Timepass Time Channel)','Custom Commands - Title Presets',9) ON CONFLICT ("id") DO NOTHING;
INSERT INTO "Command" ("id","cmd","description","group","sortOrder") VALUES ('cmd_g10_10','!addcom !prediction Share your predictions on who will be eliminated this week! https://twitch-predcon-frntend-v2.vercel.app/predict','Prediction link command (full copy-paste)','Custom Commands - Title Presets',10) ON CONFLICT ("id") DO NOTHING;
