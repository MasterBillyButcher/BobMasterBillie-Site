import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'

export async function GET() {
  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(announcements)
}

export async function POST(req: Request) {
  const body = await req.json()
  const message = String(body.message ?? '').trim()
  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }
  const announcement = await db.announcement.create({
    data: { message, active: body.active === undefined ? true : Boolean(body.active) },
  })
  await logActivity({
    type: 'announcement',
    action: 'created',
    title: 'Announcement posted',
    details: message,
  })
  return NextResponse.json(announcement, { status: 201 })
}
