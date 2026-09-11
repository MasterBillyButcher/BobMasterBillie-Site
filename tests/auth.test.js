'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CookieJar } = require('./helpers');

// AUTH_TEST_MODE=1, SESSION_SECRET, and NODE_ENV=test are set by the
// `npm test` script (see package.json) before this file is loaded, so
// requiring server.js here pulls in the in-memory auth store instead of
// hitting real Supabase.
const app = require('../server');

const TEST_PASSWORD = process.env.AUTH_TEST_INITIAL_PASSWORD || 'test-password-123456';

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

/** Fetches once to pick up the CSRF cookie the server sets on every response. */
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

test('logged-out API call is rejected with 401, not a redirect', async () => {
  const res = await fetch(`${baseUrl}/api/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword: 'x', newPassword: 'y', confirmPassword: 'y' }),
  });
  assert.equal(res.status, 401);
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
    headers: {
      'Content-Type': 'application/json',
      Cookie: jar.header(),
      'X-CSRF-Token': csrf,
    },
    body: JSON.stringify({ password: 'definitely-wrong' }),
  });
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.error, 'Incorrect password.');
});

test('full flow: login -> access protected page -> change password -> old session dies -> new session lives -> logout', async () => {
  const jar = new CookieJar();
  const csrf = await primeCsrf(jar);

  // Correct password logs in.
  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jar.header(),
      'X-CSRF-Token': csrf,
    },
    body: JSON.stringify({ password: TEST_PASSWORD }),
  });
  assert.equal(loginRes.status, 200);
  jar.absorb(loginRes);
  assert.ok(jar.get('bmb_session'), 'session cookie should be set after login');

  // Protected page is now reachable.
  const dashRes = await fetch(`${baseUrl}/`, {
    redirect: 'manual',
    headers: { Cookie: jar.header() },
  });
  assert.equal(dashRes.status, 200);

  // Keep a copy of the pre-change session cookie to prove it dies later.
  const oldSessionCookie = jar.get('bmb_session');

  // Change the password.
  const changeRes = await fetch(`${baseUrl}/api/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: jar.header(),
      'X-CSRF-Token': csrf,
    },
    body: JSON.stringify({
      currentPassword: TEST_PASSWORD,
      newPassword: 'brand-new-password-987',
      confirmPassword: 'brand-new-password-987',
    }),
  });
  assert.equal(changeRes.status, 200);
  jar.absorb(changeRes);
  const newSessionCookie = jar.get('bmb_session');
  assert.notEqual(newSessionCookie, oldSessionCookie, 'a fresh session should be issued');

  // The OLD session cookie must now be rejected (version mismatch).
  const oldSessionRes = await fetch(`${baseUrl}/`, {
    redirect: 'manual',
    headers: { Cookie: `bmb_session=${oldSessionCookie}` },
  });
  assert.equal(oldSessionRes.status, 302, 'old session should be logged out after password change');

  // The NEW session cookie still works.
  const newSessionRes = await fetch(`${baseUrl}/`, {
    redirect: 'manual',
    headers: { Cookie: `bmb_session=${newSessionCookie}` },
  });
  assert.equal(newSessionRes.status, 200);

  // Log out with the new (current) session.
  const logoutRes = await fetch(`${baseUrl}/api/logout`, {
    method: 'POST',
    headers: { Cookie: jar.header(), 'X-CSRF-Token': csrf },
  });
  assert.equal(logoutRes.status, 200);
  jar.absorb(logoutRes);

  const afterLogoutRes = await fetch(`${baseUrl}/`, {
    redirect: 'manual',
    headers: { Cookie: jar.header() },
  });
  assert.equal(afterLogoutRes.status, 302, 'protected page should be unreachable after logout');

  // Restore the password so other tests in this file keep working if
  // run more than once against the same in-memory store (they aren't,
  // but this keeps the suite order-independent).
  const csrf2 = jar.get('bmb_csrf');
  await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf2 },
    body: JSON.stringify({ password: 'brand-new-password-987' }),
  });
});

test('change-password validation: mismatched confirmation is rejected', async () => {
  const jar = new CookieJar();
  const csrf = await primeCsrf(jar);
  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ password: 'brand-new-password-987' }),
  });
  jar.absorb(loginRes);

  const res = await fetch(`${baseUrl}/api/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({
      currentPassword: 'brand-new-password-987',
      newPassword: 'aaaaaaaaaa',
      confirmPassword: 'bbbbbbbbbb',
    }),
  });
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.match(body.error, /do not match/);
});

test('security headers are present on responses', async () => {
  const res = await fetch(`${baseUrl}/login.html`);
  assert.ok(res.headers.get('content-security-policy'), 'CSP header should be set');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});
