import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'

const EVENT_TYPES = ['granted', 'revoked', 'probation', 'returned']

export async function GET() {
  const events = await db.vipEvent.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(events)
}

// POST - record a VIP event (e.g. from the Monthly VIP Event dialog)
export async function POST(req: Request) {
  const body = await req.json()
  const username = String(body.username ?? '').trim()
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }
  const eventType = EVENT_TYPES.includes(body.eventType) ? body.eventType : 'granted'
  const now = new Date()
  const month =
    typeof body.month === 'string' && /^\d{4}-\d{2}$/.test(body.month)
      ? body.month
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const event = await db.vipEvent.create({
    data: {
      username,
      eventType,
      month,
      note: body.note ? String(body.note) : null,
    },
  })

  // Keep the VIP member record in sync
  const member = await db.vipMember.findFirst({ where: { username } })
  const statusForEvent: Record<string, string> = {
    granted: 'active',
    returned: 'active',
    probation: 'probation',
    revoked: 'revoked',
  }
  const newStatus = statusForEvent[eventType]
  if (member) {
    await db.vipMember.update({
      where: { id: member.id },
      data: {
        status: newStatus,
        grantedAt: newStatus === 'active' ? now : member.grantedAt,
        note: body.note ? String(body.note) : member.note,
      },
    })
  } else {
    await db.vipMember.create({
      data: {
        username,
        status: newStatus,
        grantedAt: newStatus === 'active' ? now : null,
        note: body.note ? String(body.note) : null,
      },
    })
  }

  const eventText: Record<string, string> = {
    granted: 'granted VIP',
    returned: 'earned VIP back',
    probation: 'moved to probation (one chance)',
    revoked: 'VIP revoked',
  }
  await logActivity({
    type: 'vip',
    action: 'updated',
    title: `Monthly VIP Event (${month}): @${username} ${eventText[eventType]}`,
    details: body.note ? String(body.note) : undefined,
  })
  return NextResponse.json(event, { status: 201 })
}
