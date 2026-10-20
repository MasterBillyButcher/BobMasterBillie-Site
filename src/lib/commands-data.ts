// Full Twitch + Nightbot + Custom command reference (from BobMasterBillie.docx)

export type Command = {
 cmd: string
 desc: string
}

export type CommandGroup = {
 id: string
 platform:'twitch' |'nightbot' |'custom'
 icon: string
 title: string
 subtitle: string
 commands: Command[]
}

export const commandGroups: CommandGroup[] = [
 {
 id:'twitch-basic',
 platform:'twitch',
 icon:'',
 title:'Twitch - Basic (Everyone)',
 subtitle:'Chat commands available to all viewers',
 commands: [
 { cmd:'/mods', desc:'Show moderators list' },
 { cmd:'/vips', desc:'Show VIP list' },
 { cmd:'/gift [qty]', desc:'Gift subs' },
 { cmd:'/vote', desc:'Vote in poll' },
 { cmd:'/color [name]', desc:'Change username color (preset list)' },
 { cmd:'/color #[hex]', desc:'Custom color (Turbo users only)' },
 { cmd:'/block [user]', desc:"Block user's chat/whispers" },
 { cmd:'/unblock [user]', desc:'Unblock user' },
 { cmd:'/disconnect', desc:'Disconnect from chat' },
 { cmd:'/w [user] [msg]', desc:'Whisper privately' },
 { cmd:'@username', desc:'Tag user in chat' },
 { cmd:'Ctrl+R / Option+R', desc:'Reply to a user (Win / Mac)' },
 ],
 },
 {
 id:'twitch-mod',
 platform:'twitch',
 icon:'',
 title:'Twitch - Broadcaster & Moderator',
 subtitle:'Moderation and chat management',
 commands: [
 { cmd:'/pin [msg]', desc:'Highlight chat message' },
 { cmd:'/shoutout [user]', desc:"Share streamer's channel (follow button)" },
 { cmd:'/announce [msg]', desc:'Highlight announcement' },
 { cmd:'/monitor [user]', desc:"Watch user's messages" },
 { cmd:'/unmonitor [user]', desc:'Stop watching user messages' },
 { cmd:'/restrict [user]', desc:'Restrict user' },
 { cmd:'/unrestrict [user]', desc:'Remove restriction' },
 { cmd:'/user [user]', desc:'View user profile, history, notes' },
 { cmd:'/timeout [user] [sec]', desc:'Temporary ban (default 10m, or set duration) ⏳' },
 { cmd:'/ban [user]', desc:'Permanent ban' },
 { cmd:'/unban [user]', desc:'Remove ban/timeout' },
 { cmd:'/slow [sec]', desc:'Enable slow mode' },
 { cmd:'/slowoff', desc:'Disable slow mode' },
 { cmd:'/followers [time]', desc:'Followers-only chat (30m, 1w, 3mo, etc.)' },
 { cmd:'/followersoff', desc:'Disable followers-only mode' },
 { cmd:'/subscribers', desc:'Sub-only chat' },
 { cmd:'/subscribersoff', desc:'Disable sub-only mode' },
 { cmd:'/clear', desc:'Wipe chat' },
 { cmd:'/requests', desc:'Open Channel Points request queue' },
 { cmd:'/uniquechat', desc:'Prevent repeated/copypaste messages' },
 { cmd:'/uniquechatoff', desc:'Disable uniquechat' },
 { cmd:'/emoteonly', desc:'Emote-only chat on' },
 { cmd:'/emoteonlyoff', desc:'Emote-only chat off' },
 { cmd:'/poll', desc:'Poll management' },
 { cmd:'/endpoll', desc:'End current poll' },
 { cmd:'/deletepoll', desc:'Delete poll' },
 ],
 },
 {
 id:'twitch-editor',
 platform:'twitch',
 icon:'',
 title:'Twitch - Channel Editor & Broadcaster',
 subtitle:'Stream operations commands',
 commands: [
 { cmd:'/commercial [30|60|90|120|150|180]', desc:'Run ad' },
 { cmd:'/goal', desc:'Manage sub/follower goals' },
 { cmd:'/prediction', desc:'Manage predictions' },
 { cmd:'/raid [channel]', desc:'Start raid' },
 { cmd:'/unraid', desc:'Cancel raid' },
 { cmd:'/marker [desc]', desc:'Add stream marker' },
 ],
 },
 {
 id:'twitch-broadcaster',
 platform:'twitch',
 icon:'',
 title:'Twitch - Broadcaster Only',
 subtitle:'Channel owner commands',
 commands: [
 { cmd:'/mod [user]', desc:'Add moderator' },
 { cmd:'/unmod [user]', desc:'Remove moderator' },
 { cmd:'/vip [user]', desc:'Add VIP' },
 { cmd:'/unvip [user]', desc:'Remove VIP' },
 { cmd:'/rules', desc:'Show channel rules' },
 { cmd:'/sharedchat', desc:'Start/join shared chat' },
 ],
 },
 {
 id:'nightbot-general',
 platform:'nightbot',
 icon:'',
 title:'Nightbot - General',
 subtitle:'Stream info commands',
 commands: [
 { cmd:'!commands', desc:'Show available commands' },
 { cmd:'!game', desc:'Show current game' },
 { cmd:'!title', desc:'Show stream title' },
 { cmd:'!uptime', desc:'Show how long stream has been live ⏱' },
 { cmd:'!followers', desc:'Show follower count' },
 { cmd:'!subs', desc:'Show subscriber count' },
 ],
 },
 {
 id:'nightbot-fun',
 platform:'nightbot',
 icon:'',
 title:'Nightbot - Fun & Viewer Interaction',
 subtitle:'Song requests, games and polls',
 commands: [
 { cmd:'!sr [url/keywords]', desc:'Request a song' },
 { cmd:'!songlist', desc:'Show song list' },
 { cmd:'!currentsong', desc:'Show current song' },
 { cmd:'!songs skip', desc:'Skip current song' },
 { cmd:'!songs Pause', desc:'Pause song' },
 { cmd:'!songs Play', desc:'Play song' },
 { cmd:'!songs delete [queue_position]', desc:'Delete song from the playlist' },
 { cmd:'!playlist', desc:'Show playlist' },
 { cmd:'!songs next', desc:'Go to the next song in the queue' },
 { cmd:'!songs save [playlist_name]', desc:'Save the current queue as a playlist' },
 { cmd:'!songs promote [queue_position]', desc:'Move a song up in the queue' },
 { cmd:'!songs volume [0-100]', desc:'Set the playback volume' },
 { cmd:'!queue', desc:'Show song queue' },
 { cmd:'!roll', desc:'Roll random number (1-100)' },
 { cmd:'!8ball [question]', desc:'Magic 8-ball response' },
 { cmd:'!poll', desc:'Start/view poll' },
 ],
 },
 {
 id:'nightbot-mod',
 platform:'nightbot',
 icon:'',
 title:'Nightbot - Mod & Stream Tools',
 subtitle:'Moderation via Nightbot',
 commands: [
 { cmd:'!ban [user]', desc:'Ban user' },
 { cmd:'!timeout [user] [sec]', desc:'Timeout user ⏳' },
 { cmd:'!permit [user]', desc:'Allow links temporarily' },
 { cmd:'!winner', desc:'Pick a random viewer' },
 { cmd:'!raffle', desc:'Start a raffle' },
 ],
 },
 {
 id:'nightbot-vars',
 platform:'nightbot',
 icon:'',
 title:'Nightbot - Variables (For Custom Commands)',
 subtitle:'Dynamic values usable in custom commands',
 commands: [
 { cmd:'$(user)', desc:'Username of caller' },
 { cmd:'$(touser [name])', desc:'Mentions target user' },
 { cmd:'$(count)', desc:'Counter value' },
 { cmd:'$(query)', desc:"Returns user's input after command" },
 { cmd:'$(urlfetch [url])', desc:'Fetch data from API/URL' },
 ],
 },
 {
 id:'custom-manage',
 platform:'custom',
 icon:'',
 title:'Custom Commands - Management',
 subtitle:'Create & edit Nightbot custom commands',
 commands: [
 { cmd:'!addcom ![Name] [Command]', desc:'Add a new custom command' },
 { cmd:'!editcom ![Name] [Command]', desc:'Edit an existing custom command' },
 {
 cmd:'!editcom !now Currently Watching [New Movie/Show]',
 desc:'Update the"now watching" command',
 },
 ],
 },
 {
 id:'custom-titles',
 platform:'custom',
 icon:'',
 title:'Custom Commands - Title Presets',
 subtitle:'Quick !title switchers per content type',
 commands: [
 { cmd:'!title Indian Streamer Reacts', desc:'Movies / Shows title (Main Channel)' },
 { cmd:'!title Indian Streamer Reacts', desc:'Shark Tank title (Main Channel)' },
 { cmd:'!title Indian Streamer Reacts', desc:'MasterChef title (Main Channel)' },
 { cmd:'!title Indian Streamer Reacts', desc:'Splitsvilla title (Main Channel)' },
 { cmd:'!title Timepass Time', desc:'Bigg Boss title (Timepass Time Channel)' },
 { cmd:'!title Timepass Time', desc:'Movies / Shows title (Timepass Time Channel)' },
 { cmd:'!title Timepass Time', desc:'MasterChef title (Timepass Time Channel)' },
 { cmd:'!title Timepass Time', desc:'Shark Tank title (Timepass Time Channel)' },
 { cmd:'!title Timepass Time', desc:'Splitsvilla title (Timepass Time Channel)' },
 {
 cmd:'!addcom !prediction Share your predictions on who will be eliminated this week! https://twitch-predcon-frntend-v2.vercel.app/predict',
 desc:'Prediction link command (full copy-paste)',
 },
 ],
 },
]

export const cvTemplates = [
 {
 id:'discord-mod',
 title:'Discord Moderator Application',
 icon:'',
 body: `Hey [Server Name]! 

I'm **@BobMasterBillie**, an experienced Discord mod ready to take your server to the next level!

 What I do:
• Keep chats safe, friendly & drama-free 
• Expert in server setup, roles, channels & bots 
• Run polls, events & engagement to grow activity 
• Reliable & always active, no downtime

I don't just moderate. I **boost community engagement and make your server thrive**.
Let's chat so I can start helping your community shine! 

- BobMasterBillie`,
 },
 {
 id:'stream-mod',
 title:'Streaming Moderator (Twitch/YouTube) Application',
 icon:'',
 body: `Hey [Streamer Name]! 

I'm **@BobMasterBillie**, your next mod who keeps streams smooth, safe & engaging!

 What I do:
• Spam-free, positive chat moderation 
• Nightbot, MEE6, Dyno & StreamElements expert 
• Run polls, games & chat prompts to increase viewer interaction 
• Calm, reliable & always present during streams

I don't just moderate. I **enhance your streams and grow your community**.
Can we chat about me joining your team? 

- BobMasterBillie`,
 },
]
