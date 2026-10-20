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
