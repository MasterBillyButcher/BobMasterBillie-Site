import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Admin password gate.
// Viewing (GET) is open to everyone. Every change (POST / PATCH / PUT / DELETE)
// requires the admin password, sent as the `admin_key` cookie which is set by
// POST /api/admin/login. The password itself lives in the ADMIN_PASSWORD
// environment variable (set it in Vercel -> Settings -> Environment Variables).

export const config = {
  matcher: ['/api/:path*'],
}

export function middleware(req: NextRequest) {
  const method = req.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return NextResponse.next()
  }

  // Login/logout manage the cookie itself and must stay reachable
  if (req.nextUrl.pathname.startsWith('/api/admin')) {
    return NextResponse.next()
  }

  const expected = process.env.ADMIN_PASSWORD

  if (!expected) {
    // Not configured: allow local development, lock production by default
    if (process.env.NODE_ENV === 'development') return NextResponse.next()
    return NextResponse.json(
      {
        error:
          'Admin password is not configured on the server. Add the ADMIN_PASSWORD variable in Vercel settings, then redeploy.',
      },
      { status: 401 },
    )
  }

  // req.cookies already decodes the value (Next.js uses the cookie parser),
  // so compare it directly against ADMIN_PASSWORD.
  const provided = req.cookies.get('admin_key')?.value ?? ''

  if (provided && provided === expected) return NextResponse.next()

  return NextResponse.json(
    { error: 'Locked. Enter the admin password to make changes.' },
    { status: 401 },
  )
}
