/** Shared money rules. The server uses this module too, so prices cannot drift. */
export const CURRENCY = 'USD';
export const FREE_SHIPPING_THRESHOLD = 120;
export const STANDARD_SHIPPING = 8;
export const EXPRESS_SHIPPING = 14;
export const MAX_LINE_QTY = 99;
export const MAX_ORDER_LINES = 50;

export type ShippingMethod = 'standard' | 'express';

export function shippingCostFor(method: ShippingMethod, subtotal: number) {
  if (method === 'express') return EXPRESS_SHIPPING;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
}

export function totalsFor(subtotal: number, method: ShippingMethod) {
  const shippingCost = shippingCostFor(method, subtotal);
  return { shippingCost, total: Math.round((subtotal + shippingCost) * 100) / 100 };
}

export const toCents = (dollars: number) => Math.round(dollars * 100);
export const fromCents = (cents: number) => cents / 100;
