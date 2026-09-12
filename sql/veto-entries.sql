-- Run this in Supabase's SQL Editor, after sql/reference-sections.sql.
-- Safe to re-run.
--
-- Replaces the earlier reference_counters approach, which only
-- supported two hardcoded viewers (Lolwazi, Chadboy_hz) with no way
-- to add or remove anyone. This is a real list: any number of
-- viewers, each with their own veto count, addable/removable, with
-- an atomic +/- per person.

CREATE TABLE IF NOT EXISTS veto_entries (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  veto_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE veto_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read" ON veto_entries;
CREATE POLICY "public_read" ON veto_entries
  FOR SELECT
  USING (true);

-- Same model as the other tables: no public write policy. Only
-- api/veto.js can add, remove, or adjust a row, using the
-- service_role key after checking EDIT_PASSWORD server-side.

CREATE OR REPLACE FUNCTION adjust_veto_entry(p_id TEXT, p_delta INT)
RETURNS INT AS $$
  UPDATE veto_entries
  SET veto_count = GREATEST(0, veto_count + p_delta)
  WHERE id = p_id
  RETURNING veto_count;
$$ LANGUAGE sql;

GRANT EXECUTE ON FUNCTION adjust_veto_entry(TEXT, INT) TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'veto_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE veto_entries;
  END IF;
END $$;

-- Carries over the two viewers from the original doc as a starting
-- point. Safe to re-run — ON CONFLICT DO NOTHING means it never resets
-- a real count back to 0 once you've started using the page.
INSERT INTO veto_entries (id, username, veto_count) VALUES
  ('veto-lolwazi', 'Lolwazi', 0),
  ('veto-chadboy_hz', 'Chadboy_hz', 0)
ON CONFLICT (id) DO NOTHING;

-- Migration cleanup for anyone who ran the old reference-counters.sql
-- in an earlier version of this project: that table only ever held
-- veto counts, so it's now fully replaced by this one. Safe no-op if
-- it was never created.
DROP TABLE IF EXISTS reference_counters CASCADE;
