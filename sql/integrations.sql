-- Run this in Supabase's SQL Editor after schema.sql, policies.sql,
-- and functions.sql. Adds the columns the Edge Functions need to
-- track per-client integration state. Safe to run more than once.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS twitch_user_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS twitch_subscription_ids TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS discord_guild_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS discord_last_audit_id TEXT;
