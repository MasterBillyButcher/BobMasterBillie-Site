import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logActivity } from '@/lib/activity'

const TYPES = ['bits_goal', 'watched']

export async function GET() {
  const events = await db.backlogEvent.findMany({
    orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(events)
}

export async function POST(req: Request) {
  const body = await req.json()
  const type = TYPES.includes(body.type) ? body.type : 'bits_goal'
  const note = body.note ? String(body.note).trim() : null
  const occurredAt = body.occurredAt ? new Date(String(body.occurredAt)) : new Date()
  if (Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  // +1 bits goal can optionally also add the earned movie straight to the planned list
  let movieId: string | null = null
  const movieTitle = body.movieTitle ? String(body.movieTitle).trim() : ''
  if (type === 'bits_goal' && movieTitle) {
    const movie = await db.movie.create({
      data: { title: movieTitle, status: 'planned', notes: 'Earned via bits goal (+1 backlog)' },
    })
    movieId = movie.id
    await logActivity({
      type: 'movie',
      action: 'created',
      title: `Movie added: ${movieTitle}`,
      details: 'Earned via a completed bits goal (+1 backlog).',
    })
  }

  const event = await db.backlogEvent.create({
    data: {
      type,
      delta: type === 'bits_goal' ? 1 : -1,
      note: note ?? (movieTitle ? `Bits goal — ${movieTitle} earned` : null),
      movieId,
      occurredAt,
    },
  })

  await logActivity({
    type: 'backlog',
    action: 'created',
    title:
      type === 'bits_goal'
        ? 'Backlog +1 — bits goal completed'
        : 'Backlog -1 — movie watched',
    details:
      [note, movieTitle ? `Movie added to planned list: ${movieTitle}` : null]
        .filter(Boolean)
        .join(' · ') || undefined,
  })

  return NextResponse.json(event, { status: 201 })
}
