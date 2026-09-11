require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // fallback to .env if .env.local isn't present

const path = require('node:path');
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
const { getDashboardAuthRow, updateDashboardPassword } = require('./lib/supabase-admin');
const { ensureCsrfCookie, verifyCsrf } = require('./lib/csrf');

const app = express();
const PUBLIC_DIR = path.join(__dirname, 'public');
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');

// Strict security headers. No inline scripts/styles are used anywhere in
// /public, so the CSP below has no 'unsafe-inline'/'unsafe-eval'.
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
    // HSTS only makes sense once you're actually served over HTTPS.
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
// Static assets (CSS/JS/images) — no auth needed for these files themselves.
// The actual protected content lives in the HTML routes below, not here.
// ---------------------------------------------------------------------------
app.use('/css', express.static(path.join(PUBLIC_DIR, 'css')));
app.use('/js', express.static(path.join(PUBLIC_DIR, 'js')));

// ---------------------------------------------------------------------------
// Public pages
// ---------------------------------------------------------------------------
app.get('/login.html', async (req, res) => {
  // If already logged in, skip straight to the dashboard.
  if (await isAuthenticated(req)) {
    return res.redirect('/');
  }
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

// ---------------------------------------------------------------------------
// Protected pages — every one of these is gated server-side by
// requireAuthPage, which re-verifies against the database on every
// request. This is the real security boundary, not just hidden UI.
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

app.post('/api/login', loginLimiter, verifyCsrf, async (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Password is required.' });
  }

  let row;
  try {
    row = await getDashboardAuthRow();
  } catch {
    return res.status(500).json({ error: 'Server is not configured. Run the password seed script.' });
  }

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) {
    // Deliberately generic — never confirm/deny anything more specific.
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

  // Re-issue a session for this browser under the new version so the user
  // isn't logged out by their own change. Every other existing session is
  // now invalid because its embedded version no longer matches the DB.
  const { token, maxAgeSeconds } = createSessionToken(newVersion);
  setSessionCookie(res, token, maxAgeSeconds);
  res.json({ ok: true });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).send('Not found');
});

// ---------------------------------------------------------------------------
// Local dev entry point. On Vercel, this file is imported as a serverless
// function (see vercel.json) and app.listen() is never called.
// ---------------------------------------------------------------------------
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Dashboard running at http://localhost:${port}`);
  });
}

module.exports = app;
