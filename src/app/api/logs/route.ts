import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const limit = Math.min(200, Number(searchParams.get('limit')) || 100)

  const logs = await db.activityLog.findMany({
    where: type && type !== 'all' ? { type } : undefined,
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })
  return NextResponse.json(logs)
}

export async function POST(req: Request) {
  const body = await req.json()
  const title = String(body.title ?? '').trim()
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }
  const types = ['movie', 'prediction', 'veto', 'vip', 'announcement', 'stream', 'custom'] as const
  const log = await db.activityLog.create({
    data: {
      title,
      details: body.details ? String(body.details) : null,
      type: types.includes(body.type) ? body.type : 'custom',
      action: 'note',
      pinned: Boolean(body.pinned) ?? false,
    },
  })
  // No auto-log here - the entry itself IS the log (manual note).
  if (log.type === 'announcement') {
    await db.announcement.create({ data: { message: title } })
  }
  return NextResponse.json(log, { status: 201 })
}

export const dynamic = 'force-dynamic'
