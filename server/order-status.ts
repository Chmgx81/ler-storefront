import { formatPrice } from '../src/data/products';
import { fromCents } from '../src/lib/pricing';
import { config } from './config';
import { db, recordEvent, withTransaction } from './db';
import { sendReceipt } from './mail';
import { commitStock, releaseStock } from './stock';

type Row = {
  id: string;
  public_id: string;
  number: string;
  user_id: string | null;
  email: string;
  name: string;
  access_token: string | null;
  status: string;
  total_cents: number;
  items: string;
  payment_intent_id: string | null;
};

export async function findOrderByPublicId(id: string) {
  return (await db.prepare('SELECT * FROM orders WHERE public_id = ?').get(id)) as Row | undefined;
}

async function sendOrderReceipt(row: Row) {
  try {
    await sendReceipt({
      to: row.email,
      name: row.name,
      number: row.number,
      total: formatPrice(fromCents(Number(row.total_cents))),
      orderUrl: `${config.publicUrl}/order/confirmed?id=${row.public_id}&token=${row.access_token ?? ''}`,
    });
    return true;
  } catch (error) {
    console.error('[orders] receipt failed', error);
    return false;
  }
}

/** Idempotent: a repeated webhook or return visit never double-sells stock. */
export async function markPaid(publicId: string, paymentIntentId: string) {
  const row = await findOrderByPublicId(publicId);
  if (!row || row.status !== 'awaiting_payment') return false;

  await withTransaction(async (tx) => {
    const updated = await tx.execute(
      "UPDATE orders SET status = 'paid', payment_intent_id = ? WHERE id = ? AND status = 'awaiting_payment'",
      [paymentIntentId, row.id],
    );
    if (!updated.rowsAffected) return false;
    await commitStock(JSON.parse(row.items) as { slug: string; qty: number }[], {
      run: async (sql, args) => ({ changes: Number((await tx.execute(sql, args)).rowsAffected) }),
    });
  });

  recordEvent('payment_captured', row.number, row.email);
  await sendOrderReceipt(row);
  return true;
}

export async function markCancelled(publicId: string) {
  const row = await findOrderByPublicId(publicId);
  if (!row || row.status !== 'awaiting_payment') return false;
  const updated = await db
    .prepare("UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'awaiting_payment'")
    .run(row.id);
  if (!updated.changes) return false;
  await releaseStock(JSON.parse(row.items) as { slug: string; qty: number }[]);
  recordEvent('payment_cancelled', row.number, row.email);
  return true;
}

export async function markRefunded(publicId: string) {
  const row = await findOrderByPublicId(publicId);
  if (!row || !['paid', 'packed', 'shipped'].includes(row.status)) return false;
  const updated = await db.prepare("UPDATE orders SET status = 'refunded' WHERE id = ?").run(row.id);
  recordEvent('payment_refunded', row.number, row.email);
  return updated.changes > 0;
}
