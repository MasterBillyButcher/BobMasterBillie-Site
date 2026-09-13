'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CookieJar } = require('./helpers');

// SESSION_SECRET, DASHBOARD_PASSWORD, and NODE_ENV=test are set by the
// `npm test` script (see package.json) before this file is loaded.
const app = require('../server');

const TEST_PASSWORD = process.env.DASHBOARD_PASSWORD;

let server;
let baseUrl;

test.before(() => {
  server = app.listen(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(() => {
  server.close();
});

async function primeCsrf(jar) {
  const res = await fetch(`${baseUrl}/login.html`, { redirect: 'manual' });
  jar.absorb(res);
  return jar.get('bmb_csrf');
}

test('logged-out root redirects to /login.html', async () => {
  const res = await fetch(`${baseUrl}/`, { redirect: 'manual' });
  assert.equal(res.status, 302);
  assert.match(res.headers.get('location'), /\/login\.html/);
});

test('logged-out API call is rejected, no redirect', async () => {
  const res = await fetch(`${baseUrl}/api/logout`, { method: 'POST' });
  // No CSRF token sent either, but the important thing either way is
  // that no protected data comes back and it's not a 200.
  assert.notEqual(res.status, 200);
});

test('login rejects requests missing a CSRF token', async () => {
  const res = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: TEST_PASSWORD }),
  });
  assert.equal(res.status, 403);
});

test('login rejects an incorrect password with a generic error', async () => {
  const jar = new CookieJar();
  const csrf = await primeCsrf(jar);

  const res = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ password: 'definitely-wrong' }),
  });
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.error, 'Incorrect password.');
});

test('full flow: login -> access protected page -> logout -> access denied again', async () => {
  const jar = new CookieJar();
  const csrf = await primeCsrf(jar);

  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ password: TEST_PASSWORD }),
  });
  assert.equal(loginRes.status, 200);
  jar.absorb(loginRes);
  assert.ok(jar.get('bmb_session'), 'session cookie should be set after login');

  const dashRes = await fetch(`${baseUrl}/`, { redirect: 'manual', headers: { Cookie: jar.header() } });
  assert.equal(dashRes.status, 200);

  const settingsRes = await fetch(`${baseUrl}/settings.html`, {
    redirect: 'manual',
    headers: { Cookie: jar.header() },
  });
  assert.equal(settingsRes.status, 200);

  const logoutRes = await fetch(`${baseUrl}/api/logout`, {
    method: 'POST',
    headers: { Cookie: jar.header(), 'X-CSRF-Token': csrf },
  });
  assert.equal(logoutRes.status, 200);
  jar.absorb(logoutRes);

  const afterLogoutRes = await fetch(`${baseUrl}/`, { redirect: 'manual', headers: { Cookie: jar.header() } });
  assert.equal(afterLogoutRes.status, 302, 'protected page should be unreachable after logout');
});

test('security headers are present on responses', async () => {
  const res = await fetch(`${baseUrl}/login.html`);
  assert.ok(res.headers.get('content-security-policy'), 'CSP header should be set');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});
