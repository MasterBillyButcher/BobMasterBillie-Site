const jwt = require('jsonwebtoken');

/**
 * Session tokens are short, signed JWTs stored in an HttpOnly cookie.
 * They contain nothing but a boolean auth flag and an expiry — no
 * password, nothing sensitive. The password itself lives only in the
 * DASHBOARD_PASSWORD environment variable, checked at login time in
 * lib/auth.js.
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

function createSessionToken() {
  const maxAgeSeconds = getSessionDurationSeconds();
  const token = jwt.sign({ authenticated: true }, getSecret(), {
    algorithm: 'HS256',
    expiresIn: maxAgeSeconds,
  });
  return { token, maxAgeSeconds };
}

/** Verifies signature + expiry. That's the entire check. */
function verifySessionToken(token) {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, getSecret());
    return payload.authenticated === true;
  } catch {
    return false;
  }
}

module.exports = { SESSION_COOKIE_NAME, createSessionToken, verifySessionToken };
