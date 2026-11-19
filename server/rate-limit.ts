import { randomUUID } from 'node:crypto';
import { withTransaction } from './db';

/** DB-backed rolling-window limiter. Works with local SQLite and remote Turso. */
export async function consumeRateLimit(key: string, windowMs: number, max: number) {
  const now = Date.now();
  // The check and the increment must be one serialised write: otherwise
  // parallel callers all read the same count and every request gets through.
  return withTransaction(async (tx) => {
    const row = (await tx.get('SELECT key, count, lastRequest FROM rateLimit WHERE key = ?', [key])) as
      | { key: string; count: number; lastRequest: number }
      | undefined;

    if (!row || now - Number(row.lastRequest) >= windowMs) {
      await tx.execute(
        'INSERT INTO rateLimit (id, key, count, lastRequest) VALUES (?, ?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, lastRequest = excluded.lastRequest',
        [randomUUID(), key, now],
      );
      return true;
    }
    if (Number(row.count) >= max) return false;

    await tx.execute('UPDATE rateLimit SET count = count + 1, lastRequest = ? WHERE key = ?', [now, key]);
    return true;
  });
}
