import type { Order } from '../types';

type PlaceOrderInput = {
  email: string;
  name: string;
  address: string;
  city: string;
  country: string;
  shipping: 'standard' | 'express';
  items: { slug: string; qty: number; options: Record<string, string> }[];
};

export type StoreMeta = {
  payments: 'demo' | 'stripe';
  currency: string;
  emailVerification: boolean;
  emailVerified: boolean;
  signedIn: boolean;
  isAdmin: boolean;
};

async function readError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || fallback;
  } catch {
    return fallback;
  }
}

async function request<T>(url: string, init?: RequestInit, fallback = 'Something went wrong. Please try again.'): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: 'same-origin', ...init });
  } catch {
    throw new Error('The studio could not be reached. Check your connection and try again.');
  }
  if (!response.ok) throw new Error(await readError(response, fallback));
  return (await response.json()) as T;
}

export function placeOrder(input: PlaceOrderInput, idempotencyKey: string): Promise<Order> {
  return request<Order>(
    '/api/orders',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(input),
    },
    'The order could not be placed. Try again.',
  );
}

export function fetchOrder(id: string, token?: string): Promise<Order> {
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return request<Order>(`/api/orders/${encodeURIComponent(id)}${query}`, undefined, 'That order could not be found.');
}

export function fetchPaymentReturn(order: string, session: string, token: string) {
  const query = new URLSearchParams({ order, session, token });
  return request<{ status: 'paid' | 'pending'; order?: Order }>(
    `/api/payments/return?${query}`,
    undefined,
    'Your payment could not be checked.',
  );
}

export function fetchStock(slug: string) {
  return request<{ available: number }>(`/api/stock/${encodeURIComponent(slug)}`);
}

export function fetchOrders(): Promise<Order[]> {
  return request<{ orders: Order[] }>('/api/orders', undefined, 'Your orders could not be loaded.').then(
    (body) => body.orders,
  );
}

export function fetchMeta(): Promise<StoreMeta> {
  return request<StoreMeta>('/api/meta');
}

export async function subscribe(email: string, source: 'footer' | 'checkout') {
  await request<{ ok: boolean }>(
    '/api/newsletter',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source }),
    },
    'That address could not be saved.',
  );
}

export async function fetchAdminOrders(): Promise<Order[]> {
  const body = await request<{ orders: Order[] }>('/api/admin/orders', undefined, 'Orders could not be loaded.');
  return body.orders;
}

export async function refundOrder(id: string) {
  await request<{ ok: boolean }>(
    `/api/admin/orders/${encodeURIComponent(id)}/refund`,
    { method: 'POST' },
    'That refund could not be made.',
  );
}

export async function setOrderStatus(id: string, status: string) {
  await request<{ ok: boolean }>(
    `/api/admin/orders/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    },
    'That status could not be saved.',
  );
}
