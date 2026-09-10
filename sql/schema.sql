-- Paste this whole file into Supabase: Project > SQL Editor > New query,
-- then click Run. Safe to run more than once.

-- ---------- clients ----------
-- Each row is a streamer or server you manage.
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  twitch_channel TEXT,
  youtube_channel TEXT,
  discord_server TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active | paused | ended
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- per-client channel state ----------
CREATE TABLE IF NOT EXISTS channel_state (
  client_id TEXT PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  is_live BOOLEAN NOT NULL DEFAULT false,
  hype_train BOOLEAN NOT NULL DEFAULT false,
  treasure_train BOOLEAN NOT NULL DEFAULT false,
  vip_resolved BOOLEAN NOT NULL DEFAULT false
);

-- ---------- veto rights (per client) ----------
CREATE TABLE IF NOT EXISTS veto_rights (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  count INT NOT NULL DEFAULT 0
);

-- ---------- movie / segment backlog (per client) ----------
CREATE TABLE IF NOT EXISTS backlog_items (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- unified moderation log, across platforms ----------
CREATE TABLE IF NOT EXISTS mod_actions (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- twitch | discord | youtube
  action_type TEXT NOT NULL, -- ban | timeout | warn | kick | unban
  target_user TEXT NOT NULL,
  reason TEXT,
  moderator TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- discord roles reference (per client server) ----------
CREATE TABLE IF NOT EXISTS discord_roles (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  permission_note TEXT,
  member_count INT
);

-- ---------- discord support tickets ----------
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  opened_by TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | closed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- mod shift schedule ----------
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  mod_name TEXT NOT NULL,
  day_label TEXT NOT NULL, -- e.g. Mon, Tue, or a date
  start_time TEXT NOT NULL, -- free text, e.g. "18:00"
  end_time TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'twitch'
);

-- ---------- billing ----------
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL, -- e.g. "August 2026"
  hours NUMERIC NOT NULL DEFAULT 0,
  rate NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- seed one example client so the console isn't empty on first load ----------
INSERT INTO clients (id, name, twitch_channel, discord_server, status)
VALUES ('example-client', 'Example streamer', 'Indian Streamer Reacts', 'Example Discord', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO channel_state (client_id)
VALUES ('example-client')
ON CONFLICT (client_id) DO NOTHING;

-- ---------- lock the tables down until policies.sql runs ----------
-- This console DOES talk to Supabase directly from the browser, using
-- the public anon key (see js/config.js). Enabling RLS here, before
-- any policy exists, means nothing can be read or written yet, not
-- even by a logged-in user. Run sql/policies.sql next to allow
-- authenticated users through.
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE veto_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mod_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
