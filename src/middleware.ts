import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adminToken } from '@/lib/admin-session'

// Admin password gate.
// Viewing (GET) is open to everyone. Every change (POST / PATCH / PUT / DELETE)
// requires a valid admin session cookie, which only POST /api/admin/login can
// create. The cookie stores a derived token, never the password itself.

export const config = {
  matcher: ['/api/:path*'],
}

export async function middleware(req: NextRequest) {
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
    return NextResponse.json({ error: 'Locked' }, { status: 401 })
  }

  const provided = req.cookies.get('admin_key')?.value ?? ''
  const token = await adminToken(expected)

  if (provided && provided === token) return NextResponse.next()

  return NextResponse.json({ error: 'Locked' }, { status: 401 })
}
