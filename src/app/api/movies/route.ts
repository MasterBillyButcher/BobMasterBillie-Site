import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'

const STATUSES = ['planned', 'watching', 'watched']

function parseDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export async function GET() {
  const movies = await db.movie.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(movies)
}

export async function POST(req: Request) {
  const body = await req.json()
  const title = String(body.title ?? '').trim()
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }
  const status = STATUSES.includes(body.status) ? body.status : 'planned'
  const plannedDate = parseDate(body.plannedDate)
  const watchedDate = parseDate(body.watchedDate)

  const movie = await db.movie.create({
    data: {
      title,
      status,
      notes: body.notes ? String(body.notes) : null,
      plannedDate: status === 'planned' ? plannedDate : plannedDate ?? null,
      watchedDate: status === 'watched' ? watchedDate : watchedDate ?? null,
    },
  })

  const details =
    status === 'planned' && plannedDate
      ? `Planned for ${plannedDate.toDateString()}.`
      : `Added to the ${status} list.`
  await logActivity({
    type: 'movie',
    action: status === 'planned' && plannedDate ? 'scheduled' : 'created',
    title: `Movie added: ${title}`,
    details,
  })

  // Added straight as watched → auto-track the -1 backlog event
  if (status === 'watched') {
    await db.backlogEvent.create({
      data: {
        type: 'watched',
        delta: -1,
        note: `Watched: ${title}`,
        movieId: movie.id,
        occurredAt: movie.watchedDate ?? new Date(),
      },
    })
    await logActivity({
      type: 'backlog',
      action: 'created',
      title: 'Backlog -1 — movie watched',
      details: `Watched: ${title}`,
    })
  }

  return NextResponse.json(movie, { status: 201 })
}
