const bcrypt = require('bcryptjs');
const { SESSION_COOKIE_NAME, verifySessionToken } = require('./session');
const { getDashboardAuthRow } = require('./supabase-admin');

const BCRYPT_ROUNDS = 12;

function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

/**
 * The single source of truth for "is this request authenticated".
 * - Verifies the session cookie's signature and expiry.
 * - Re-checks the session's version against the CURRENT version stored in
 *   the database, so a password change immediately invalidates every
 *   other open session (including one on a stolen device), not just the
 *   one that made the change.
 */
async function isAuthenticated(req) {
  const token = req.cookies ? req.cookies[SESSION_COOKIE_NAME] : undefined;
  const session = verifySessionToken(token);
  if (!session) return false;

  try {
    const row = await getDashboardAuthRow();
    if (row.password_version !== session.v) return false;
  } catch {
    // Fail closed if we can't reach the database.
    return false;
  }

  return true;
}

/**
 * Express middleware for HTML page routes. Redirects unauthenticated
 * requests to /login.html?next=<original path>. This is the real
 * enforcement — it runs on every request, on the server, regardless of
 * what the client-side JS does or doesn't do.
 */
function requireAuthPage(req, res, next) {
  isAuthenticated(req).then((ok) => {
    if (!ok) {
      const nextParam = encodeURIComponent(req.originalUrl || '/');
      return res.redirect(`/login.html?next=${nextParam}`);
    }
    next();
  });
}

/** Express middleware for JSON API routes. Returns 401 instead of redirecting. */
function requireAuthApi(req, res, next) {
  isAuthenticated(req).then((ok) => {
    if (!ok) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });
}

module.exports = {
  hashPassword,
  verifyPassword,
  isAuthenticated,
  requireAuthPage,
  requireAuthApi,
};
