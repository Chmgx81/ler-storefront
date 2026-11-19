export type OrderItem = {
  slug?: string;
  name: string;
  price: number;
  image: string;
  qty: number;
  options: string;
};

export type Order = {
  id: string;
  number?: string;
  status?: 'awaiting_payment' | 'confirmed' | 'paid' | 'packed' | 'shipped' | 'cancelled' | 'refunded';
  receiptSent?: boolean;
  checkoutUrl?: string;
  accessToken?: string;
  paymentIntentId?: string;
  name: string;
  email: string;
  address: string;
  city: string;
  country: string;
  shipping: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  placedAt?: string;
};
