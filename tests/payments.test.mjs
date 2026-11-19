import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { createClient } from '@libsql/client';

const PORT = 8801;
const BASE = `http://localhost:${PORT}`;
const DB = '/tmp/opencode/ler-payments-test.sqlite';
const OUTBOX = '/tmp/opencode/ler-payments-outbox';
const SECRET = 'whsec_localtestsecret123456';

let child;
let orderId;
let event;

/** Minimal async handle over the same libSQL path the server uses. */
function openDb() {
  const client = createClient({ url: `file:${DB}` });
  return {
    async get(sql, ...args) {
      const { rows } = await client.execute({ sql, args });
      return rows[0];
    },
    async run(sql, ...args) {
      await client.execute({ sql, args });
    },
    close() {
      client.close();
    },
  };
}

function signed(body) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', SECRET).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

async function post(body, signature) {
  return fetch(`${BASE}/api/payments/stripe/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(signature ? { 'Stripe-Signature': signature } : {}),
    },
    body,
  });
}

before(async () => {
  for (const suffix of ['', '-wal', '-shm']) await rm(`${DB}${suffix}`, { force: true });
  await rm(OUTBOX, { recursive: true, force: true });

  child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      NODE_ENV: 'development',
      BETTER_AUTH_URL: 'http://localhost:5173',
      BETTER_AUTH_SECRET: 'test-secret-only-for-local-payment-tests-0123456789',
      DATABASE_PATH: DB,
      MAIL_OUTBOX: OUTBOX,
      PORT: String(PORT),
      PAYMENTS_MODE: 'stripe',
      STRIPE_SECRET_KEY: 'sk_test_localonly',
      STRIPE_WEBHOOK_SECRET: SECRET,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr.on('data', (chunk) => process.stderr.write(`[payments-api] ${chunk}`));

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) break;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  orderId = randomUUID();
  const slug = 'rounded-stoneware-mug';
  const db = openDb();
  await db.run(
    `INSERT INTO orders
      (id, public_id, number, user_id, email, name, address, city, country, shipping,
       status, subtotal_cents, shipping_cents, total_cents, items, idempotency_key,
       access_token, payment_intent_id, created_at)
     VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 'awaiting_payment', 5600, 800, 6400, ?, NULL, ?, NULL, ?)`,

    orderId,
    orderId,
    'LER-PAYTEST',
    'pay@test.example',
    'Pay Tester',
    'Strandgade 1',
    'Copenhagen',
    'Denmark',
    'Standard, 2–3 working days',
    JSON.stringify([{ slug, name: 'Rounded Stoneware Mug', price: 28, image: '/x.webp', qty: 2, options: 'Capacity: 280 ml' }]),
    'testaccesstoken',
    Date.now(),
  );
  await db.run('UPDATE stock SET reserved = reserved + 2 WHERE slug = ?', slug);
  db.close();

  event = JSON.stringify({
    id: `evt_${randomUUID()}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        payment_status: 'paid',
        payment_intent: 'pi_localtest123',
        metadata: { order_id: orderId },
      },
    },
  });
});

after(async () => {
  if (child && !child.killed) child.kill('SIGKILL');
  child?.stdout?.destroy();
  child?.stderr?.destroy();
  for (const suffix of ['', '-wal', '-shm']) await rm(`${DB}${suffix}`, { force: true });
  await rm(OUTBOX, { recursive: true, force: true });
});

test('webhook rejects an unsigned or tampered event', async () => {
  assert.equal((await post(event)).status, 400);
  assert.equal((await post(event, signed(event) + '00')).status, 400);
});

test('signed webhook captures payment, commits stock and sends a receipt', async () => {
  const response = await post(event, signed(event));
  assert.equal(response.status, 200);

  const db = openDb();
  const order = await db.get('SELECT status, payment_intent_id FROM orders WHERE public_id = ?', orderId);
  const stock = await db.get('SELECT available, reserved FROM stock WHERE slug = ?', 'rounded-stoneware-mug');
  db.close();
  assert.equal(order.status, 'paid');
  assert.equal(order.payment_intent_id, 'pi_localtest123');
  assert.equal(stock.reserved, 0);
  assert.ok(stock.available >= 0);
});

test('replaying the same event does not sell stock twice', async () => {
  const db = openDb();
  const before = (await db.get('SELECT available FROM stock WHERE slug = ?', 'rounded-stoneware-mug')).available;
  db.close();
  assert.equal((await post(event, signed(event))).status, 200);
  const db2 = openDb();
  const after = (await db2.get('SELECT available FROM stock WHERE slug = ?', 'rounded-stoneware-mug')).available;
  db2.close();
  assert.equal(after, before);
});

test('refund event marks a paid order refunded', async () => {
  const refund = JSON.stringify({
    id: `evt_${randomUUID()}`,
    type: 'charge.refunded',
    data: { object: { payment_intent: 'pi_localtest123' } },
  });
  assert.equal((await post(refund, signed(refund))).status, 200);
  const db = openDb();
  const order = await db.get('SELECT status FROM orders WHERE public_id = ?', orderId);
  db.close();
  assert.equal(order.status, 'refunded');
});
