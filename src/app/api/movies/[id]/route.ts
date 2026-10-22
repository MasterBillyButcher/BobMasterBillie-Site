import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'

type Params = { params: Promise<{ id: string }> }

const STATUSES = ['planned', 'watching', 'watched']

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params
  const body = await req.json()
  const existing = await db.movie.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Movie not found' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = String(body.title).trim()
  if (body.status !== undefined && STATUSES.includes(body.status)) data.status = body.status
  if (body.notes !== undefined) data.notes = body.notes ? String(body.notes) : null

  const plannedDate = parseDate(body.plannedDate)
  if (plannedDate !== undefined) data.plannedDate = plannedDate
  const watchedDate = parseDate(body.watchedDate)
  if (watchedDate !== undefined) data.watchedDate = watchedDate

  // Keep dates consistent with status
  if (data.status === 'planned' && data.watchedDate === undefined) data.watchedDate = null
  if (data.status === 'watched' && data.watchedDate === undefined && !existing.watchedDate)
    data.watchedDate = new Date()
  if (data.status === 'watched' && data.plannedDate === undefined) data.plannedDate = null

  const movie = await db.movie.update({ where: { id }, data })

  // Backlog ledger auto-sync: watched -> -1 event, un-watched -> remove the linked event
  const statusChanged = data.status && data.status !== existing.status
  if (statusChanged && data.status === 'watched') {
    const alreadyTracked = await db.backlogEvent.findFirst({
      where: { movieId: id, type: 'watched' },
    })
    if (!alreadyTracked) {
      await db.backlogEvent.create({
        data: {
          type: 'watched',
          delta: -1,
          note: `Watched: ${movie.title}`,
          movieId: id,
          occurredAt: movie.watchedDate ?? new Date(),
        },
      })
      await logActivity({
        type: 'backlog',
        action: 'created',
        title: 'Backlog -1 - movie watched',
        details: `Watched: ${movie.title}`,
      })
    }
  }
  if (statusChanged && existing.status === 'watched' && data.status !== 'watched') {
    const removed = await db.backlogEvent.deleteMany({ where: { movieId: id, type: 'watched' } })
    if (removed.count > 0) {
      await logActivity({
        type: 'backlog',
        action: 'deleted',
        title: 'Backlog event reverted (+1)',
        details: `${movie.title} is no longer marked watched.`,
      })
    }
  }

  const changes: string[] = []
  if (data.status && data.status !== existing.status) changes.push(`status -> ${data.status}`)
  if (data.title && data.title !== existing.title) changes.push(`renamed to "${data.title}"`)
  if (data.plannedDate !== undefined && data.plannedDate !== null)
    changes.push(`scheduled for ${(data.plannedDate as Date).toDateString()}`)
  if (data.watchedDate !== undefined && data.watchedDate !== null)
    changes.push(`watched on ${(data.watchedDate as Date).toDateString()}`)
  if (data.notes !== undefined && data.notes !== existing.notes) changes.push('notes updated')

  if (changes.length) {
    await logActivity({
      type: 'movie',
      action: data.plannedDate ? 'scheduled' : 'updated',
      title: `Movie updated: ${movie.title}`,
      details: changes.join(', '),
    })
  }
  return NextResponse.json(movie)
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params
  const existing = await db.movie.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Movie not found' }, { status: 404 })

  await db.movie.delete({ where: { id } })
  // Remove any backlog events linked to this movie
  await db.backlogEvent.deleteMany({ where: { movieId: id } })
  await logActivity({
    type: 'movie',
    action: 'deleted',
    title: `Movie removed: ${existing.title}`,
    details: `Removed from the ${existing.status} list.`,
  })
  return NextResponse.json({ ok: true })
}
