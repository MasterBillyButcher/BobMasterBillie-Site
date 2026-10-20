import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

// PATCH - pin/unpin or edit a manual log entry
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const body = await req.json()

  const existing = await db.activityLog.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Log not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.pinned !== undefined) data.pinned = Boolean(body.pinned)
  if (body.title !== undefined) data.title = String(body.title).trim()
  if (body.details !== undefined) data.details = body.details ? String(body.details) : null

  const log = await db.activityLog.update({ where: { id }, data })
  return NextResponse.json(log)
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const existing = await db.activityLog.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Log not found' }, { status: 404 })

  await db.activityLog.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
