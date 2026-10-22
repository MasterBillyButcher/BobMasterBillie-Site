import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'

type Params = { params: Promise<{ id: string }> }

function sanitizeOptions(input: unknown): string | undefined {
  if (input === undefined) return undefined
  let list: string[] = []
  if (Array.isArray(input)) {
    list = input.map((o) => String(o).trim()).filter(Boolean)
  } else if (typeof input === 'string' && input.trim()) {
    list = input
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean)
  }
  if (list.length < 2) return undefined
  return JSON.stringify(list.slice(0, 10))
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const existing = await db.prediction.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Prediction not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = String(body.title).trim()
  const options = sanitizeOptions(body.options)
  if (options !== undefined) data.options = options
  if (body.announceText !== undefined)
    data.announceText = body.announceText ? String(body.announceText) : null
  if (body.duration !== undefined) data.duration = String(body.duration)
  if (body.category !== undefined && ['hype', 'treasure', 'satta', 'babu', 'custom'].includes(body.category))
    data.category = body.category
  if (body.status !== undefined && ['ready', 'used'].includes(body.status)) {
    data.status = body.status
    if (body.status === 'used') data.usedAt = new Date()
    if (body.status === 'ready') {
      data.usedAt = null
      data.outcome = null
    }
  }
  if (body.outcome !== undefined) data.outcome = body.outcome ? String(body.outcome) : null
  if (body.pinned !== undefined) data.pinned = Boolean(body.pinned)

  const prediction = await db.prediction.update({ where: { id }, data })

  const changes: string[] = []
  if (data.status && data.status !== existing.status) {
    changes.push(data.status === 'used' ? 'marked as used' : 'reset to ready')
    if (data.status === 'used' && prediction.outcome) changes.push(`outcome: ${prediction.outcome}`)
  }
  if (data.title && data.title !== existing.title) changes.push(`renamed to "${data.title}"`)
  if (data.duration && data.duration !== existing.duration) changes.push(`window -> ${data.duration}`)
  if (data.options && data.options !== existing.options) changes.push('options updated')
  if (data.pinned !== undefined && data.pinned !== existing.pinned)
    changes.push(data.pinned ? 'pinned' : 'unpinned')

  if (changes.length) {
    await logActivity({
      type: 'prediction',
      action: 'updated',
      title: `Prediction updated: ${prediction.title}`,
      details: changes.join(', '),
    })
  }
  return NextResponse.json(prediction)
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const existing = await db.prediction.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Prediction not found' }, { status: 404 })

  await db.prediction.delete({ where: { id } })
  await logActivity({
    type: 'prediction',
    action: 'deleted',
    title: `Prediction deleted: ${existing.title}`,
  })
  return NextResponse.json({ ok: true })
}
