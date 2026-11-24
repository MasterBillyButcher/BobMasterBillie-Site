import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'
import { capStr } from '@/lib/validate'

export async function GET() {
  const predictions = await db.prediction.findMany({
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
  })
  return NextResponse.json(predictions)
}

function sanitizeOptions(input: unknown): string {
  let list: string[] = []
  if (Array.isArray(input)) {
    list = input.map((o) => String(o).trim().slice(0, 100)).filter(Boolean)
  } else if (typeof input === 'string' && input.trim()) {
    list = input
      .split('\n')
      .map((o) => o.trim().slice(0, 100))
      .filter(Boolean)
  }
  if (list.length < 2) list = ['Yes', 'No']
  return JSON.stringify(list.slice(0, 10))
}

function makeAnnounce(title: string, category: string): string {
  const prefixes: Record<string, string> = {
    hype: 'HYPE TRAIN - ',
    treasure: 'TREASURE TRAIN - ',
    satta: 'SATTA LIVE - ',
    babu: 'PREDICTION TIME - ',
    custom: 'PREDICTION - ',
  }
  return `/announcepurple ${prefixes[category] ?? prefixes.custom}${title} - Make your predictions now!`
}

export async function POST(req: Request) {
  const body = await req.json()
  const title = capStr(body.title, 150)
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }
  const categories = ['hype', 'treasure', 'satta', 'babu', 'custom']
  const category = categories.includes(body.category) ? body.category : 'custom'
  const options = sanitizeOptions(body.options)

  const prediction = await db.prediction.create({
    data: {
      title,
      options,
      announceText: body.announceText ? capStr(body.announceText, 500) : makeAnnounce(title, category),
      duration: body.duration ? capStr(body.duration, 40) : '5 minutes',
      category,
      pinned: Boolean(body.pinned) ?? false,
    },
  })
  await logActivity({
    type: 'prediction',
    action: 'created',
    title: `Prediction created: ${title}`,
    details: `Options: ${JSON.parse(options).join(' vs ')} • window: ${prediction.duration}`,
  })
  return NextResponse.json(prediction, { status: 201 })
}
