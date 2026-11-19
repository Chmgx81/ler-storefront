import type { Hono } from 'hono';
import { auth } from './auth';
import { config } from './config';
import { db, recordEvent } from './db';
import { findOrderByPublicId, markCancelled, markPaid, markRefunded } from './order-status';
import { refundPayment, retrieveCheckoutSession, verifyStripeEvent, type StripeEvent } from './payments';
import { serialize, type OrderRow } from './orders';

async function rememberEvent(event: StripeEvent, orderId: string) {
  await db.prepare('INSERT INTO payment_events (id, type, order_id, created_at) VALUES (?, ?, ?, ?)').run(
    event.id,
    event.type,
    orderId || null,
    Date.now(),
  );
}

export function registerPaymentRoutes(app: Hono<any>) {
  /** Stripe sends no cookies and no Origin: the signature is the only authority here. */
  app.post('/api/payments/stripe/webhook', async (c) => {
    if (config.payments.mode !== 'stripe') return c.json({ error: 'Not configured.' }, 404);

    const raw = await c.req.raw.text();
    let event: StripeEvent;
    try {
      event = verifyStripeEvent(raw, c.req.header('stripe-signature') ?? null);
    } catch {
      recordEvent('webhook_signature_invalid', 'forged or malformed webhook');
      return c.json({ error: 'Invalid signature.' }, 400);
    }

    if (await db.prepare('SELECT 1 FROM payment_events WHERE id = ?').get(event.id)) {
      return c.json({ received: true });
    }

    const object = event.data.object;
    const metadata = object.metadata as Record<string, string> | undefined;
    const orderId = typeof metadata?.order_id === 'string' ? metadata.order_id : '';

    try {
      if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
        if (object.payment_status === 'paid' && orderId) {
          const intent = String(object.payment_intent ?? '');
          const captured = await markPaid(orderId, intent);
          if (!captured) {
            const existing = await findOrderByPublicId(orderId);
            if (existing?.status === 'cancelled' && intent) {
              // The session outlived the stock hold: refund rather than ship something we may have sold.
              try {
                await refundPayment(intent, orderId);
                await db.prepare('UPDATE orders SET status = ?, payment_intent_id = ? WHERE id = ?').run(
                  'refunded',
                  intent,
                  existing.id,
                );
                recordEvent('late_payment_refunded', existing.number, existing.email);
              } catch (error) {
                console.error('[payments] late payment refund failed', orderId, error);
                recordEvent('late_payment_needs_manual_refund', existing.number, existing.email);
              }
            }
          }
        }
      } else if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
        if (orderId) await markCancelled(orderId);
      } else if (event.type === 'charge.refunded') {
        const intent = typeof object.payment_intent === 'string' ? object.payment_intent : '';
        const row = (await db
          .prepare('SELECT public_id FROM orders WHERE payment_intent_id = ?')
          .get(intent)) as { public_id: string } | undefined;
        if (row) await markRefunded(row.public_id);
      }
      await rememberEvent(event, orderId);
    } catch (error) {
      console.error('[payments] webhook handling failed', event.id, error);
      return c.json({ error: 'The event could not be processed.' }, 500);
    }

    return c.json({ received: true });
  });

  /** Browser return from Stripe Checkout: confirms payment even if the webhook is late. */
  app.get('/api/payments/return', async (c) => {
    if (config.payments.mode !== 'stripe') return c.json({ error: 'Not configured.' }, 404);
    const orderId = c.req.query('order');
    const sessionId = c.req.query('session');
    const token = c.req.query('token');
    if (!orderId || !sessionId) return c.json({ error: 'That return link is incomplete.' }, 400);

    const row = await findOrderByPublicId(orderId);
    if (!row) return c.json({ error: 'That order could not be found.' }, 404);

    let authorized = Boolean(token && row.access_token === token);
    if (!authorized) {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      authorized = Boolean(session && row.user_id === session.user.id);
    }
    if (!authorized) return c.json({ error: 'That return link is not valid.' }, 403);

    let payment;
    try {
      payment = await retrieveCheckoutSession(sessionId);
    } catch (problem) {
      return c.json(
        { error: problem instanceof Error ? problem.message : 'The payment could not be checked.' },
        502,
      );
    }
    if (payment.metadata?.order_id !== orderId) {
      return c.json({ error: 'That payment belongs to a different order.' }, 400);
    }

    if (payment.payment_status === 'paid') {
      await markPaid(orderId, String(payment.payment_intent ?? ''));
      const updated = (await findOrderByPublicId(orderId)) as OrderRow;
      return c.json({ status: 'paid', order: serialize(updated) });
    }
    return c.json({ status: 'pending' });
  });
}
