import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'

type Params = { params: Promise<{ id: string }> }

const STATUSES = ['active', 'probation', 'revoked']
const EVENT_FOR_STATUS: Record<string, string> = {
  active: 'returned',
  probation: 'probation',
  revoked: 'revoked',
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const existing = await db.vipMember.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'VIP member not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.username !== undefined) data.username = String(body.username).trim()
  if (body.note !== undefined) data.note = body.note ? String(body.note) : null
  if (body.status !== undefined && STATUSES.includes(body.status)) {
    data.status = body.status
    if (body.status === 'active' && existing.status !== 'active') data.grantedAt = new Date()
  }

  const vip = await db.vipMember.update({ where: { id }, data })

  const changes: string[] = []
  let eventType: string | null = null
  if (data.status && data.status !== existing.status) {
    changes.push(`VIP status ${existing.status} -> ${data.status}`)
    eventType = EVENT_FOR_STATUS[data.status as string]
  }
  if (data.username && data.username !== existing.username)
    changes.push(`renamed to "${data.username}"`)
  if (data.note !== undefined && data.note !== existing.note) changes.push('note updated')

  // Status changes become monthly VIP events automatically
  if (eventType) {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    await db.vipEvent.create({
      data: {
        username: vip.username,
        eventType,
        month,
        note: body.note ? String(body.note) : `Status changed to ${vip.status}.`,
      },
    })
  }

  if (changes.length) {
    await logActivity({
      type: 'vip',
      action: 'updated',
      title: `VIP board updated: @${vip.username}`,
      details: changes.join(', '),
    })
  }
  return NextResponse.json(vip)
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const existing = await db.vipMember.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'VIP member not found' }, { status: 404 })

  await db.vipMember.delete({ where: { id } })
  await logActivity({
    type: 'vip',
    action: 'deleted',
    title: `VIP member removed: @${existing.username}`,
  })
  return NextResponse.json({ ok: true })
}
