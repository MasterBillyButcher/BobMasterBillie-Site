-- Run this in Supabase's SQL Editor, after sql/reference-sections.sql.
-- Adds real, live counters (veto rights per viewer, movie backlog
-- count) — separate from reference_sections' free-text content
-- because these need atomic increment/decrement, not "edit some HTML
-- and save." Safe to re-run.

CREATE TABLE IF NOT EXISTS reference_counters (
  id TEXT PRIMARY KEY,
  section_slug TEXT NOT NULL,   -- which section this counter displays under
  label TEXT NOT NULL,
  value INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reference_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read" ON reference_counters;
CREATE POLICY "public_read" ON reference_counters
  FOR SELECT
  USING (true);

-- Same model as reference_sections: no public write policy at all.
-- The only way to change a value is through api/adjust-counter.js,
-- which checks EDIT_PASSWORD server-side, then calls the function
-- below using the service_role key.

CREATE OR REPLACE FUNCTION adjust_reference_counter(p_id TEXT, p_delta INT)
RETURNS INT AS $$
  UPDATE reference_counters
  SET value = GREATEST(0, value + p_delta), updated_at = now()
  WHERE id = p_id
  RETURNING value;
$$ LANGUAGE sql;

-- service_role bypasses RLS and function-execute grants entirely, so
-- this GRANT isn't strictly required for api/adjust-counter.js to
-- work — it's here so the function isn't accidentally unusable if
-- this table's access model changes later.
GRANT EXECUTE ON FUNCTION adjust_reference_counter(TEXT, INT) TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'reference_counters'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reference_counters;
  END IF;
END $$;

-- Deliberately ON CONFLICT DO NOTHING, not DO UPDATE like
-- reference-sections.sql uses. These values change through the +/-
-- buttons on the live page, re-running this file should never reset
-- someone's actual veto count back to the seed value.
INSERT INTO reference_counters (id, section_slug, label, value) VALUES
  ('veto-lolwazi', 'veto', 'Lolwazi', 0),
  ('veto-chadboy_hz', 'veto', 'Chadboy_hz', 0)
ON CONFLICT (id) DO NOTHING;

-- Cleanup for anyone who ran an earlier version of this file: the
-- movie backlog used to be an abstract number here. It's now a real
-- list of titles in backlog_items (see sql/backlog-items.sql), so
-- the old counter would just be a second, disconnected number sitting
-- next to the real list. Safe no-op if it was never created.
DELETE FROM reference_counters WHERE id = 'backlog-count';
