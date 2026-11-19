import { db, withTransaction } from './db';

type StockRow = { slug: string; available: number; reserved: number };
type Line = { slug: string; qty: number };

function bySlug(lines: Line[]) {
  const totals = new Map<string, number>();
  for (const line of lines) totals.set(line.slug, (totals.get(line.slug) ?? 0) + line.qty);
  return [...totals.entries()].map(([slug, qty]) => ({ slug, qty }));
}

/** Atomically holds stock for an unpaid order. Throws when anything is short. */
export async function reserveStock(lines: Line[]) {
  await withTransaction(async (tx) => {
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

export async function releaseStock(lines: Line[]) {
  const free = db.prepare('UPDATE stock SET reserved = MAX(0, reserved - ?) WHERE slug = ?');
  for (const { slug, qty } of bySlug(lines)) await free.run(qty, slug);
}

type Runner = { run: (sql: string, args: unknown[]) => Promise<{ changes: number }> };

const defaultRunner: Runner = {
  run: (sql, args) => db.prepare(sql).run(...args),
};

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

/** Frees holds for abandoned checkouts after 30 minutes. */
export async function releaseStaleReservations() {
  const cutoff = Date.now() - 30 * 60 * 1000;
  const rows = (await db
    .prepare("SELECT id, items FROM orders WHERE status = 'awaiting_payment' AND created_at < ?")
    .all(cutoff)) as { id: string; items: string }[];
  for (const row of rows) {
    try {
      const items = JSON.parse(row.items) as Line[];
      await releaseStock(items);
      await db
        .prepare("UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'awaiting_payment'")
        .run(row.id);
      console.log('[stock] released abandoned order', row.id);
    } catch {
      /* corrupt row: leave it for an operator */
    }
  }
}
