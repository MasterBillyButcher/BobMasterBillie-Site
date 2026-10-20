// Shared client types matching the Prisma models (serialized JSON)

export type Movie = {
  id: string
  title: string
  status: 'planned' | 'watching' | 'watched'
  notes: string | null
  plannedDate: string | null
  watchedDate: string | null
  createdAt: string
  updatedAt: string
}

export type Prediction = {
  id: string
  title: string
  options: string // JSON array string, e.g. '["Yes","No"]'
  announceText: string | null
  duration: string
  category: 'hype' | 'treasure' | 'satta' | 'babu' | 'custom'
  status: 'ready' | 'used'
  outcome: string | null
  usedAt: string | null
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export type Veto = {
  id: string
  username: string
  vetoRights: number
  note: string | null
  createdAt: string
  updatedAt: string
}

export type VipMember = {
  id: string
  username: string
  status: 'active' | 'probation' | 'revoked'
  grantedAt: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export type VipEvent = {
  id: string
  username: string
  eventType: 'granted' | 'revoked' | 'probation' | 'returned'
  month: string // "2026-10"
  note: string | null
  createdAt: string
}

export type BacklogEvent = {
  id: string
  type: 'bits_goal' | 'watched'
  delta: number // +1 | -1
  note: string | null
  movieId: string | null
  occurredAt: string
  createdAt: string
}

export type ActivityLog = {
  id: string
  type: 'movie' | 'prediction' | 'veto' | 'vip' | 'backlog' | 'announcement' | 'stream' | 'custom'
  action: 'created' | 'updated' | 'deleted' | 'note' | 'scheduled'
  title: string
  details: string | null
  pinned: boolean
  createdAt: string
}

export type Announcement = {
  id: string
  message: string
  active: boolean
  createdAt: string
  updatedAt: string
}
