import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatPrice } from '../data/products';
import { useSession } from '../lib/auth';
import { fetchMeta, fetchOrder, type StoreMeta } from '../lib/orders';
import type { Order } from '../types';
import { ArrowRight, CheckIcon } from '../components/Icons';

const STATUS: Record<string, string> = {
  awaiting_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  paid: 'Paid',
  packed: 'Packed',
  shipped: 'On its way',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

function readOrder(): Order | null {
  try {
    const raw = sessionStorage.getItem('ler.lastOrder');
    return raw ? (JSON.parse(raw) as Order) : null;
  } catch {
    return null;
  }
}

export default function OrderConfirmed() {
  const [params] = useSearchParams();
  const id = params.get('id');
  const token = params.get('token') ?? '';
  const { data: session } = useSession();
  const [order, setOrder] = useState<Order | null>(readOrder);
  const [loading, setLoading] = useState(Boolean(id && readOrder()?.id !== id));
  const [error, setError] = useState('');
  const [meta, setMeta] = useState<StoreMeta | null>(null);

  useEffect(() => {
    let alive = true;
    fetchMeta()
      .then((next) => {
        if (alive) setMeta(next);
      })
      .catch(() => {
        /* copy falls back to demo */
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    if (!id) return;
    const cached = readOrder();
    if (cached?.id === id) {
      setOrder(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchOrder(id, token)
      .then((next) => {
        if (!alive) return;
        setOrder(next);
        try {
          sessionStorage.setItem('ler.lastOrder', JSON.stringify(next));
        } catch {
          /* optional cache */
        }
      })
      .catch((problem: Error) => {
        if (alive) setError(problem.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, token]);

  if (loading) {
    return (
      <main id="top" className="checkout-page">
        <div className="container empty-page">
          <h1>Finding your order</h1>
          <p>One moment while we open the studio ledger.</p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main id="top" className="checkout-page">
        <div className="container empty-page">
          <h1>No recent order</h1>
          <p>
            {error || 'We could not find an order in this browser. Your orders are kept in your account.'}
          </p>
          <div className="empty-actions">
            <Link to="/shop" className="btn">
              Shop the collection
            </Link>
            <Link to="/account" className="link-arrow">
              Open your account <ArrowRight />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const firstName = order.name.split(' ')[0];

  return (
    <main id="top" className="confirm-page">
      <div className="container confirm-inner">
        <div className="confirm-mark" aria-hidden="true">
          <CheckIcon />
        </div>
        <p className="confirm-kicker">Order {order.number ?? order.id}</p>
        <h1>
          Thank you,
          <br />
          {firstName}.
        </h1>
        {order.status === 'awaiting_payment' && (
          <p className="form-success" role="status">
            Your order is saved, but payment has not been confirmed yet. Check back in a moment.
          </p>
        )}
        <p className="confirm-lede">
          {order.status === 'awaiting_payment' ? (
            <>We are waiting for your payment provider to confirm this order.</>
          ) : order.receiptSent ? (
            <>
              A receipt is on its way to <strong>{order.email}</strong>. We will wrap your pieces by hand before
              they leave the studio.
            </>
          ) : (
            <>
              Your order is confirmed, with a copy saved under <strong>{order.email}</strong>. We will wrap it
              by hand before it leaves the studio.
            </>
          )}
        </p>

        <div className="confirm-grid">
          <section className="confirm-panel">
            <h2>Delivery</h2>
            <p>
              {order.shipping}
              {order.status ? ` · ${STATUS[order.status] ?? order.status}` : ''}
            </p>
            <p className="muted">
              {order.name}
              <br />
              {order.address}
              <br />
              {order.city}
              <br />
              {order.country}
            </p>
          </section>
          <section className="confirm-panel">
            <h2>What’s coming</h2>
            <ul className="confirm-items">
              {order.items.map((item) => (
                <li key={item.name + item.options}>
                  <img src={item.image} alt="" width="768" height="1376" />
                  <div>
                    <p>{item.name}</p>
                    <p className="muted">
                      {item.options ? `${item.options} · ` : ''}Qty {item.qty}
                    </p>
                  </div>
                  <span>{formatPrice(item.price * item.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="confirm-total">
              <span>Order total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </section>
        </div>

        <div className="confirm-actions">
          <Link to="/shop" className="btn">
            Continue shopping <ArrowRight />
          </Link>
          {session ? (
            <Link to="/account" className="link-arrow">
              View your orders <ArrowRight />
            </Link>
          ) : (
            <Link to="/story" className="link-arrow">
              Read how it’s made <ArrowRight />
            </Link>
          )}
        </div>

        <p className="confirm-foot">
          {meta?.payments === 'stripe'
            ? 'Payment is processed securely by Stripe. No card details are stored here.'
            : 'This was a demo checkout. No payment was taken and no order will ship.'}
        </p>
      </div>
    </main>
  );
}
