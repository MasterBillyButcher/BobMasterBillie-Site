'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CookieJar } = require('./helpers');

// AUTH_TEST_MODE=1, SESSION_SECRET, SETUP_SECRET, and NODE_ENV=test are
// set by the `npm test` script (see package.json) before this file is
// loaded, so requiring server.js pulls in the in-memory auth store
// instead of hitting real Supabase.
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
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ password: 'definitely-wrong' }),
  });
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.error, 'Incorrect password.');
});

test('full flow: login -> protected page -> change password -> old session dies -> new session lives -> logout', async () => {
  const jar = new CookieJar();
  const csrf = await primeCsrf(jar);

  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ password: TEST_PASSWORD }),
  });
  assert.equal(loginRes.status, 200);
  jar.absorb(loginRes);
  assert.ok(jar.get('bmb_session'));

  const dashRes = await fetch(`${baseUrl}/`, { redirect: 'manual', headers: { Cookie: jar.header() } });
  assert.equal(dashRes.status, 200);

  const oldSessionCookie = jar.get('bmb_session');

  const changeRes = await fetch(`${baseUrl}/api/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({
      currentPassword: TEST_PASSWORD,
      newPassword: 'brand-new-password-987',
      confirmPassword: 'brand-new-password-987',
    }),
  });
  assert.equal(changeRes.status, 200);
  jar.absorb(changeRes);
  const newSessionCookie = jar.get('bmb_session');
  assert.notEqual(newSessionCookie, oldSessionCookie);

  const oldSessionRes = await fetch(`${baseUrl}/`, {
    redirect: 'manual',
    headers: { Cookie: `bmb_session=${oldSessionCookie}` },
  });
  assert.equal(oldSessionRes.status, 302, 'old session should be logged out after password change');

  const newSessionRes = await fetch(`${baseUrl}/`, {
    redirect: 'manual',
    headers: { Cookie: `bmb_session=${newSessionCookie}` },
  });
  assert.equal(newSessionRes.status, 200);

  const logoutRes = await fetch(`${baseUrl}/api/logout`, {
    method: 'POST',
    headers: { Cookie: jar.header(), 'X-CSRF-Token': csrf },
  });
  assert.equal(logoutRes.status, 200);
  jar.absorb(logoutRes);

  const afterLogoutRes = await fetch(`${baseUrl}/`, { redirect: 'manual', headers: { Cookie: jar.header() } });
  assert.equal(afterLogoutRes.status, 302);

  // Restore the password for order-independence with later tests.
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
  assert.ok(res.headers.get('content-security-policy'));
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});

test('/setup.html is reachable without a session', async () => {
  const res = await fetch(`${baseUrl}/setup.html`, { redirect: 'manual' });
  assert.equal(res.status, 200);
});

test('/api/setup rejects a wrong setup secret', async () => {
  const jar = new CookieJar();
  const csrf = await primeCsrf(jar);
  const res = await fetch(`${baseUrl}/api/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({
      setupSecret: 'wrong-secret',
      newPassword: 'whatever-12345',
      confirmPassword: 'whatever-12345',
    }),
  });
  assert.equal(res.status, 403);
});

test('/api/setup with the correct secret sets a working password, even with no prior login', async () => {
  const setupSecret = process.env.SETUP_SECRET;
  const jar = new CookieJar();
  const csrf = await primeCsrf(jar);

  const setupRes = await fetch(`${baseUrl}/api/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({
      setupSecret,
      newPassword: 'freshly-set-password-42',
      confirmPassword: 'freshly-set-password-42',
    }),
  });
  assert.equal(setupRes.status, 200);

  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ password: 'freshly-set-password-42' }),
  });
  assert.equal(loginRes.status, 200);

  // Restore for order-independence.
  jar.absorb(loginRes);
  const csrf2 = jar.get('bmb_csrf');
  await fetch(`${baseUrl}/api/setup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf2 },
    body: JSON.stringify({
      setupSecret,
      newPassword: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
    }),
  });
});

test('/api/items rejects an unknown section', async () => {
  const jar = new CookieJar();
  const csrf = await primeCsrf(jar);
  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ password: TEST_PASSWORD }),
  });
  jar.absorb(loginRes);

  const res = await fetch(`${baseUrl}/api/items?section=not-a-real-section`, {
    headers: { Cookie: jar.header() },
  });
  assert.equal(res.status, 400);
});

test('/api/items requires auth for read and write', async () => {
  const getRes = await fetch(`${baseUrl}/api/items?section=backlog`);
  assert.equal(getRes.status, 401);

  const postRes = await fetch(`${baseUrl}/api/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section: 'backlog', title: 'x' }),
  });
  assert.equal(postRes.status, 401);
});

test('/api/items: full create -> list -> update -> delete cycle', async () => {
  const jar = new CookieJar();
  const csrf = await primeCsrf(jar);
  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ password: TEST_PASSWORD }),
  });
  jar.absorb(loginRes);

  // Create requires a title.
  const badCreate = await fetch(`${baseUrl}/api/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ section: 'backlog', title: '  ' }),
  });
  assert.equal(badCreate.status, 400);

  // Create a real item.
  const createRes = await fetch(`${baseUrl}/api/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ section: 'backlog', title: 'Play Hollow Knight', body: 'Blind playthrough' }),
  });
  assert.equal(createRes.status, 201);
  const { item } = await createRes.json();
  assert.equal(item.title, 'Play Hollow Knight');
  assert.equal(item.section, 'backlog');

  // It shows up in the list.
  const listRes = await fetch(`${baseUrl}/api/items?section=backlog`, {
    headers: { Cookie: jar.header() },
  });
  const { items } = await listRes.json();
  assert.ok(items.some((i) => i.id === item.id));

  // Update it.
  const updateRes = await fetch(`${baseUrl}/api/items/${item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ title: 'Play Hollow Knight (100%)' }),
  });
  assert.equal(updateRes.status, 200);
  const { item: updated } = await updateRes.json();
  assert.equal(updated.title, 'Play Hollow Knight (100%)');

  // A bad URL is rejected.
  const badUrlRes = await fetch(`${baseUrl}/api/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ section: 'links', title: 'Bad link', url: 'not-a-url' }),
  });
  assert.equal(badUrlRes.status, 400);

  // Delete it.
  const deleteRes = await fetch(`${baseUrl}/api/items/${item.id}`, {
    method: 'DELETE',
    headers: { Cookie: jar.header(), 'X-CSRF-Token': csrf },
  });
  assert.equal(deleteRes.status, 200);

  const listAfter = await fetch(`${baseUrl}/api/items?section=backlog`, {
    headers: { Cookie: jar.header() },
  });
  const { items: itemsAfter } = await listAfter.json();
  assert.ok(!itemsAfter.some((i) => i.id === item.id));
});
