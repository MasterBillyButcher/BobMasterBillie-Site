require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // fallback to .env if .env.local isn't present

const path = require('node:path');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { SESSION_COOKIE_NAME, createSessionToken } = require('./lib/session');
const { checkPassword, requireAuthPage, isAuthenticated } = require('./lib/auth');
const { ensureCsrfCookie, verifyCsrf } = require('./lib/csrf');

const app = express();
const PUBLIC_DIR = path.join(__dirname, 'public');
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');

// Security headers. No inline scripts/styles anywhere in /public, so the
// CSP below has no 'unsafe-inline'/'unsafe-eval'.
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
app.get('/login.html', (req, res) => {
  if (isAuthenticated(req)) {
    return res.redirect('/');
  }
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

// ---------------------------------------------------------------------------
// Protected pages — every one is gated server-side by requireAuthPage.
// This is the real security boundary, not just hidden UI.
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

app.post('/api/login', loginLimiter, verifyCsrf, (req, res) => {
  if (!process.env.DASHBOARD_PASSWORD) {
    return res.status(500).json({
      error: 'Server is not configured. Set DASHBOARD_PASSWORD in your environment and redeploy.',
    });
  }

  const { password } = req.body || {};
  if (!checkPassword(password)) {
    // Deliberately generic — never confirm/deny anything more specific.
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  const { token, maxAgeSeconds } = createSessionToken();
  setSessionCookie(res, token, maxAgeSeconds);
  res.json({ ok: true });
});

app.post('/api/logout', verifyCsrf, (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
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
