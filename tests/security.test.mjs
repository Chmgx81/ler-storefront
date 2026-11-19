import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';

const PORT = 8802;
const BASE = `http://localhost:${PORT}`;
const ORIGIN = 'http://localhost:5173';
const DB = '/tmp/opencode/ler-security-test.sqlite';
const OUTBOX = '/tmp/opencode/ler-security-outbox';

let child;

before(async () => {
  for (const suffix of ['', '-wal', '-shm']) await rm(`${DB}${suffix}`, { force: true });
  await rm(OUTBOX, { recursive: true, force: true });
  child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
      NODE_ENV: 'development',
      BETTER_AUTH_URL: ORIGIN,
      BETTER_AUTH_SECRET: 'test-secret-only-for-local-security-tests-0123456789',
      DATABASE_PATH: DB,
      MAIL_OUTBOX: OUTBOX,
      PORT: String(PORT),
      ORDER_RATE_MAX: '2',
      ORDER_RATE_WINDOW_MS: '600000',
      NVIDIA_API_KEY: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr.on('data', (chunk) => process.stderr.write(`[security] ${chunk}`));
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
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

test('parallel requests cannot exceed the order rate limit', async () => {
  const payload = {
    email: 'buyer@test.example',
    name: 'Buyer',
    address: 'Strandgade 24',
    city: 'Copenhagen',
    country: 'Denmark',
    shipping: 'standard',
    items: [{ slug: 'rounded-stoneware-mug', qty: 1, options: { Capacity: '380 ml' } }],
  };
  const responses = await Promise.all(
    Array.from({ length: 8 }, (_, index) =>
      fetch(`${BASE}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: ORIGIN,
          'Idempotency-Key': `security-test-${index.toString().padStart(16, '0')}`,
        },
        body: JSON.stringify(payload),
      }),
    ),
  );
  const statuses = responses.map((response) => response.status);
  assert.equal(statuses.filter((status) => status === 201).length, 2, JSON.stringify(statuses));
  assert.equal(statuses.filter((status) => status === 429).length, 6, JSON.stringify(statuses));
});
