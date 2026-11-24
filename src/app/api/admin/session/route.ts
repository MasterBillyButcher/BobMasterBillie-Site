import { NextResponse } from 'next/server'
import { adminToken } from '@/lib/admin-session'

// Tells the UI whether this browser already holds a valid admin session.
// The cookie is httpOnly, so the client asks the server instead of reading
// the cookie itself. No secrets are returned, only true/false.

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const expected = process.env.ADMIN_PASSWORD

  if (!expected) {
    return NextResponse.json({ unlocked: process.env.NODE_ENV === 'development' })
  }

  const header = req.headers.get('cookie') ?? ''
  const match = header.match(/(?:^|;\s*)admin_key=([^;]*)/)
  const provided = match ? decodeURIComponent(match[1]) : ''
  const token = await adminToken(expected)

  return NextResponse.json({ unlocked: provided.length > 0 && provided === token })
}
