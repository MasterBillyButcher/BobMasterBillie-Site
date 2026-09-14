require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // fallback to .env if .env.local isn't present

const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { SESSION_COOKIE_NAME, createSessionToken } = require('./lib/session');
const {
  hashPassword,
  verifyPassword,
  requireAuthPage,
  requireAuthApi,
  isAuthenticated,
} = require('./lib/auth');
const {
  getDashboardAuthRow,
  updateDashboardPassword,
  upsertDashboardPassword,
  getDoc,
  saveDoc,
  listDocs,
} = require('./lib/supabase-admin');
const { ensureCsrfCookie, verifyCsrf } = require('./lib/csrf');

function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA); // keep timing constant either way
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

const app = express();
const PUBLIC_DIR = path.join(__dirname, 'public');
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');

// Strict security headers. No inline scripts/styles anywhere in /public,
// so the CSP below has no 'unsafe-inline'/'unsafe-eval'.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        ...(isProd ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    hsts: isProd ? { maxAge: 15552000, includeSubDomains: true } : false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(ensureCsrfCookie);

function setSessionCookie(res, token, maxAgeSeconds) {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
}

// ---------------------------------------------------------------------------
// Static assets
// ---------------------------------------------------------------------------
app.use('/css', express.static(path.join(PUBLIC_DIR, 'css')));
app.use('/js', express.static(path.join(PUBLIC_DIR, 'js')));

// ---------------------------------------------------------------------------
// Public pages
// ---------------------------------------------------------------------------
app.get('/login.html', async (req, res) => {
  if (await isAuthenticated(req)) {
    return res.redirect('/');
  }
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

// One-time / anytime-reset setup page. Public (no session required), but
// the API behind it requires SETUP_SECRET. See /api/setup.
app.get('/setup.html', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'setup.html'));
});

// ---------------------------------------------------------------------------
// Protected pages — every one is gated server-side by requireAuthPage,
// which re-verifies against the database on every request. This is the
// real security boundary, not just hidden UI.
// ---------------------------------------------------------------------------
const PROTECTED_PAGES = {
  '/': 'dashboard.html',
  '/dashboard.html': 'dashboard.html',
  '/twitch.html': 'twitch.html',
  '/nightbot.html': 'nightbot.html',
  '/commands.html': 'commands.html',
  '/predictions.html': 'predictions.html',
  '/channels.html': 'channels.html',
  '/notes.html': 'notes.html',
  '/backlog.html': 'backlog.html',
  '/veto.html': 'veto.html',
  '/links.html': 'links.html',
  '/cv.html': 'cv.html',
  '/settings.html': 'settings.html',
};

for (const [route, file] of Object.entries(PROTECTED_PAGES)) {
  app.get(route, requireAuthPage, (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, file));
  });
}

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again later.' },
});

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again later.' },
});

const setupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again later.' },
});

app.post('/api/login', loginLimiter, verifyCsrf, async (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  let row;
  try {
    row = await getDashboardAuthRow();
  } catch {
    return res
      .status(500)
      .json({ error: 'Server is not configured. Visit /setup.html once to set your password.' });
  }

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  const { token, maxAgeSeconds } = createSessionToken(row.password_version);
  setSessionCookie(res, token, maxAgeSeconds);
  res.json({ ok: true });
});

app.post('/api/logout', verifyCsrf, (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

const MIN_PASSWORD_LENGTH = 10;

app.post(
  '/api/change-password',
  changePasswordLimiter,
  requireAuthApi,
  verifyCsrf,
  async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (
      typeof currentPassword !== 'string' ||
      typeof newPassword !== 'string' ||
      typeof confirmPassword !== 'string'
    ) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match.' });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    if (newPassword === currentPassword) {
      return res
        .status(400)
        .json({ error: 'New password must be different from the current password.' });
    }

    const row = await getDashboardAuthRow();
    const currentValid = await verifyPassword(currentPassword, row.password_hash);
    if (!currentValid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const newHash = await hashPassword(newPassword);
    const newVersion = await updateDashboardPassword(newHash);

    // Re-issue a session for this browser under the new version so the
    // user isn't logged out by their own change. Every other existing
    // session is now invalid.
    const { token, maxAgeSeconds } = createSessionToken(newVersion);
    setSessionCookie(res, token, maxAgeSeconds);
    res.json({ ok: true });
  }
);

const MIN_SETUP_PASSWORD_LENGTH = 10;

/**
 * One-time (or reset-anytime) setup endpoint — the only route that can
 * write a password without already knowing the current one. Gated
 * entirely by SETUP_SECRET, a separate env var from the password itself.
 */
app.post('/api/setup', setupLimiter, verifyCsrf, async (req, res) => {
  const expectedSecret = process.env.SETUP_SECRET;
  if (!expectedSecret || expectedSecret.length < 16) {
    return res
      .status(500)
      .json({ error: 'SETUP_SECRET is not configured on the server (or is too short).' });
  }

  const { setupSecret, newPassword, confirmPassword } = req.body || {};

  if (
    typeof setupSecret !== 'string' ||
    typeof newPassword !== 'string' ||
    typeof confirmPassword !== 'string'
  ) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (!timingSafeStringEqual(setupSecret, expectedSecret)) {
    return res.status(403).json({ error: 'Invalid setup secret.' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  if (newPassword.length < MIN_SETUP_PASSWORD_LENGTH) {
    return res
      .status(400)
      .json({ error: `Password must be at least ${MIN_SETUP_PASSWORD_LENGTH} characters.` });
  }

  try {
    const newHash = await hashPassword(newPassword);
    await upsertDashboardPassword(newHash);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to set password.' });
  }

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Docs API — one free-text document per section (Twitch, Nightbot,
// Commands, Predictions, Channels, Notes, Backlog, Veto, Links, CV).
// Every route requires an authenticated session; saving also requires CSRF.
// ---------------------------------------------------------------------------
const VALID_SECTIONS = new Set([
  'twitch',
  'nightbot',
  'commands',
  'predictions',
  'channels',
  'notes',
  'backlog',
  'veto',
  'links',
  'cv',
]);
const MAX_DOC_LENGTH = 200000; // generous — this is meant to replace a Word doc

app.get('/api/docs', requireAuthApi, async (req, res) => {
  try {
    const docs = await listDocs([...VALID_SECTIONS]);
    res.json({ docs });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load documents.' });
  }
});

app.get('/api/docs/:section', requireAuthApi, async (req, res) => {
  const { section } = req.params;
  if (!VALID_SECTIONS.has(section)) {
    return res.status(400).json({ error: 'Unknown section.' });
  }

  try {
    const doc = await getDoc(section);
    res.json({ doc });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load document.' });
  }
});

app.put('/api/docs/:section', requireAuthApi, verifyCsrf, async (req, res) => {
  const { section } = req.params;
  if (!VALID_SECTIONS.has(section)) {
    return res.status(400).json({ error: 'Unknown section.' });
  }

  const { content } = req.body || {};
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Content must be text.' });
  }
  if (content.length > MAX_DOC_LENGTH) {
    return res.status(400).json({ error: `Document is too long (max ${MAX_DOC_LENGTH} characters).` });
  }

  try {
    const doc = await saveDoc(section, content);
    res.json({ doc });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to save document.' });
  }
});

// 404 fallback
app.use((req, res) => {
  res.status(404).send('Not found');
});

// ---------------------------------------------------------------------------
// Local dev entry point. On Vercel this file is imported as a serverless
// function (see vercel.json) and app.listen() is never called.
// ---------------------------------------------------------------------------
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Dashboard running at http://localhost:${port}`);
  });
}

module.exports = app;
