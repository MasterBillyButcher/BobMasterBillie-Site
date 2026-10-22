import { PrismaClient } from '@prisma/client'

// The site connects with whichever variable exists:
//   1. DATABASE_URL           (manual setup, or local SQLite)
//   2. POSTGRES_PRISMA_URL    (set automatically by the Supabase x Vercel integration)
//   3. POSTGRES_URL           (also set by the integration)
//   4. file:./db/custom.db    (local SQLite fallback)
function resolveDatabaseUrl(): string {
  const raw =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    'file:./db/custom.db'

  // Local SQLite: use exactly as provided
  if (raw.startsWith('file:')) return raw

  // Postgres (Supabase): make sure the serverless-friendly Prisma params exist
  const [base, query = ''] = raw.split('?')
  const params = new URLSearchParams(query)
  if (!params.has('pgbouncer')) params.set('pgbouncer', 'true')
  if (!params.has('connection_limit')) params.set('connection_limit', '1')
  return `${base}?${params.toString()}`
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: resolveDatabaseUrl() } },
    ...(process.env.NODE_ENV === 'development' ? { log: ['query' as const] } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
