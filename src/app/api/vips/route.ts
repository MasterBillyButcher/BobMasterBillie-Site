import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'

const STATUSES = ['active', 'probation', 'revoked']

export async function GET() {
  const vips = await db.vipMember.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(vips)
}

// POST - add a VIP member (auto-writes a VipEvent for the current month)
export async function POST(req: Request) {
  const body = await req.json()
  const username = String(body.username ?? '').trim()
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }
  const status = STATUSES.includes(body.status) ? body.status : 'active'
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const vip = await db.vipMember.create({
    data: {
      username,
      status,
      grantedAt: status === 'active' ? now : null,
      note: body.note ? String(body.note) : null,
    },
  })

  await db.vipEvent.create({
    data: {
      username,
      eventType: status === 'active' ? 'granted' : status === 'probation' ? 'probation' : 'revoked',
      month,
      note: body.note ? String(body.note) : `Added to VIP board (${status}).`,
    },
  })

  await logActivity({
    type: 'vip',
    action: 'created',
    title: `VIP board: @${username} added as ${status}`,
    details:
      status === 'active'
        ? `Granted VIP • ${month} monthly VIP event.`
        : (body.note ? String(body.note) : `Status: ${status}.`),
  })
  return NextResponse.json(vip, { status: 201 })
}
