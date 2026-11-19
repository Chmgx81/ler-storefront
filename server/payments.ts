import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config';

const API = 'https://api.stripe.com/v1';

type Line = { name: string; unitAmountCents: number; qty: number };

type StripeError = { error?: { message?: string; code?: string } };

async function stripePost(path: string, params: URLSearchParams, idempotencyKey?: string) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.payments.stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: params,
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json()) as StripeError & Record<string, unknown>;
  if (!response.ok) {
    console.error('[stripe] request failed', path, response.status, body.error?.code);
    throw new Error(body.error?.message || `Payment provider returned ${response.status}`);
  }
  return body;
}

export async function createCheckoutSession(input: {
  orderId: string;
  email: string;
  accessToken: string;
  lines: Line[];
}): Promise<{ id: string; url: string }> {
  const params = new URLSearchParams({
    mode: 'payment',
    customer_email: input.email,
    success_url: `${config.publicUrl}/payment/return?order=${encodeURIComponent(input.orderId)}&session={CHECKOUT_SESSION_ID}&token=${input.accessToken}`,
    cancel_url: `${config.publicUrl}/checkout?cancelled=1`,
    'metadata[order_id]': input.orderId,
    'payment_intent_data[metadata][order_id]': input.orderId,
    // Match the 30-minute stock reservation so a late payment cannot find a cancelled order.
    'expires_at': String(Math.floor(Date.now() / 1000) + 30 * 60),
  });
  input.lines.forEach((line, index) => {
    params.set(`line_items[${index}][price_data][currency]`, 'usd');
    params.set(`line_items[${index}][price_data][unit_amount]`, String(line.unitAmountCents));
    params.set(`line_items[${index}][price_data][product_data][name]`, line.name);
    params.set(`line_items[${index}][quantity]`, String(line.qty));
  });

  const session = await stripePost('/checkout/sessions', params, `order-${input.orderId}`);
  if (typeof session.id !== 'string' || typeof session.url !== 'string') {
    throw new Error('The payment session was incomplete. Try again.');
  }
  return { id: session.id, url: session.url };
}

export async function retrieveCheckoutSession(id: string) {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) throw new Error('Invalid payment session.');
  const response = await fetch(`${API}/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${config.payments.stripeKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json()) as StripeError & Record<string, unknown>;
  if (!response.ok) throw new Error(body.error?.message || 'The payment session could not be checked.');
  return body as {
    id: string;
    payment_status: string;
    payment_intent?: string | null;
    metadata?: Record<string, string>;
  };
}

export async function refundPayment(paymentIntentId: string, orderId: string) {
  if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) throw new Error('This order has no payment to refund.');
  const params = new URLSearchParams({
    'payment_intent': paymentIntentId,
    'reason': 'requested_by_customer',
    'metadata[order_id]': orderId,
  });
  return stripePost('/refunds', params, `refund-${orderId}`);
}

export type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};

/** Verifies Stripe's signature before any event data is trusted. */
export function verifyStripeEvent(rawBody: string, signature: string | null): StripeEvent {
  if (!signature) throw new Error('Missing payment signature.');
  const timestamp = signature.match(/(?:^|,)t=(\d+)/)?.[1];
  const hashes = [...signature.matchAll(/(?:^|,)v1=([a-f0-9]+)/g)].map((match) => match[1]);
  if (!timestamp || !hashes.length) throw new Error('Invalid payment signature.');
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error('Stale payment signature.');

  const expected = createHmac('sha256', config.payments.stripeWebhookSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
  const valid = hashes.some((hash) => {
    const a = Buffer.from(expected);
    const b = Buffer.from(hash);
    return a.length === b.length && timingSafeEqual(a, b);
  });
  if (!valid) throw new Error('Invalid payment signature.');

  const parsed = JSON.parse(rawBody) as StripeEvent;
  if (!parsed?.id || !parsed?.type || !parsed?.data?.object) throw new Error('Invalid payment event.');
  return parsed;
}
