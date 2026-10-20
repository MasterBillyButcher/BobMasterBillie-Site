import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const existing = await db.vipEvent.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'VIP event not found' }, { status: 404 })

  await db.vipEvent.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
