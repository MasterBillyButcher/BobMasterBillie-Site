-- Run this in Supabase's SQL Editor, after sql/reference-sections.sql
-- and sql/veto-entries.sql. Safe to re-run.
--
-- Real movie/segment backlog items — an actual addable/removable log
-- with kind (movie/show), platform, duration, and language, not just
-- a bare title. The displayed count on the page is just this table's
-- row count, so it can never drift out of sync with itself the way
-- the old "(2)" label from the original doc did.

CREATE TABLE IF NOT EXISTS backlog_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'movie',   -- 'movie' or 'show'
  platform TEXT,                         -- e.g. Netflix, YouTube, Prime Video
  duration TEXT,                         -- free text, e.g. "2h 10m" or "45m/ep"
  language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Additive columns for anyone who already ran an earlier version of
-- this file (which only had id/title/created_at). No-op on a fresh
-- install where CREATE TABLE above already includes them.
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'movie';
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS platform TEXT;
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE backlog_items ADD COLUMN IF NOT EXISTS language TEXT;

ALTER TABLE backlog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read" ON backlog_items;
CREATE POLICY "public_read" ON backlog_items
  FOR SELECT
  USING (true);

-- Same model as the other tables: no public write policy. Only
-- api/backlog.js can add or remove a row, using the service_role key
-- after checking EDIT_PASSWORD server-side.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'backlog_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE backlog_items;
  END IF;
END $$;

-- No seed data — the original doc's 9 tags never had real titles, so
-- there's nothing genuine to carry over. Starts empty; add real
-- movies/shows through the page once this is deployed.
