import { randomUUID } from 'node:crypto';
import { db } from './db';

/** DB-backed rolling-window limiter. Works with local SQLite and remote Turso. */
export async function consumeRateLimit(key: string, windowMs: number, max: number) {
  const now = Date.now();
  const row = (await db.prepare('SELECT key, count, lastRequest FROM rateLimit WHERE key = ?').get(key)) as
    | { key: string; count: number; lastRequest: number }
    | undefined;

  if (!row || now - Number(row.lastRequest) >= windowMs) {
    await db
      .prepare(
        'INSERT INTO rateLimit (id, key, count, lastRequest) VALUES (?, ?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, lastRequest = excluded.lastRequest',
      )
      .run(randomUUID(), key, now);
    return true;
  }
  if (Number(row.count) >= max) return false;

  await db.prepare('UPDATE rateLimit SET count = count + 1, lastRequest = ? WHERE key = ?').run(now, key);
  return true;
}
