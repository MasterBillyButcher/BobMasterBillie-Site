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

-- ---------------------------------------------------------------------
-- Content storage for the dashboard's list-based sections: Custom
-- Commands, Predictions, Channels, Stream Notes, Backlog, Veto Power,
-- Quick Links, CV. One generic table, distinguished by `section`.
-- Same lockdown pattern as dashboard_auth: RLS on, no anon/authenticated
-- policies, server-side access only via the service-role key.
-- ---------------------------------------------------------------------
create table if not exists public.dashboard_items (
  id uuid primary key default gen_random_uuid(),
  section text not null,
  title text not null,
  body text,
  url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dashboard_items_section_idx
  on public.dashboard_items (section, position, created_at);

alter table public.dashboard_items enable row level security;

-- No CREATE POLICY statements here either: default-deny.
