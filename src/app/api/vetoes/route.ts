import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'
import { capStr, capOpt, capNum } from '@/lib/validate'

export async function GET() {
  const vetoes = await db.veto.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(vetoes)
}

export async function POST(req: Request) {
  const body = await req.json()
  const username = capStr(body.username, 50)
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 })
  }
  const veto = await db.veto.create({
    data: {
      username,
      vetoRights: capNum(body.vetoRights, 999),
      note: capOpt(body.note, 300),
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
