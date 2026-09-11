-- Run this in the Supabase SQL editor before seeding the initial
-- password with `npm run seed:password`.

create table if not exists public.dashboard_auth (
  id integer primary key default 1,
  password_hash text not null,
  password_version integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint dashboard_auth_single_row check (id = 1)
);

-- Row Level Security is enabled and no policies are defined for the anon
-- or authenticated roles, so this table is completely inaccessible from
-- the browser or any client using the anon/publishable key. Only the
-- service-role key (used exclusively in lib/supabase-admin.js, loaded
-- only by server.js — never shipped to /public) can read or write it.
alter table public.dashboard_auth enable row level security;

-- Intentionally no CREATE POLICY statements here: default-deny.
