import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const body = await req.json()

  const existing = await db.announcement.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.message !== undefined) data.message = String(body.message).trim()
  if (body.active !== undefined) data.active = Boolean(body.active)

  const announcement = await db.announcement.update({ where: { id }, data })
  await logActivity({
    type: 'announcement',
    action: 'updated',
    title: announcement.active ? 'Announcement activated' : 'Announcement archived',
    details: announcement.message,
  })
  return NextResponse.json(announcement)
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const existing = await db.announcement.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })

  await db.announcement.delete({ where: { id } })
  await logActivity({
    type: 'announcement',
    action: 'deleted',
    title: 'Announcement removed',
    details: existing.message,
  })
  return NextResponse.json({ ok: true })
}
