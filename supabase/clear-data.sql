-- BobMasterBillie Command Center - WIPE ALL DATA (one-time reset)
-- Paste this whole file into: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Use this if your live site still shows setup/demo data (old movies, setup
-- activity logs, demo announcements). It empties every table but keeps them,
-- so the site starts clean and you add your own data in the app.
TRUNCATE TABLE "ActivityLog", "BacklogEvent", "VipEvent", "VipMember",
  "Announcement", "Veto", "Prediction", "Movie" CASCADE;
