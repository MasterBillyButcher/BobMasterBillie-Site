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
-- One free-text document per section — Twitch, Nightbot, Custom
-- Commands, Predictions, Channels, Stream Notes, Backlog, Veto Power,
-- Quick Links, CV. Just a big text field per section, like a plain
-- notes doc. Same lockdown pattern as dashboard_auth: RLS on, no
-- anon/authenticated policies, server-side access only.
-- ---------------------------------------------------------------------
create table if not exists public.dashboard_docs (
  section text primary key,
  content text not null default '',
  previous_content text,
  previous_updated_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.dashboard_docs enable row level security;

-- No CREATE POLICY statements here either: default-deny.

-- If you already created dashboard_docs before this file added
-- one-level undo, run this once to add the two new columns:
-- alter table public.dashboard_docs add column if not exists previous_content text;
-- alter table public.dashboard_docs add column if not exists previous_updated_at timestamptz;

-- If you previously created dashboard_items for the old list-based
-- version, it's no longer used by the app and can be dropped:
-- drop table if exists public.dashboard_items;
