import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'

export async function GET() {
  const vetoes = await db.veto.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(vetoes)
}

export async function POST(req: Request) {
  const body = await req.json()
  const username = String(body.username ?? '').trim()
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }
  const veto = await db.veto.create({
    data: {
      username,
      vetoRights: Math.max(0, Number(body.vetoRights) || 0),
      note: body.note ? String(body.note) : null,
    },
  })
  await logActivity({
    type: 'veto',
    action: 'created',
    title: `Viewer added to veto board: ${username}`,
    details: `${veto.vetoRights} active veto right${veto.vetoRights === 1 ? '' : 's'}`,
  })
  return NextResponse.json(veto, { status: 201 })
}
