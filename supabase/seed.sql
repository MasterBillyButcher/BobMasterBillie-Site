-- BobMasterBillie Command Center - production seed
-- Adds ONLY the real community data: the two veto contenders and the VIP
-- board entry. NO setup movies, NO setup predictions, NO setup activity logs.
--
-- Paste into: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to run more than once (existing rows are skipped).

-- Veto Power contenders
INSERT INTO "Veto" ("id", "username", "vetoRights", "note")
VALUES ('veto_lolwazi', 'Lolwazi', 0, 'Veto contender - 0 active veto rights')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Veto" ("id", "username", "vetoRights", "note")
VALUES ('veto_chadboy_hz', 'Chadboy_hz', 0, 'Veto contender - 0 active veto rights')
ON CONFLICT ("id") DO NOTHING;

-- VIP board: mickey_17__ on his last chance to earn VIP back
INSERT INTO "VipMember" ("id", "username", "status", "grantedAt", "note")
VALUES ('vip_mickey_17__', 'mickey_17__', 'probation', NULL, 'Gets one more chance to earn VIP back.')
ON CONFLICT ("id") DO NOTHING;

-- Prediction page starter setups (one per category used by the site)
-- Titles stay under Twitch's 45-char limit, options under 25 chars.
INSERT INTO "Prediction" ("id", "title", "options", "duration", "category", "status", "pinned")
VALUES
  ('pred_hype_lvl1',  'Will we complete Lvl 1 Hype Train?',  '["Yes","No"]', '5 minutes', 'hype',     'ready', true),
  ('pred_treasure',   'Will the Treasure Train be claimed?', '["Yes","No"]', '5 minutes', 'treasure', 'ready', false),
  ('pred_babu',       'Will Babu arrive before 00:00?',      '["Yes","No"]', '5 minutes', 'babu',     'ready', false),
  ('pred_satta',      'Will tonight''s SATTA round pay out?', '["Yes","No"]', '5 minutes', 'satta',    'ready', false),
  ('pred_subgoal',    'Will we hit the sub goal today?',      '["Yes","No"]', '5 minutes', 'custom',   'ready', false)
ON CONFLICT ("id") DO NOTHING;
