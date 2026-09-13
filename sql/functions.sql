-- Run this in Supabase's SQL Editor after schema.sql and policies.sql.
-- These replace the app's old read-then-write toggle pattern with
-- single atomic statements, so two people clicking the same toggle at
-- nearly the same moment can no longer produce a wrong or lost update.

CREATE OR REPLACE FUNCTION toggle_live(p_client_id TEXT)
RETURNS BOOLEAN AS $$
  UPDATE channel_state SET is_live = NOT is_live
  WHERE client_id = p_client_id
  RETURNING is_live;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION toggle_hype_train(p_client_id TEXT)
RETURNS BOOLEAN AS $$
  UPDATE channel_state SET hype_train = NOT hype_train
  WHERE client_id = p_client_id
  RETURNING hype_train;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION toggle_treasure_train(p_client_id TEXT)
RETURNS BOOLEAN AS $$
  UPDATE channel_state SET treasure_train = NOT treasure_train
  WHERE client_id = p_client_id
  RETURNING treasure_train;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION toggle_vip_resolved(p_client_id TEXT)
RETURNS BOOLEAN AS $$
  UPDATE channel_state SET vip_resolved = NOT vip_resolved
  WHERE client_id = p_client_id
  RETURNING vip_resolved;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION adjust_veto_count(p_id TEXT, p_delta INT)
RETURNS INT AS $$
  UPDATE veto_rights SET count = GREATEST(0, count + p_delta)
  WHERE id = p_id
  RETURNING count;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION toggle_ticket_status(p_id TEXT)
RETURNS TEXT AS $$
  UPDATE tickets SET status = CASE WHEN status = 'open' THEN 'closed' ELSE 'open' END
  WHERE id = p_id
  RETURNING status;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION toggle_invoice_status(p_id TEXT)
RETURNS TEXT AS $$
  UPDATE invoices SET status = CASE WHEN status = 'pending' THEN 'paid' ELSE 'pending' END
  WHERE id = p_id
  RETURNING status;
$$ LANGUAGE sql;

-- Row Level Security still applies to functions that read/write
-- tables the caller doesn't otherwise have access to, so grant
-- execute to the same "authenticated" role the table policies use.
GRANT EXECUTE ON FUNCTION toggle_live(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_hype_train(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_treasure_train(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_vip_resolved(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION adjust_veto_count(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_ticket_status(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_invoice_status(TEXT) TO authenticated;
