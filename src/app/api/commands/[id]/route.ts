import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const body = await req.json()

  const existing = await db.command.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Command not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.cmd !== undefined) data.cmd = String(body.cmd).trim()
  if (body.description !== undefined) data.description = String(body.description).trim()

  // moving to another group puts it at the end of that group
  if (body.group !== undefined) {
    const group = String(body.group).trim() || 'Custom Commands'
    if (group !== existing.group) {
      const last = await db.command.findFirst({
        where: { group },
        orderBy: { sortOrder: 'desc' },
      })
      data.group = group
      data.sortOrder = (last?.sortOrder ?? 0) + 1
    }
  }

  const command = await db.command.update({ where: { id }, data })
  await logActivity({
    type: 'custom',
    action: 'updated',
    title: 'Command updated',
    details: `${command.cmd} - ${command.description}`,
  })
  return NextResponse.json(command)
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const existing = await db.command.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Command not found' }, { status: 404 })

  await db.command.delete({ where: { id } })
  await logActivity({
    type: 'custom',
    action: 'deleted',
    title: 'Command removed',
    details: `${existing.cmd} - ${existing.description}`,
  })
  return NextResponse.json({ ok: true })
}
