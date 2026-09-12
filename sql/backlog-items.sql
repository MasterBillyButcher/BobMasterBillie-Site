-- Run this in Supabase's SQL Editor, after reference-sections.sql and
-- reference-counters.sql. Safe to re-run.
--
-- Real movie/segment backlog items — replaces the old blank 🏷️
-- placeholder tags and the disconnected abstract counter with an
-- actual addable/removable list. The displayed count on the page is
-- just this table's row count, so it can never drift out of sync
-- with itself the way the old "(2)" label did.

CREATE TABLE IF NOT EXISTS backlog_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE backlog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read" ON backlog_items;
CREATE POLICY "public_read" ON backlog_items
  FOR SELECT
  USING (true);

-- Same model as the other two tables: no public write policy. Only
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
-- there's nothing genuine to carry over. Starts empty; add real movies
-- through the page once this is deployed.
