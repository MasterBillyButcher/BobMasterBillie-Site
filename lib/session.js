const jwt = require('jsonwebtoken');

/**
 * Session tokens are short, signed JWTs stored in an HttpOnly cookie.
 * They never contain the password or its hash — only a boolean auth
 * flag and a "version" number that lets us invalidate every existing
 * session at once (used after a password change) without needing a
 * server-side session store.
 */

const SESSION_COOKIE_NAME = 'bmb_session';

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET is missing or too short. Set a random string of at least 32 characters.'
    );
  }
  return secret;
}

function getSessionDurationSeconds() {
  const hours = Number(process.env.SESSION_DURATION_HOURS || '12');
  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 12;
  return Math.floor(safeHours * 60 * 60);
}

function createSessionToken(version) {
  const maxAgeSeconds = getSessionDurationSeconds();
  const token = jwt.sign({ authenticated: true, v: version }, getSecret(), {
    algorithm: 'HS256',
    expiresIn: maxAgeSeconds,
  });
  return { token, maxAgeSeconds };
}

/**
 * Verifies signature + expiry only. Does NOT check the version against
 * the database — that happens in requireAuth*() for every real data
 * access. Safe and cheap to call for every request.
 */
function verifySessionToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getSecret());
    if (payload.authenticated !== true || typeof payload.v !== 'number') {
      return null;
    }
    return { authenticated: true, v: payload.v };
  } catch {
    return null;
  }
}

module.exports = { SESSION_COOKIE_NAME, createSessionToken, verifySessionToken };
