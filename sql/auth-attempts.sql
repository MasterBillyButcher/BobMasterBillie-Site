-- Run this in Supabase's SQL Editor, after the other sql/ files.
-- Safe to re-run.
--
-- Tracks failed password attempts per IP so the password check can't
-- be brute-forced with unlimited guesses. Unlike every other table in
-- this project, this one has NO public read policy either — there's
-- no legitimate reason for a browser to ever query it directly, it
-- exists purely as internal bookkeeping for the /api functions.

CREATE TABLE IF NOT EXISTS auth_attempts (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip_time
  ON auth_attempts (ip, created_at);

ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;

-- Deliberately zero policies — not even a read policy. Only the
-- service_role key (used inside api/_lib/rate-limit.js) can touch
-- this table at all, which is exactly right for something that's
-- pure internal bookkeeping, never meant to be displayed anywhere.
