import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'

export async function GET() {
  const commands = await db.command.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(commands)
}

export async function POST(req: Request) {
  const body = await req.json()
  const cmd = String(body.cmd ?? '').trim()
  const description = String(body.description ?? '').trim()
  const group = String(body.group ?? '').trim() || 'Custom Commands'

  if (!cmd) {
    return NextResponse.json({ error: 'Command text is required' }, { status: 400 })
  }

  // place the new command after the current last one in its group
  const last = await db.command.findFirst({
    where: { group },
    orderBy: { sortOrder: 'desc' },
  })

  const command = await db.command.create({
    data: { cmd, description, group, sortOrder: (last?.sortOrder ?? 0) + 1 },
  })
  await logActivity({
    type: 'custom',
    action: 'created',
    title: 'Command added',
    details: `${cmd} - ${description}`,
  })
  return NextResponse.json(command, { status: 201 })
}
