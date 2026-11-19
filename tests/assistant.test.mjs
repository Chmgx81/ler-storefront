import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { rm } from 'node:fs/promises';

const BASE_ENV = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  NODE_ENV: 'development',
  BETTER_AUTH_URL: 'http://localhost:5173',
  BETTER_AUTH_SECRET: 'test-secret-only-for-local-assistant-tests-0123456789',
  ORDER_RATE_MAX: '200',
  NVIDIA_API_KEY: '',
};

async function startServer(port, db, extra = {}) {
  await rm(db, { force: true });
  await rm(`${db}-wal`, { force: true });
  await rm(`${db}-shm`, { force: true });
  const child = spawn(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
    cwd: process.cwd(),
    env: {
      ...BASE_ENV,
      PORT: String(port),
      DATABASE_PATH: db,
      MAIL_OUTBOX: `/tmp/opencode/assistant-outbox-${port}`,
      ...extra,
    },
    stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`http://localhost:${port}/api/health`)).ok) return child;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  child.kill('SIGKILL');
  throw new Error('assistant test server did not start');
}

async function ask(port, messages, headers = {}) {
  return fetch(`http://localhost:${port}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173', ...headers },
    body: JSON.stringify({ messages }),
  });
}

test('local fallback answers catalogue questions and enforces limits', async (t) => {
  const port = 8804;
  const child = await startServer(port, '/tmp/opencode/assistant-local.sqlite', { ASSISTANT_RATE_MAX: '2' });
  t.after(async () => {
    child.kill('SIGKILL');
    await rm('/tmp/opencode/assistant-local.sqlite', { force: true });
  });

  const meta = await (await fetch(`http://localhost:${port}/api/meta`)).json();
  assert.equal(meta.assistant.enabled, false);
  assert.equal(meta.assistant.model, 'meta/muse-glimmer-30b');

  const answer = await ask(port, [{ role: 'user', content: 'Do you have an olive teapot?' }]);
  assert.equal(answer.status, 200);
  const body = await answer.json();
  assert.equal(body.mode, 'fallback');
  assert.ok(body.products.some((item) => item.slug === 'round-bellied-teapot'));

  const noOrigin = await fetch(`http://localhost:${port}/api/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
  });
  assert.equal(noOrigin.status, 403);

  const second = await ask(port, [{ role: 'user', content: 'What about mugs?' }]);
  assert.equal(second.status, 200);
  const blocked = await ask(port, [{ role: 'user', content: 'And bowls?' }]);
  assert.equal(blocked.status, 429);
});

test('NIM tool loop validates tools, keeps the key server-side and returns cards', async (t) => {
  const nimPort = 8806;
  let authHeader = '';
  let calls = 0;
  const nim = createServer((request, response) => {
    let raw = '';
    request.on('data', (chunk) => { raw += chunk; });
    request.on('end', () => {
      authHeader = request.headers.authorization ?? '';
      calls += 1;
      const payload = calls === 1
        ? {
            choices: [{
              message: {
                role: 'assistant',
                content: null,
                tool_calls: [{
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'search_catalog',
                    arguments: JSON.stringify({ query: 'olive teapot', collection: 'All' }),
                  },
                }],
              },
            }],
          }
        : { choices: [{ message: { role: 'assistant', content: 'The Round-Bellied Teapot is your best match.' } }] };
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(payload));
    });
  });
  await new Promise((resolve) => nim.listen(nimPort, '127.0.0.1', resolve));
  t.after(() => nim.close());

  const port = 8805;
  const child = await startServer(port, '/tmp/opencode/assistant-nim.sqlite', {
    NVIDIA_API_KEY: 'sk-test-local-only',
    NVIDIA_BASE_URL: `http://127.0.0.1:${nimPort}/v1`,
    ASSISTANT_RATE_MAX: '50',
  });
  t.after(async () => {
    child.kill('SIGKILL');
    await rm('/tmp/opencode/assistant-nim.sqlite', { force: true });
  });

  const meta = await (await fetch(`http://localhost:${port}/api/meta`)).json();
  assert.equal(meta.assistant.enabled, true);

  const response = await ask(port, [{ role: 'user', content: 'Show me an olive teapot' }]);
  assert.equal(response.status, 200);
  const text = await response.text();
  const body = JSON.parse(text);
  assert.equal(body.mode, 'nim');
  assert.match(body.message, /Round-Bellied Teapot/);
  assert.ok(body.products.some((item) => item.slug === 'round-bellied-teapot'));
  assert.equal(calls, 2);
  assert.equal(authHeader, 'Bearer sk-test-local-only');
  assert.ok(!text.includes('sk-test-local-only'), 'the key must never appear in the API response');
});
