-- BobMasterBillie Command Center - Supabase / Postgres table setup
-- Paste this whole file into: Supabase Dashboard -> SQL Editor -> New query -> Run

CREATE TABLE IF NOT EXISTS "Movie" (
  "id"          TEXT PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'planned',
  "notes"       TEXT,
  "plannedDate" TIMESTAMP(3),
  "watchedDate" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Prediction" (
  "id"           TEXT PRIMARY KEY,
  "title"        TEXT NOT NULL,
  "options"      TEXT NOT NULL DEFAULT '["Yes","No"]',
  "announceText" TEXT,
  "duration"     TEXT NOT NULL DEFAULT '5 minutes',
  "category"     TEXT NOT NULL DEFAULT 'custom',
  "status"       TEXT NOT NULL DEFAULT 'ready',
  "outcome"      TEXT,
  "usedAt"       TIMESTAMP(3),
  "pinned"       BOOLEAN NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Veto" (
  "id"         TEXT PRIMARY KEY,
  "username"   TEXT NOT NULL,
  "vetoRights" INTEGER NOT NULL DEFAULT 0,
  "note"       TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "VipMember" (
  "id"        TEXT PRIMARY KEY,
  "username"  TEXT NOT NULL,
  "status"    TEXT NOT NULL DEFAULT 'active',
  "grantedAt" TIMESTAMP(3),
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "VipEvent" (
  "id"        TEXT PRIMARY KEY,
  "username"  TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "month"     TEXT NOT NULL,
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "BacklogEvent" (
  "id"         TEXT PRIMARY KEY,
  "type"       TEXT NOT NULL,
  "delta"      INTEGER NOT NULL,
  "note"       TEXT,
  "movieId"    TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id"        TEXT PRIMARY KEY,
  "type"      TEXT NOT NULL DEFAULT 'update',
  "action"    TEXT NOT NULL DEFAULT 'note',
  "title"     TEXT NOT NULL,
  "details"   TEXT,
  "pinned"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Announcement" (
  "id"        TEXT PRIMARY KEY,
  "message"   TEXT NOT NULL,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Command" (
  "id"          TEXT PRIMARY KEY,
  "cmd"         TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "group"       TEXT NOT NULL DEFAULT 'Custom Commands',
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
