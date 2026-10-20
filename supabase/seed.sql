-- BobMasterBillie Command Center — initial data (matches the doc)
-- Run AFTER init.sql in the Supabase SQL Editor.

-- Movies
INSERT INTO "Movie" ("id", "title", "status", "notes", "plannedDate", "watchedDate") VALUES
  (gen_random_uuid()::text, 'Manzil',    'planned', 'Earned via bits goal (+1 backlog)', now() + interval '2 day', NULL),
  (gen_random_uuid()::text, 'Rockstar',  'planned', 'Earned via bits goal (+1 backlog)', NULL, NULL),
  (gen_random_uuid()::text, 'Saiyaara',  'planned', 'Earned via bits goal (+1 backlog)', NULL, NULL),
  (gen_random_uuid()::text, 'The Notebook', 'watched', 'Completed Oct 19 • -1 backlog +1 backlog (Bits Goal)', NULL, now() - interval '1 day');

-- Backlog ledger — +1 bits goal completed · -1 movie watched
INSERT INTO "BacklogEvent" ("id", "type", "delta", "note", "occurredAt") VALUES
  (gen_random_uuid()::text, 'bits_goal',  1, 'Bits goal completed — Manzil earned for the backlog',      now() - interval '8 day'),
  (gen_random_uuid()::text, 'bits_goal',  1, 'Bits goal completed — Rockstar earned for the backlog',    now() - interval '6 day'),
  (gen_random_uuid()::text, 'bits_goal',  1, 'Bits goal completed — Saiyaara earned for the backlog',    now() - interval '4 day'),
  (gen_random_uuid()::text, 'bits_goal',  1, 'Bits goal completed — The Notebook earned for the backlog', now() - interval '3 day'),
  (gen_random_uuid()::text, 'watched',   -1, 'Watched: The Notebook',                                     now() - interval '1 day');

-- Predictions (copy-paste ready)
INSERT INTO "Prediction" ("id", "title", "options", "announceText", "duration", "category", "pinned") VALUES
  (gen_random_uuid()::text, 'Will We Complete Lvl 1 Hype Train?',
   '["Yes","No"]',
   '/announcepurple HYPE TRAIN INCOMING — Will We Complete Lvl 1? Make your predictions now!',
   '10 minutes', 'hype', true),
  (gen_random_uuid()::text, 'Will We Complete Lvl 1 Treasure Train?',
   '["Yes","No"]',
   '/announcepurple TREASURE TRAIN — Will We Complete Lvl 1? Predict now!',
   '10 minutes', 'treasure', false),
  (gen_random_uuid()::text, 'SATTA LIVE — Make your predictions now!',
   '["Yes","No"]',
   '/announcepurple SATTA LIVE — Make your predictions now!',
   '5 minutes', 'satta', false),
  (gen_random_uuid()::text, 'Will Babu arrive before 00:00?',
   '["Before 00:00","After 00:00"]',
   '/announcepurple Prediction Session — Will Babu arrive before 00:00? Vote now!',
   '5 minutes', 'babu', true);

-- Veto Power (Chad & Lolwazi — VIP is tracked separately)
INSERT INTO "Veto" ("id", "username", "vetoRights", "note") VALUES
  (gen_random_uuid()::text, 'Lolwazi',    0, '0 active veto rights'),
  (gen_random_uuid()::text, 'Chadboy_hz', 0, '0 active veto rights');

-- VIP Board (mickey_17__ separate — one more chance)
INSERT INTO "VipMember" ("id", "username", "status", "note") VALUES
  (gen_random_uuid()::text, 'mickey_17__', 'probation', 'Gets one more chance to earn VIP back.');

INSERT INTO "VipEvent" ("id", "username", "eventType", "month", "note") VALUES
  (gen_random_uuid()::text, 'mickey_17__', 'probation', to_char(now(), 'YYYY-MM'), 'Moved to probation — one more chance to earn VIP back.');

-- Announcements
INSERT INTO "Announcement" ("id", "message") VALUES
  (gen_random_uuid()::text, 'Prediction Session rules — each prediction is open for 5 minutes. New predictions every 15 minutes. Don’t miss your chance to vote and see what happens!'),
  (gen_random_uuid()::text, 'No stream tonight, y’all. He’ll see everyone tomorrow night!'),
  (gen_random_uuid()::text, 'Stream chat will still happen at the usual time — wait for it.');

-- Activity Log
INSERT INTO "ActivityLog" ("id", "type", "action", "title", "details", "pinned") VALUES
  (gen_random_uuid()::text, 'movie', 'updated', 'The Notebook completed — Oct 19',
   '-1 backlog +1 backlog (Bits Goal). Watched on Oct 19.', true),
  (gen_random_uuid()::text, 'backlog', 'created', 'Backlog tracker live — count +3',
   '+4 bits goals completed · -1 movie watched (The Notebook) → backlog count +3. Movies to watch: Manzil, Rockstar, Saiyaara.', true),
  (gen_random_uuid()::text, 'vip', 'updated', 'Monthly VIP Event — mickey_17__ on probation',
   'mickey_17__ gets one more chance to earn VIP back.', true),
  (gen_random_uuid()::text, 'veto', 'updated', 'Veto board updated',
   'Lolwazi — 0 active veto rights. Chadboy_hz — 0 active veto rights.', false),
  (gen_random_uuid()::text, 'prediction', 'created', 'Prediction session rules set',
   'Each prediction open for 5 minutes. New predictions every 15 minutes.', false),
  (gen_random_uuid()::text, 'stream', 'note', 'No stream tonight',
   'No stream tonight, y’all. Stream chat will still happen at the usual time. Back tomorrow night!', false),
  (gen_random_uuid()::text, 'custom', 'note', 'Command center migrated from doc',
   'BobMasterBillie.docx migrated to the live Command Center — every log & update now lives here.', true);
