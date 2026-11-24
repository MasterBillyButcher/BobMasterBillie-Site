import { NextResponse } from 'next/server'
import { adminToken } from '@/lib/admin-session'

// Admin unlock endpoint.
// POST with { password } -> sets an httpOnly session cookie derived from the
// admin password. The raw password is never stored in the cookie.
// DELETE clears the cookie (lock). Wrong attempts are rate limited per IP:
// 5 misses inside 15 minutes starts a 15 minute cooldown.

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

type Attempt = { count: number; windowStart: number; lockedUntil: number }
const attempts = new Map<string, Attempt>()

function ipOf(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') ?? ''
  return fwd.split(',')[0].trim() || 'local'
}

export async function POST(req: Request) {
  const expected = process.env.ADMIN_PASSWORD

  if (!expected) {
    return NextResponse.json({ error: 'Unlock unavailable' }, { status: 503 })
  }

  const ip = ipOf(req)
  const now = Date.now()
  const rec = attempts.get(ip)

  if (rec && rec.lockedUntil > now) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rec.lockedUntil - now) / 1000)) },
      },
    )
  }

  const body = (await req.json().catch(() => ({}))) as { password?: string }
  const password = typeof body.password === 'string' ? body.password : ''

  if (!password || password.length > 200 || password !== expected) {
    if (rec && now - rec.windowStart < WINDOW_MS) {
      rec.count += 1
    } else {
      attempts.set(ip, { count: 1, windowStart: now, lockedUntil: 0 })
    }
    const current = attempts.get(ip)!
    if (current.count >= MAX_ATTEMPTS) {
      current.lockedUntil = now + WINDOW_MS
      current.count = 0
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(WINDOW_MS / 1000)) },
        },
      )
    }
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  attempts.delete(ip)
  const token = await adminToken(expected)
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_key', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_key', '', { path: '/', maxAge: 0 })
  return res
}
