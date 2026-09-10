-- Run this in Supabase's SQL Editor AFTER schema.sql.
-- schema.sql enables Row Level Security on every table with no
-- policies, meaning nobody (not even a logged-in user) can read or
-- write yet. This adds one policy per table: any authenticated
-- Supabase user (someone who has actually logged in) gets full
-- access. Nobody who hasn't logged in (the "anon" role) can touch
-- any of this data, even though the anon key is visible in the page
-- source, that's expected and fine, it's the RLS policy that matters.

CREATE POLICY "authenticated_full_access" ON clients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON channel_state
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON veto_rights
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON backlog_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON mod_actions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON discord_roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON tickets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON shifts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
