import { db, withTransaction } from './db';

type StockRow = { slug: string; available: number; reserved: number };
type Line = { slug: string; qty: number };

type Tx = {
  execute: (sql: string, args?: unknown[]) => Promise<{ rowsAffected: number | bigint }>;
  get: (sql: string, args?: unknown[]) => Promise<Record<string, unknown> | undefined>;
  all: (sql: string, args?: unknown[]) => Promise<Record<string, unknown>[]>;
};

export type Runner = { run: (sql: string, args: unknown[]) => Promise<{ changes: number }> };

/** Lets a stock mutation join a caller's write transaction. */
export function txRunner(tx: Tx): Runner {
  return {
    run: async (sql, args) => ({ changes: Number((await tx.execute(sql, args)).rowsAffected) }),
  };
}

const defaultRunner: Runner = {
  run: (sql, args) => db.prepare(sql).run(...args),
};

const STALE_HOLD_MS = 30 * 60 * 1000;

function bySlug(lines: Line[]) {
  const totals = new Map<string, number>();
  for (const line of lines) totals.set(line.slug, (totals.get(line.slug) ?? 0) + line.qty);
  return [...totals.entries()].map(([slug, qty]) => ({ slug, qty }));
}

/**
 * Frees expired holds and cancels the orders that owned them. The guarded
 * status update decides which of any overlapping callers releases the stock,
 * so a hold can only be freed once. Must run inside a write transaction.
 */
async function releaseStaleWithin(tx: Tx, cutoff: number) {
  const rows = await tx.all(
    "SELECT id, items FROM orders WHERE status = 'awaiting_payment' AND created_at < ?",
    [cutoff],
  );
  for (const row of rows) {
    let items: Line[];
    try {
      items = JSON.parse(String(row.items)) as Line[];
    } catch {
      continue; // corrupt row: leave it for an operator
    }
    const updated = await tx.execute(
      "UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'awaiting_payment'",
      [row.id],
    );
    if (!updated.rowsAffected) continue;
    await releaseStock(items, txRunner(tx));
  }
}

/** Atomically holds stock for an unpaid order. Throws when anything is short. */
export async function reserveStock(lines: Line[]) {
  await withTransaction(async (tx) => {
    // Self-heal before checking availability. The Vercel Function has no boot
    // hook, so this is the only expiry path shared by both runtimes.
    await releaseStaleWithin(tx, Date.now() - STALE_HOLD_MS);
    const find = (slug: string) => tx.get('SELECT slug, available, reserved FROM stock WHERE slug = ?', [slug]);
    const hold = (qty: number, slug: string) =>
      tx.execute('UPDATE stock SET reserved = reserved + ? WHERE slug = ?', [qty, slug]);

    for (const { slug, qty } of bySlug(lines)) {
      const row = (await find(slug)) as StockRow | undefined;
      if (!row) throw new Error('One of those pieces is no longer available.');
      if (Number(row.available) - Number(row.reserved) < qty) {
        throw new Error(`Only ${Number(row.available) - Number(row.reserved)} of that piece is left. Refresh your bag.`);
      }
      await hold(qty, slug);
    }
  });
}

/** Releases holds with the given runner; pass a transaction runner when atomic. */
export async function releaseStock(lines: Line[], runner: Runner = defaultRunner) {
  for (const { slug, qty } of bySlug(lines)) {
    await runner.run('UPDATE stock SET reserved = MAX(0, reserved - ?) WHERE slug = ?', [qty, slug]);
  }
}

export async function commitStock(lines: Line[], runner: Runner = defaultRunner) {
  for (const { slug, qty } of bySlug(lines)) {
    const result = await runner.run(
      'UPDATE stock SET available = available - ?, reserved = MAX(0, reserved - ?) WHERE slug = ? AND available >= ?',
      [qty, qty, slug, qty],
    );
    if (!result.changes) console.error('[stock] could not commit sale for', slug, qty);
  }
}

export async function availableFor(slug: string) {
  const row = (await db.prepare('SELECT available, reserved FROM stock WHERE slug = ?').get(slug)) as
    | StockRow
    | undefined;
  return row ? Math.max(0, Number(row.available) - Number(row.reserved)) : 0;
}

/** Kept for the Node host boot; reservation is now self-healing on both runtimes. */
export async function releaseStaleReservations() {
  await withTransaction(async (tx) => {
    await releaseStaleWithin(tx, Date.now() - STALE_HOLD_MS);
  });
}
