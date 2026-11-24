// Admin session token shared by the login route, the session probe and the
// middleware. The cookie never stores the raw admin password - it stores an
// HMAC derived from it, so a leaked cookie does not reveal the password.
// Uses Web Crypto so the exact same code runs in middleware (edge runtime)
// and route handlers (node runtime).

const SESSION_SECRET = 'bmb-admin-session-v1'

export async function adminToken(password: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`token:${password}`))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
