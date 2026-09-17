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

test('/api/docs/:section rejects an unknown section', async () => {
  const jar = new CookieJar();
  const csrf = await primeCsrf(jar);
  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ password: TEST_PASSWORD }),
  });
  jar.absorb(loginRes);

  const res = await fetch(`${baseUrl}/api/docs/not-a-real-section`, {
    headers: { Cookie: jar.header() },
  });
  assert.equal(res.status, 400);
});

test('/api/docs requires auth for read and write', async () => {
  const getRes = await fetch(`${baseUrl}/api/docs/backlog`);
  assert.equal(getRes.status, 401);

  const putRes = await fetch(`${baseUrl}/api/docs/backlog`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'x' }),
  });
  assert.equal(putRes.status, 401);
});

test('/api/docs/:section: empty by default, then save and read back', async () => {
  const jar = new CookieJar();
  const csrf = await primeCsrf(jar);
  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ password: TEST_PASSWORD }),
  });
  jar.absorb(loginRes);

  const initial = await fetch(`${baseUrl}/api/docs/backlog`, { headers: { Cookie: jar.header() } });
  const { doc: initialDoc } = await initial.json();
  assert.equal(initialDoc.content, '');

  // PUT requires CSRF.
  const noCsrf = await fetch(`${baseUrl}/api/docs/backlog`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header() },
    body: JSON.stringify({ content: 'Play Hollow Knight' }),
  });
  assert.equal(noCsrf.status, 403);

  const saveRes = await fetch(`${baseUrl}/api/docs/backlog`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ content: 'Play Hollow Knight' }),
  });
  assert.equal(saveRes.status, 200);
  const { doc: saved } = await saveRes.json();
  assert.equal(saved.content, 'Play Hollow Knight');
  assert.ok(saved.updated_at);

  const readBack = await fetch(`${baseUrl}/api/docs/backlog`, { headers: { Cookie: jar.header() } });
  const { doc: reread } = await readBack.json();
  assert.equal(reread.content, 'Play Hollow Knight');

  // Overview endpoint reflects it too.
  const overviewRes = await fetch(`${baseUrl}/api/docs`, { headers: { Cookie: jar.header() } });
  const { docs } = await overviewRes.json();
  const backlogEntry = docs.find((d) => d.section === 'backlog');
  assert.ok(backlogEntry && backlogEntry.updated_at);
  assert.equal(backlogEntry.content, undefined, 'default overview should not include content');

  // ?full=1 includes content, for export/search.
  const fullRes = await fetch(`${baseUrl}/api/docs?full=1`, { headers: { Cookie: jar.header() } });
  const { docs: fullDocs } = await fullRes.json();
  const backlogFull = fullDocs.find((d) => d.section === 'backlog');
  assert.equal(backlogFull.content, 'Play Hollow Knight');

  // Non-string content is rejected.
  const badRes = await fetch(`${baseUrl}/api/docs/notes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ content: 12345 }),
  });
  assert.equal(badRes.status, 400);
});

test('/api/docs/:section/revert: no previous version yet fails cleanly', async () => {
  const jar = new CookieJar();
  const csrf = await primeCsrf(jar);
  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ password: TEST_PASSWORD }),
  });
  jar.absorb(loginRes);

  const res = await fetch(`${baseUrl}/api/docs/veto/revert`, {
    method: 'POST',
    headers: { Cookie: jar.header(), 'X-CSRF-Token': csrf },
  });
  assert.equal(res.status, 400);
});

test('/api/docs/:section/revert: save twice, revert restores the prior version', async () => {
  const jar = new CookieJar();
  const csrf = await primeCsrf(jar);
  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ password: TEST_PASSWORD }),
  });
  jar.absorb(loginRes);

  await fetch(`${baseUrl}/api/docs/links`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ content: 'version one' }),
  });
  const secondSave = await fetch(`${baseUrl}/api/docs/links`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ content: 'version two' }),
  });
  const { doc: secondDoc } = await secondSave.json();
  assert.equal(secondDoc.content, 'version two');
  assert.equal(secondDoc.previous_content, 'version one');

  const revertRes = await fetch(`${baseUrl}/api/docs/links/revert`, {
    method: 'POST',
    headers: { Cookie: jar.header(), 'X-CSRF-Token': csrf },
  });
  assert.equal(revertRes.status, 200);
  const { doc: reverted } = await revertRes.json();
  assert.equal(reverted.content, 'version one');
  assert.equal(reverted.previous_content, null);

  // Reverting again with nothing left to revert to fails cleanly.
  const revertAgain = await fetch(`${baseUrl}/api/docs/links/revert`, {
    method: 'POST',
    headers: { Cookie: jar.header(), 'X-CSRF-Token': csrf },
  });
  assert.equal(revertAgain.status, 400);
});

test('/api/prefs requires auth for read and write', async () => {
  const getRes = await fetch(`${baseUrl}/api/prefs`);
  assert.equal(getRes.status, 401);

  const putRes = await fetch(`${baseUrl}/api/prefs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinned_sections: ['twitch'] }),
  });
  assert.equal(putRes.status, 401);
});

test('/api/prefs: empty by default, then save and read back pinned sections', async () => {
  const jar = new CookieJar();
  const csrf = await primeCsrf(jar);
  const loginRes = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ password: TEST_PASSWORD }),
  });
  jar.absorb(loginRes);

  const initial = await fetch(`${baseUrl}/api/prefs`, { headers: { Cookie: jar.header() } });
  const { prefs: initialPrefs } = await initial.json();
  assert.deepEqual(initialPrefs.pinned_sections, []);

  // PUT requires CSRF.
  const noCsrf = await fetch(`${baseUrl}/api/prefs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header() },
    body: JSON.stringify({ pinned_sections: ['twitch'] }),
  });
  assert.equal(noCsrf.status, 403);

  // Unknown section rejected.
  const badSection = await fetch(`${baseUrl}/api/prefs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ pinned_sections: ['not-a-real-section'] }),
  });
  assert.equal(badSection.status, 400);

  // Non-array rejected.
  const badType = await fetch(`${baseUrl}/api/prefs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ pinned_sections: 'twitch' }),
  });
  assert.equal(badType.status, 400);

  const saveRes = await fetch(`${baseUrl}/api/prefs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ pinned_sections: ['twitch', 'commands'] }),
  });
  assert.equal(saveRes.status, 200);
  const { prefs: saved } = await saveRes.json();
  assert.deepEqual(saved.pinned_sections.sort(), ['commands', 'twitch']);

  const readBack = await fetch(`${baseUrl}/api/prefs`, { headers: { Cookie: jar.header() } });
  const { prefs: reread } = await readBack.json();
  assert.deepEqual(reread.pinned_sections.sort(), ['commands', 'twitch']);

  // Reset for order-independence with other tests.
  await fetch(`${baseUrl}/api/prefs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: jar.header(), 'X-CSRF-Token': csrf },
    body: JSON.stringify({ pinned_sections: [] }),
  });
});
