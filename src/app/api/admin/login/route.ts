import { NextResponse } from 'next/server'

// Admin unlock endpoint.
// POST with { password } -> checks it against the ADMIN_PASSWORD env variable
// and sets the admin_key cookie (30 days). DELETE clears the cookie (lock).

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { password?: string }
  const password = String(body.password ?? '')
  const expected = process.env.ADMIN_PASSWORD

  if (!expected) {
    return NextResponse.json(
      {
        error:
          'ADMIN_PASSWORD is not set on the server. Add it in Vercel -> Settings -> Environment Variables, then redeploy.',
      },
      { status: 500 },
    )
  }

  if (password !== expected) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  // Next.js encodes the cookie value automatically; the middleware reads it
  // back through req.cookies which decodes it, so no manual encoding here.
  res.cookies.set('admin_key', password, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_key', '', { path: '/', maxAge: 0 })
  return res
}
