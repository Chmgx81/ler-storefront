import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PORT = 8799;
const BASE = `http://localhost:${PORT}`;
const ORIGIN = 'http://localhost:5173';
const DB = '/tmp/opencode/ler-api-test.sqlite';
const OUTBOX = '/tmp/opencode/ler-api-outbox';

let child;
let adminCookie;

before(async () => {
  await rm(`${DB}-wal`, { force: true });
  await rm(`${DB}-shm`, { force: true });
  await rm(DB, { force: true });
  await rm(OUTBOX, { recursive: true, force: true });

  child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      NODE_ENV: 'development',
      BETTER_AUTH_URL: ORIGIN,
      BETTER_AUTH_SECRET: 'test-secret-only-for-local-api-tests-0123456789',
      DATABASE_PATH: DB,
      MAIL_OUTBOX: OUTBOX,
      PORT: String(PORT),
      ADMIN_EMAILS: 'admin@test.example',
      ORDER_RATE_MAX: '200',
      NVIDIA_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => process.stdout.write(`[api] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[api] ${chunk}`));

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return;
    } catch {
      /* still starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('API did not start in time');
});

after(async () => {
  if (child && !child.killed) child.kill('SIGKILL');
  child?.stdout?.destroy();
  child?.stderr?.destroy();
  await rm(DB, { force: true });
  await rm(OUTBOX, { recursive: true, force: true });
});

async function api(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data, headers: response.headers };
}

const orderInput = (overrides = {}) => ({
  email: 'buyer@test.example',
  name: 'Test Buyer',
  address: 'Strandgade 24',
  city: 'Copenhagen',
  country: 'Denmark',
  shipping: 'standard',
  items: [{ slug: 'rounded-stoneware-mug', qty: 2, options: { Capacity: '380 ml' } }],
  ...overrides,
});

test('health and public config', async () => {
  const health = await api('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.ok, true);
  const meta = await api('/api/meta');
  assert.equal(meta.data.payments, 'demo');
  assert.equal(meta.data.signedIn, false);
  assert.equal(meta.data.isAdmin, false);
});

test('server recalculates prices, status and receipt', async () => {
  const placed = await api('/api/orders', {
    method: 'POST',
    body: orderInput({ items: [{ slug: 'rounded-stoneware-mug', qty: 3, options: { Capacity: 'bad' } }] }),
    headers: { 'Idempotency-Key': 'test-key-price-authority-1234567890' },
  });
  assert.equal(placed.status, 201);
  assert.equal(placed.data.items[0].price, 28);
  assert.equal(placed.data.items[0].qty, 3);
  assert.equal(placed.data.items[0].options, 'Capacity: 280 ml');
  assert.equal(placed.data.total, 92);
  assert.equal(placed.data.status, 'confirmed');
  assert.equal(placed.data.receiptSent, true);

  const files = await readdir(OUTBOX);
  const mail = JSON.parse(await readFile(join(OUTBOX, files[0]), 'utf8'));
  assert.match(mail.subject, /LER order/);
  assert.match(mail.text, /test-key|LER-/);
});

test('idempotency replays do not create another order', async () => {
  const key = 'test-key-idempotency-abcdefghijklmnop';
  const first = await api('/api/orders', {
    method: 'POST',
    body: orderInput(),
    headers: { 'Idempotency-Key': key },
  });
  const replay = await api('/api/orders', {
    method: 'POST',
    body: orderInput({ items: [{ slug: 'unknown', qty: 1 }] }),
    headers: { 'Idempotency-Key': key },
  });
  assert.equal(first.status, 201);
  assert.equal(replay.status, 200);
  assert.equal(replay.data.id, first.data.id);
  assert.equal(replay.data.total, first.data.total);
});

test('validation rejects tampering instead of truncating', async () => {
  const tooLong = await api('/api/orders', {
    method: 'POST',
    body: orderInput({ name: 'A'.repeat(200) }),
  });
  assert.equal(tooLong.status, 400);
  const unknown = await api('/api/orders', {
    method: 'POST',
    body: orderInput({ items: [{ slug: 'not-a-product', qty: 1 }] }),
  });
  assert.equal(unknown.status, 400);
  const badJson = await fetch(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal(badJson.status, 400);
});

test('cross-origin writes are rejected', async () => {
  const response = await fetch(`${BASE}/api/orders`, {
    method: 'POST',
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
    body: JSON.stringify(orderInput()),
  });
  assert.equal(response.status, 403);
});

test('guest order is reachable by its random id', async () => {
  const placed = await api('/api/orders', { method: 'POST', body: orderInput() });
  assert.equal(placed.status, 201);
  const denied = await api(`/api/orders/${placed.data.id}`);
  assert.equal(denied.status, 403);
  const fetched = await api(`/api/orders/${placed.data.id}?token=${placed.data.accessToken}`);
  assert.equal(fetched.status, 200);
  assert.equal(fetched.data.number, placed.data.number);
  const missing = await api('/api/orders/not-a-real-id');
  assert.equal(missing.status, 404);
});

test('sign up, session and sign out', async () => {
  const signup = await api('/api/auth/sign-up/email', {
    method: 'POST',
    body: { email: 'member@test.example', password: 'quietstudio123', name: 'Test Member' },
  });
  assert.equal(signup.status, 200);
  const cookie = signup.headers.get('set-cookie').split(';')[0];
  assert.match(cookie, /better-auth\.session_token/);

  const session = await api('/api/auth/get-session', { cookie });
  assert.equal(session.data.user.email, 'member@test.example');
  const orders = await api('/api/orders', { cookie });
  assert.equal(orders.status, 200);
  assert.equal(orders.data.orders.length, 0);

  const signout = await api('/api/auth/sign-out', { method: 'POST', cookie, body: {} });
  assert.equal(signout.status, 200);
});

test('orders are private to their owner', async () => {
  const signup = await api('/api/auth/sign-up/email', {
    method: 'POST',
    body: { email: 'other@test.example', password: 'quietstudio123', name: 'Other Person' },
  });
  const cookie = signup.headers.get('set-cookie').split(';')[0];
  const owner = await api('/api/auth/sign-up/email', {
    method: 'POST',
    body: { email: 'owner@test.example', password: 'quietstudio123', name: 'Order Owner' },
  });
  const ownerCookie = owner.headers.get('set-cookie').split(';')[0];
  const placed = await api('/api/orders', { method: 'POST', cookie: ownerCookie, body: orderInput() });

  const denied = await api(`/api/orders/${placed.data.id}`, { cookie });
  assert.equal(denied.status, 403);
  const allowed = await api(`/api/orders/${placed.data.id}`, { cookie: ownerCookie });
  assert.equal(allowed.status, 200);
  const list = await api('/api/orders', { cookie });
  assert.equal(list.data.orders.length, 0);
});

test('signed-in email cannot be replaced by the form', async () => {
  const signup = await api('/api/auth/sign-up/email', {
    method: 'POST',
    body: { email: 'locked@test.example', password: 'quietstudio123', name: 'Locked Email' },
  });
  const cookie = signup.headers.get('set-cookie').split(';')[0];
  const placed = await api('/api/orders', {
    method: 'POST',
    cookie,
    body: orderInput({ email: 'attacker@test.example' }),
  });
  assert.equal(placed.status, 201);
  assert.equal(placed.data.email, 'locked@test.example');
});

test('password reset works through the local outbox', async () => {
  const signup = await api('/api/auth/sign-up/email', {
    method: 'POST',
    body: { email: 'reset@test.example', password: 'oldpassword123', name: 'Reset Person' },
  });
  assert.equal(signup.status, 200);
  const requested = await api('/api/auth/request-password-reset', {
    method: 'POST',
    body: { email: 'reset@test.example', redirectTo: '/account/reset' },
  });
  assert.equal(requested.status, 200);

  const files = await readdir(OUTBOX);
  const mails = await Promise.all(files.map((file) => readFile(join(OUTBOX, file), 'utf8')));
  const resetMail = mails.map((raw) => JSON.parse(raw)).find((mail) => mail.subject.includes('Reset'));
  assert.ok(resetMail, 'a reset email was written to the outbox');
  const token = resetMail.text.match(/reset-password\/([^?\s]+)/)?.[1];
  assert.ok(token, 'the reset link contains a token');

  const reset = await api('/api/auth/reset-password', {
    method: 'POST',
    body: { token, newPassword: 'newpassword456' },
  });
  assert.equal(reset.status, 200);

  const oldSignin = await api('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email: 'reset@test.example', password: 'oldpassword123' },
  });
  assert.equal(oldSignin.status, 401);
  const newSignin = await api('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email: 'reset@test.example', password: 'newpassword456' },
  });
  assert.equal(newSignin.status, 200);
});

test('newsletter stores once and rate limits abuse', async () => {
  for (let i = 0; i < 5; i += 1) {
    const response = await api('/api/newsletter', {
      method: 'POST',
      body: { email: 'fan@test.example', source: 'footer' },
    });
    assert.equal(response.status, 201);
  }
  const blocked = await api('/api/newsletter', {
    method: 'POST',
    body: { email: 'fan2@test.example', source: 'footer' },
  });
  assert.equal(blocked.status, 429);
});

test('admin ledger requires an allowlisted email', async () => {
  const guest = await api('/api/admin/orders');
  assert.equal(guest.status, 404);

  const signup = await api('/api/auth/sign-up/email', {
    method: 'POST',
    body: { email: 'admin@test.example', password: 'quietstudio123', name: 'Studio Admin' },
  });
  const cookie = signup.headers.get('set-cookie').split(';')[0];
  adminCookie = cookie;
  const unverified = await api('/api/meta', { cookie });
  assert.equal(unverified.data.isAdmin, false);
  assert.equal((await api('/api/admin/orders', { cookie })).status, 404);

  // An allowlisted email is not enough: the mailbox must be verified.
  const writable = new DatabaseSync(DB);
  writable.prepare('UPDATE user SET emailVerified = 1 WHERE email = ?').run('admin@test.example');
  writable.close();

  const meta = await api('/api/meta', { cookie });
  assert.equal(meta.data.isAdmin, true);
  const orders = await api('/api/admin/orders', { cookie });
  assert.equal(orders.status, 200);
  assert.ok(orders.data.orders.length > 0);

  const target = orders.data.orders[0];
  const updated = await api(`/api/admin/orders/${target.id}`, {
    method: 'PATCH',
    cookie,
    body: { status: 'shipped' },
  });
  assert.equal(updated.status, 200);
  const reloaded = await api('/api/admin/orders', { cookie });
  const changed = reloaded.data.orders.find((item) => item.id === target.id);
  assert.equal(changed.status, 'shipped');
});

test('account deletion removes the user and their orders', async () => {
  const signup = await api('/api/auth/sign-up/email', {
    method: 'POST',
    body: { email: 'erase@test.example', password: 'quietstudio123', name: 'Erase Me' },
  });
  const cookie = signup.headers.get('set-cookie').split(';')[0];
  const placed = await api('/api/orders', { method: 'POST', cookie, body: orderInput() });
  assert.equal(placed.status, 201);

  const removed = await api('/api/auth/delete-user', {
    method: 'POST',
    cookie,
    body: { password: 'quietstudio123' },
  });
  assert.equal(removed.status, 200);
  const order = await api(`/api/orders/${placed.data.id}`);
  assert.equal(order.status, 404);
  const session = await api('/api/auth/get-session', { cookie });
  assert.equal(session.data, null);
});

test('stock is reserved and overselling is refused', async () => {
  const beforeDb = new DatabaseSync(DB, { readOnly: true });
  const before = beforeDb.prepare('SELECT available FROM stock WHERE slug = ?').get('wide-pasta-bowl').available;
  beforeDb.close();
  const placed = await api('/api/orders', {
    method: 'POST',
    body: orderInput({ items: [{ slug: 'wide-pasta-bowl', qty: 3, options: {} }] }),
  });
  assert.equal(placed.status, 201);
  const readable = new DatabaseSync(DB, { readOnly: true });
  const row = readable.prepare('SELECT available, reserved FROM stock WHERE slug = ?').get('wide-pasta-bowl');
  readable.close();
  assert.equal(row.available, before - 3);
  assert.equal(row.reserved, 0);

  const tooMany = await api('/api/orders', {
    method: 'POST',
    body: orderInput({ items: [{ slug: 'wide-pasta-bowl', qty: 99, options: {} }] }),
  });
  assert.equal(tooMany.status, 409);
  assert.match(tooMany.data.error, /left/);
});

test('demo refund marks a paid order as refunded', async () => {
  const orders = await api('/api/admin/orders', { cookie: adminCookie });
  const target = orders.data.orders[0];
  const writable = new DatabaseSync(DB);
  writable.prepare("UPDATE orders SET status = 'paid' WHERE public_id = ?").run(target.id);
  writable.close();

  const refunded = await api(`/api/admin/orders/${target.id}/refund`, {
    method: 'POST',
    cookie: adminCookie,
    body: {},
  });
  assert.equal(refunded.status, 200);
  const reloaded = await api('/api/admin/orders', { cookie: adminCookie });
  assert.equal(reloaded.data.orders.find((item) => item.id === target.id).status, 'refunded');
});

