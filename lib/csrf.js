const crypto = require('node:crypto');

/**
 * Double-submit cookie CSRF protection.
 *
 * SameSite=Lax on the session cookie already blocks cross-site POSTs in
 * modern browsers, but this adds defense in depth (and covers older
 * browsers / SameSite misconfig) without needing server-side session
 * storage:
 *
 * 1. ensureCsrfCookie sets a random token in a *readable* (non-HttpOnly)
 *    cookie if one isn't already present.
 * 2. Client JS reads that cookie and sends it back as the `X-CSRF-Token`
 *    header on every state-changing request.
 * 3. verifyCsrf checks the header matches the cookie. An attacker's page
 *    can trigger a cross-site request that carries the cookie
 *    automatically, but it cannot read the cookie's value (same-origin
 *    policy) to also set the matching header.
 */

const CSRF_COOKIE_NAME = 'bmb_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function ensureCsrfCookie(req, res, next) {
  if (!req.cookies || !req.cookies[CSRF_COOKIE_NAME]) {
    const token = generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // must be readable by client JS to echo back
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // No maxAge: session cookie, refreshed if the browser drops it.
    });
    req.csrfToken = token;
  } else {
    req.csrfToken = req.cookies[CSRF_COOKIE_NAME];
  }
  next();
}

function verifyCsrf(req, res, next) {
  const cookieToken = req.cookies ? req.cookies[CSRF_COOKIE_NAME] : undefined;
  const headerToken = req.headers[CSRF_HEADER_NAME];

  if (
    typeof cookieToken !== 'string' ||
    typeof headerToken !== 'string' ||
    cookieToken.length === 0 ||
    cookieToken !== headerToken
  ) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token.' });
  }
  next();
}

module.exports = { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, ensureCsrfCookie, verifyCsrf };
