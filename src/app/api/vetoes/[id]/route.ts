import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const existing = await db.veto.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Viewer not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.username !== undefined) data.username = String(body.username).trim()
  if (body.vetoRights !== undefined) data.vetoRights = Math.max(0, Number(body.vetoRights) || 0)
  if (body.note !== undefined) data.note = body.note ? String(body.note) : null

  const veto = await db.veto.update({ where: { id }, data })

  const changes: string[] = []
  if (data.vetoRights !== undefined && data.vetoRights !== existing.vetoRights)
    changes.push(`veto rights ${existing.vetoRights} -> ${data.vetoRights}`)
  if (data.username && data.username !== existing.username)
    changes.push(`renamed to "${data.username}"`)
  if (data.note !== undefined && data.note !== existing.note) changes.push('note updated')

  if (changes.length) {
    await logActivity({
      type: 'veto',
      action: 'updated',
      title: `Veto board updated: ${veto.username}`,
      details: changes.join(', '),
    })
  }
  return NextResponse.json(veto)
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const existing = await db.veto.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Viewer not found' }, { status: 404 })

  await db.veto.delete({ where: { id } })
  await logActivity({
    type: 'veto',
    action: 'deleted',
    title: `Viewer removed from veto board: ${existing.username}`,
  })
  return NextResponse.json({ ok: true })
}
