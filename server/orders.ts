import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context, Hono } from 'hono';
import { formatPrice, getProduct } from '../src/data/products';
import {
  CURRENCY,
  MAX_LINE_QTY,
  MAX_ORDER_LINES,
  fromCents,
  toCents,
  totalsFor,
  type ShippingMethod,
} from '../src/lib/pricing';
import { auth } from './auth';
import { config } from './config';
import { db, recordEvent } from './db';
import { sendReceipt } from './mail';
import { markRefunded } from './order-status';
import { createCheckoutSession, refundPayment } from './payments';
import { consumeRateLimit } from './rate-limit';
import { availableFor, commitStock, releaseStock, reserveStock } from './stock';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STATUSES = [
  'awaiting_payment',
  'confirmed',
  'paid',
  'packed',
  'shipped',
  'cancelled',
  'refunded',
] as const;
type Status = (typeof STATUSES)[number];

type OrderItem = {
  slug: string;
  name: string;
  price: number;
  image: string;
  qty: number;
  options: string;
};

export type OrderRow = {
  id: string;
  public_id: string;
  number: string;
  user_id: string | null;
  email: string;
  name: string;
  address: string;
  city: string;
  country: string;
  shipping: string;
  status: Status;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  items: string;
  idempotency_key: string | null;
  access_token: string | null;
  payment_intent_id: string | null;
  created_at: number;
};

function text(value: unknown, max: number) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : '';
}

function fieldTooLong(value: unknown, max: number) {
  return typeof value === 'string' && value.trim().length > max;
}

export function serialize(row: OrderRow) {
  let items: OrderItem[] = [];
  try {
    items = JSON.parse(row.items) as OrderItem[];
  } catch {
    console.error('[orders] corrupt items for order', row.id);
  }
  return {
    id: row.public_id,
    number: row.number,
    email: row.email,
    name: row.name,
    address: row.address,
    city: row.city,
    country: row.country,
    shipping: row.shipping,
    status: row.status,
    accessToken: row.access_token ?? '',
    paymentIntentId: row.payment_intent_id ?? '',
    items,
    subtotal: fromCents(row.subtotal_cents),
    shippingCost: fromCents(row.shipping_cents),
    total: fromCents(row.total_cents),
    placedAt: new Date(row.created_at).toISOString(),
  };
}

