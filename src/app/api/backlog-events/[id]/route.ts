import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'

type Params = { params: Promise<{ id: string }> }

const TYPES = ['bits_goal', 'watched']

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const existing = await db.backlogEvent.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const data: Record<string, unknown> = {}

  // Changing the event type flips its effect: bits_goal = +1, watched = -1
  let newDelta: number | null = null
  if (body.type !== undefined && TYPES.includes(body.type) && body.type !== existing.type) {
    data.type = body.type
    data.delta = body.type === 'bits_goal' ? 1 : -1
    newDelta = body.type === 'bits_goal' ? 1 : -1
  }
  if (body.note !== undefined) data.note = body.note ? String(body.note).trim() : null
  if (body.occurredAt !== undefined) {
    const d = new Date(String(body.occurredAt))
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }
    data.occurredAt = d
  }

  const event = await db.backlogEvent.update({ where: { id }, data })

  const changes: string[] = []
  if (newDelta !== null) changes.push(`type -> ${data.type} (${newDelta > 0 ? '+1' : '-1'})`)
  if (data.note !== undefined) changes.push('note updated')
  if (data.occurredAt !== undefined)
    changes.push(`date -> ${(data.occurredAt as Date).toDateString()}`)

  await logActivity({
    type: 'backlog',
    action: 'updated',
    title: `Backlog event changed to ${event.delta > 0 ? '+1' : '-1'}`,
    details: changes.join(', ') || 'no changes',
  })
  return NextResponse.json(event)
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const existing = await db.backlogEvent.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  await db.backlogEvent.delete({ where: { id } })
  await logActivity({
    type: 'backlog',
    action: 'deleted',
    title: `Backlog event removed (${existing.delta > 0 ? '+1' : '-1'})`,
    details: existing.note ?? undefined,
  })
  return NextResponse.json({ ok: true })
}
