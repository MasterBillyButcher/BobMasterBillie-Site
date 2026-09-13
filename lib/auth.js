const crypto = require('node:crypto');
const { SESSION_COOKIE_NAME, verifySessionToken } = require('./session');

/**
 * The entire password model: one value, DASHBOARD_PASSWORD, set as an
 * environment variable. No database, no hash, no separate secrets.
 * It's compared with a constant-time check so response timing can't
 * leak how much of the guess was correct.
 */
function checkPassword(candidate) {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return false;
  if (typeof candidate !== 'string' || candidate.length === 0) return false;

  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    // Still do a same-cost comparison so length differences don't leak via timing.
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function isAuthenticated(req) {
  const token = req.cookies ? req.cookies[SESSION_COOKIE_NAME] : undefined;
  return verifySessionToken(token);
}

/** Express middleware for HTML pages: redirects to /login.html if not authenticated. */
function requireAuthPage(req, res, next) {
  if (!isAuthenticated(req)) {
    const nextParam = encodeURIComponent(req.originalUrl || '/');
    return res.redirect(`/login.html?next=${nextParam}`);
  }
  next();
}

/** Express middleware for JSON API routes: 401 instead of redirecting. */
function requireAuthApi(req, res, next) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = { checkPassword, isAuthenticated, requireAuthPage, requireAuthApi };