async function orderNumber(id: string) {
  const exists = db.prepare('SELECT 1 FROM orders WHERE number = ?');
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = `LER-${Math.floor(100000 + Math.random() * 900000)}`;
    if (!(await exists.get(candidate))) return candidate;
  }
  return `LER-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export function clientIp(c: Context) {
  if (config.trustProxy) {
    const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim();
    const real = c.req.header('x-real-ip')?.trim();
    if (forwarded || real) return forwarded || real || 'unknown';
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    // No Node socket (Vercel Functions). Forwarded headers are only trustworthy
    // when the operator has explicitly opted in with TRUST_PROXY=true.
    return 'unknown';
  }
}

async function limited(c: Context, kind: 'orders' | 'newsletter' | 'admin', max: number, windowMs: number) {
  const key = `${kind}:${clientIp(c)}`;
  if (await consumeRateLimit(key, windowMs, max)) return false;
  c.header('Retry-After', String(Math.ceil(windowMs / 1000)));
  return true;
}

function tokenMatches(given: unknown, expected: string | null) {
  if (!expected || typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function sessionUser(c: Context) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  return session?.user ?? null;
}

/** Admin rights require both an allowlisted address and a verified mailbox. */
async function isAdminUser(user: { id: string; email: string } | null) {
  if (!user || !config.isAdminEmail(user.email)) return false;
  const row = (await db.prepare('SELECT emailVerified FROM user WHERE id = ?').get(user.id)) as
    | { emailVerified: number }
    | undefined;
  return row?.emailVerified === 1;
}

export function registerOrderRoutes(app: Hono<any>) {
  app.get('/api/health', async (c) => {
    try {
      await db.prepare('SELECT 1').get();
      return c.json({ ok: true, service: 'ler-api' });
    } catch {
      return c.json({ ok: false, service: 'ler-api' }, 503);
    }
  });

  app.get('/api/meta', async (c) => {
    const user = await sessionUser(c);
    return c.json({
      payments: config.payments.mode,
      currency: CURRENCY,
      assistant: { enabled: config.assistant.enabled, model: config.assistant.model },
      emailVerification: config.requireVerification,
      emailVerified: user?.emailVerified ?? false,
      signedIn: Boolean(user),
      isAdmin: await isAdminUser(user),
    });
  });

  app.get('/api/stock/:slug', async (c) => c.json({ available: await availableFor(c.req.param('slug')) }));

  app.post('/api/orders', async (c) => {
    if (await limited(c, 'orders', config.orderRateLimit.max, config.orderRateLimit.windowMs)) {
      recordEvent('order_rate_limited', clientIp(c));
      return c.json({ error: 'Too many orders. Please try again in a few minutes.' }, 429);
    }

    let body: Record<string, unknown>;
    try {
      body = (await c.req.json()) as Record<string, unknown>;
    } catch {
      return c.json({ error: 'Could not read that order.' }, 400);
    }

    if (
      fieldTooLong(body.email, 200) ||
      fieldTooLong(body.name, 120) ||
      fieldTooLong(body.address, 220) ||
      fieldTooLong(body.city, 160) ||
      fieldTooLong(body.country, 80)
    ) {
      return c.json({ error: 'One of those details is too long. Please shorten it and try again.' }, 400);
    }

    const user = await sessionUser(c);
    const email = (user?.email ?? text(body.email, 200)).toLowerCase();
    const name = text(body.name, 120);
    const address = text(body.address, 220);
    const city = text(body.city, 160);
    const country = text(body.country, 80);

    if (!EMAIL.test(email)) return c.json({ error: 'Enter a valid email address.' }, 400);
    if (!name) return c.json({ error: 'Enter the name for the order.' }, 400);
    if (!address || !city || !country) return c.json({ error: 'Enter a delivery address.' }, 400);

    const idempotencyKey = c.req.header('idempotency-key')?.trim() ?? '';
    if (idempotencyKey && !/^[A-Za-z0-9_-]{16,80}$/.test(idempotencyKey)) {
      return c.json({ error: 'Invalid order reference. Refresh the page and try again.' }, 400);
    }
    if (idempotencyKey) {
      const prior = (await db
        .prepare('SELECT * FROM orders WHERE idempotency_key = ?')
        .get(idempotencyKey)) as OrderRow | undefined;
      if (prior) {
        if (prior.user_id !== (user?.id ?? null) || prior.email !== email) {
          return c.json({ error: 'That order reference belongs to a different order.' }, 409);
        }
        return c.json(serialize(prior), 200);
      }
    }

    const shipping: ShippingMethod = body.shipping === 'express' ? 'express' : 'standard';
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) return c.json({ error: 'Your bag is empty.' }, 400);
    if (rawItems.length > MAX_ORDER_LINES) {
      return c.json({ error: 'That bag is too large for one order.' }, 400);
    }

    const items: OrderItem[] = [];
    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object') return c.json({ error: 'Invalid bag item.' }, 400);
      const candidate = raw as Record<string, unknown>;
      const product = getProduct(text(candidate.slug, 120));
      if (!product) return c.json({ error: 'One of those pieces is no longer available.' }, 400);

      const qty = Math.floor(Number(candidate.qty));
      if (!Number.isFinite(qty) || qty < 1 || qty > MAX_LINE_QTY) {
        return c.json({ error: `Choose a quantity between 1 and ${MAX_LINE_QTY}.` }, 400);
      }

      const submitted =
        candidate.options && typeof candidate.options === 'object'
          ? (candidate.options as Record<string, unknown>)
          : {};
      const chosen: Record<string, string> = {};
      for (const option of product.options) {
        const value = submitted[option.name];
        chosen[option.name] =
          typeof value === 'string' && option.values.includes(value) ? value : option.values[0];
      }
      const optionText = Object.entries(chosen)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' · ');

      const existing = items.find((item) => item.slug === product.slug && item.options === optionText);
      if (existing) {
        if (existing.qty + qty > MAX_LINE_QTY) {
          return c.json({ error: 'That quantity is too large for one order.' }, 400);
        }
        existing.qty += qty;
        continue;
      }

      items.push({
        slug: product.slug,
        name: product.name,
        price: product.price,
        image: product.image,
        qty,
        options: optionText,
      });
    }

    try {
      await reserveStock(items);
    } catch (problem) {
      return c.json({ error: problem instanceof Error ? problem.message : 'That piece is out of stock.' }, 409);
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const { shippingCost, total } = totalsFor(subtotal, shipping);
    const id = randomUUID();
    const accessToken = randomBytes(24).toString('hex');
    const createdAt = Date.now();
    const status: Status = config.payments.mode === 'stripe' ? 'awaiting_payment' : 'confirmed';
    const shippingLabel =
      shipping === 'express' ? 'Express, 1–2 working days' : 'Standard, 2–3 working days';

    let row: OrderRow;
    try {
      const number = await orderNumber(id);
      await db.prepare(
        `INSERT INTO orders
          (id, public_id, number, user_id, email, name, address, city, country, shipping,
           status, subtotal_cents, shipping_cents, total_cents, items, idempotency_key,
           access_token, payment_intent_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      ).run(
        id,
        id,
        number,
        user?.id ?? null,
        email,
        name,
        address,
        city,
        country,
        shippingLabel,
        status,
        toCents(subtotal),
        toCents(shippingCost),
        toCents(total),
        JSON.stringify(items),
        idempotencyKey || null,
        accessToken,
        createdAt,
      );
      row = (await db.prepare('SELECT * FROM orders WHERE id = ?').get(id)) as OrderRow;
    } catch (error) {
      await releaseStock(items);
      console.error('[orders] insert failed', error);
      return c.json({ error: 'The order could not be saved. Please try again.' }, 500);
    }

    let checkoutUrl: string | undefined;
    let receiptSent = false;
    if (config.payments.mode === 'stripe') {
      try {
        const session = await createCheckoutSession({
          orderId: id,
          email,
          accessToken,
          lines: items.map((item) => ({
            name: item.name,
            unitAmountCents: toCents(item.price),
            qty: item.qty,
          })),
        });
        checkoutUrl = session.url;
      } catch {
        await db.prepare('DELETE FROM orders WHERE id = ?').run(id);
        await releaseStock(items);
        return c.json({ error: 'The payment page could not be opened. Please try again.' }, 502);
      }
    } else {
      // Demo checkout is immediate: turn the reservation into a sale.
      await commitStock(items);
      try {
        await sendReceipt({
          to: email,
          name,
          number: row.number,
          total: formatPrice(total),
          orderUrl: `${config.publicUrl}/order/confirmed?id=${row.public_id}&token=${accessToken}`,
        });
        receiptSent = true;
      } catch (error) {
        console.error('[orders] receipt failed', error);
      }
    }

    recordEvent('order_placed', row.number, email);
    return c.json({ ...serialize(row), checkoutUrl, receiptSent }, 201);
  });

  app.get('/api/orders', async (c) => {
    const user = await sessionUser(c);
    if (!user) return c.json({ error: 'Sign in to see your orders.' }, 401);

    const rows = (await db
      .prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
      .all(user.id)) as unknown as OrderRow[];
    return c.json({ orders: rows.map(serialize) });
  });

  app.get('/api/orders/:id', async (c) => {
    const row = (await db
      .prepare('SELECT * FROM orders WHERE public_id = ?')
      .get(c.req.param('id'))) as unknown as OrderRow | undefined;

    if (!row) return c.json({ error: 'That order could not be found.' }, 404);

    if (row.user_id) {
      const user = await sessionUser(c);
      if (!user || user.id !== row.user_id) {
        return c.json({ error: 'Sign in to view this order.' }, 403);
      }
    } else if (!tokenMatches(c.req.query('token'), row.access_token)) {
      return c.json({ error: 'Use the order link from your receipt.' }, 403);
    }

    return c.json(serialize(row));
  });

  app.post('/api/newsletter', async (c) => {
    if (await limited(c, 'newsletter', 5, 60 * 60 * 1000)) {
      return c.json({ error: 'Too many signups. Try again later.' }, 429);
    }
    let body: Record<string, unknown>;
    try {
      body = (await c.req.json()) as Record<string, unknown>;
    } catch {
      return c.json({ error: 'Could not read that address.' }, 400);
    }
    const email = text(body.email, 200).toLowerCase();
    if (!EMAIL.test(email)) return c.json({ error: 'Enter a valid email address.' }, 400);
    const source = body.source === 'checkout' ? 'checkout' : 'footer';

    await db.prepare(
      'INSERT INTO subscribers (email, source, created_at) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING',
    ).run(email, source, Date.now());
    recordEvent('newsletter_signup', source, email);
    return c.json({ ok: true }, 201);
  });

  app.get('/api/admin/orders', async (c) => {
    const user = await sessionUser(c);
    if (!await isAdminUser(user)) {
      recordEvent('admin_denied', c.req.path);
      return c.json({ error: 'Not found.' }, 404);
    }
    if (await limited(c, 'admin', 120, 60 * 1000)) return c.json({ error: 'Too many requests.' }, 429);

    const status = c.req.query('status');
    const rows = (
      status && STATUSES.includes(status as Status)
        ? await db
            .prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT 100')
            .all(status)
        : await db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 100').all()
    ) as unknown as OrderRow[];
    return c.json({ orders: rows.map(serialize) });
  });

  app.patch('/api/admin/orders/:id', async (c) => {
    const user = await sessionUser(c);
    if (!await isAdminUser(user)) {
      recordEvent('admin_denied', c.req.path);
      return c.json({ error: 'Not found.' }, 404);
    }
    if (await limited(c, 'admin', 120, 60 * 1000)) return c.json({ error: 'Too many requests.' }, 429);
    let body: Record<string, unknown>;
    try {
      body = (await c.req.json()) as Record<string, unknown>;
    } catch {
      return c.json({ error: 'Could not read that update.' }, 400);
    }
    const status = body.status;
    if (typeof status !== 'string' || !STATUSES.includes(status as Status)) {
      return c.json({ error: 'Unknown status.' }, 400);
    }
    const result = await db
      .prepare('UPDATE orders SET status = ? WHERE public_id = ?')
      .run(status, c.req.param('id'));
    if (!result.changes) return c.json({ error: 'That order could not be found.' }, 404);
    recordEvent('order_status_changed', status, user?.email);
    return c.json({ ok: true });
  });

  app.post('/api/admin/orders/:id/refund', async (c) => {
    const user = await sessionUser(c);
    if (!await isAdminUser(user)) {
      recordEvent('admin_denied', c.req.path);
      return c.json({ error: 'Not found.' }, 404);
    }
    if (await limited(c, 'admin', 120, 60 * 1000)) return c.json({ error: 'Too many requests.' }, 429);
    const row = (await db
      .prepare('SELECT * FROM orders WHERE public_id = ?')
      .get(c.req.param('id'))) as unknown as OrderRow | undefined;
    if (!row) return c.json({ error: 'That order could not be found.' }, 404);
    if (!['paid', 'packed', 'shipped'].includes(row.status)) {
      return c.json({ error: 'Only a paid order can be refunded.' }, 400);
    }
    if (config.payments.mode === 'stripe') {
      if (!row.payment_intent_id) return c.json({ error: 'That order has no payment to refund.' }, 400);
      try {
        await refundPayment(row.payment_intent_id, row.public_id);
      } catch (problem) {
        return c.json(
          { error: problem instanceof Error ? problem.message : 'The refund could not be made.' },
          502,
        );
      }
    }
    await markRefunded(row.public_id);
    recordEvent('refund_issued', row.number, user?.email);
    return c.json({ ok: true });
  });
}
