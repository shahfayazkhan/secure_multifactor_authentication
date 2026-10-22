/* eslint-disable no-console */
/**
 * End-to-end smoke test of the full auth + 2FA flow against a running API.
 *   node scripts/e2e.js            (API_URL defaults to http://localhost:$PORT from server/.env)
 * Uses a throwaway account; requires the server + MongoDB to be running.
 */
const speakeasy = require('speakeasy');

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 5050}`;
const ORIGIN = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0].trim();

function client() {
  let cookie = '';
  let csrf = '';
  async function call(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Origin: ORIGIN,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (data?.csrfToken) csrf = data.csrfToken;
    return { status: res.status, data };
  }
  return { call, setCsrf: (t) => (csrf = t) };
}

let passed = 0;
function expect(label, cond, extra) {
  if (!cond) {
    console.error(`✗ ${label}`, extra ?? '');
    process.exit(1);
  }
  passed += 1;
  console.log(`✓ ${label}`);
}

const sleepToNextStep = () => new Promise((r) => setTimeout(r, (30 - (Math.floor(Date.now() / 1000) % 30)) * 1000 + 300));

(async () => {
  const email = `e2e_${Date.now()}@example.com`;
  const password = 'Str0ngPass!';

  const a = client();
  let r = await a.call('GET', '/api/auth/session');
  expect('session bootstrap returns csrf', r.status === 200 && r.data.csrfToken && !r.data.authenticated);

  const bad = client();
  r = await bad.call('POST', '/api/auth/login', { email, password });
  expect('POST without CSRF token is rejected', r.status === 403 && r.data.error.code === 'CSRF_INVALID');

  r = await a.call('POST', '/api/auth/register', { name: 'E2E', email, password: 'weak' });
  expect('weak password rejected', r.status === 400);

  r = await a.call('POST', '/api/auth/register', { name: 'E2E User', email, password });
  expect('register + auto sign-in', r.status === 201 && r.data.user.email === email);

  r = await a.call('GET', '/api/auth/me');
  expect('/me works with session', r.status === 200 && r.data.user.twoFactorEnabled === false);

  r = await a.call('POST', '/api/2fa/setup');
  expect('2FA setup returns QR + key', r.status === 200 && r.data.qrCodeDataUrl.startsWith('data:image/png'));
  const secret = r.data.manualKey.replace(/\s/g, '');

  r = await a.call('POST', '/api/2fa/enable', { code: '000000' });
  expect('enable rejects wrong code', r.status === 400);

  const code1 = speakeasy.totp({ secret, encoding: 'base32' });
  r = await a.call('POST', '/api/2fa/enable', { code: code1 });
  expect('enable 2FA with valid code', r.status === 200 && r.data.backupCodes.length === 10);
  const backupCodes = r.data.backupCodes;

  r = await a.call('POST', '/api/auth/logout');
  expect('logout', r.status === 204);
  r = await a.call('GET', '/api/auth/me');
  expect('/me after logout is 401', r.status === 401);

  // Login now requires 2FA
  const b = client();
  await b.call('GET', '/api/auth/session');
  r = await b.call('POST', '/api/auth/login', { email, password: 'wrong' });
  expect('wrong password rejected', r.status === 401);
  r = await b.call('POST', '/api/auth/login', { email, password, remember: true });
  expect('password ok → mfaRequired', r.status === 200 && r.data.mfaRequired === true);
  r = await b.call('GET', '/api/auth/me');
  expect('protected route blocked while MFA pending', r.status === 401);

  r = await b.call('POST', '/api/auth/2fa/verify', { code: code1 });
  expect('replayed TOTP code rejected', r.status === 401);

  await sleepToNextStep();
  const code2 = speakeasy.totp({ secret, encoding: 'base32' });
  r = await b.call('POST', '/api/auth/2fa/verify', { code: code2 });
  expect('valid TOTP completes login', r.status === 200 && r.data.user.twoFactorEnabled);
  r = await b.call('GET', '/api/auth/me');
  expect('/me OK after MFA', r.status === 200 && r.data.session.remember === true);

  // Second device logs in with a backup code
  const c = client();
  await c.call('GET', '/api/auth/session');
  await c.call('POST', '/api/auth/login', { email, password });
  r = await c.call('POST', '/api/auth/2fa/verify', { code: backupCodes[0].toLowerCase() });
  expect('backup code login', r.status === 200 && r.data.backupCodesRemaining === 9);

  const d = client();
  await d.call('GET', '/api/auth/session');
  await d.call('POST', '/api/auth/login', { email, password });
  r = await d.call('POST', '/api/auth/2fa/verify', { code: backupCodes[0] });
  expect('used backup code cannot be reused', r.status === 401);

  r = await b.call('GET', '/api/sessions');
  expect('list sessions (2 active)', r.status === 200 && r.data.sessions.length === 2, r.data);
  const other = r.data.sessions.find((s) => !s.current);
  r = await b.call('DELETE', `/api/sessions/${other.id}`);
  expect('revoke other session', r.status === 204);
  r = await c.call('GET', '/api/auth/me');
  expect('revoked session is signed out', r.status === 401);

  r = await b.call('GET', '/api/account/activity');
  expect('activity log populated', r.status === 200 && r.data.events.length >= 5);

  r = await b.call('POST', '/api/account/password', { currentPassword: password, newPassword: 'N3wPassw0rd' });
  expect('change password', r.status === 200);
  r = await b.call('GET', '/api/auth/me');
  expect('current session survives password change', r.status === 200);

  await sleepToNextStep();
  r = await b.call('POST', '/api/2fa/disable', {
    password: 'N3wPassw0rd',
    code: speakeasy.totp({ secret, encoding: 'base32' }),
  });
  expect('disable 2FA', r.status === 200 && r.data.user.twoFactorEnabled === false);

  // Lockout
  const e = client();
  await e.call('GET', '/api/auth/session');
  for (let i = 0; i < 5; i += 1) r = await e.call('POST', '/api/auth/login', { email, password: 'nope' });
  expect('account locks after 5 failures', r.status === 423, r.data);
  r = await e.call('POST', '/api/auth/login', { email, password: 'N3wPassw0rd' });
  expect('locked account rejects correct password', r.status === 423);

  r = await b.call('DELETE', '/api/account', { password: 'N3wPassw0rd' });
  expect('delete account', r.status === 204);

  console.log(`\nAll ${passed} checks passed.`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
