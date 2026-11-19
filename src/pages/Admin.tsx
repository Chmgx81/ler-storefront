import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../data/products';
import { fetchAdminOrders, refundOrder, setOrderStatus } from '../lib/orders';
import type { Order } from '../types';
import { ArrowRight } from '../components/Icons';

const STATUSES = ['awaiting_payment', 'confirmed', 'paid', 'packed', 'shipped', 'cancelled', 'refunded'];

const canRefund = (status?: Order['status']) => ['paid', 'packed', 'shipped'].includes(status ?? '');

export default function Admin() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    let alive = true;
    fetchAdminOrders()
      .then((next) => {
        if (alive) setOrders(next);
      })
      .catch((problem: Error) => {
        if (alive) setError(problem.message);
      });
    return () => {
      alive = false;
    };
  }, []);

  const refund = async (order: Order) => {
    if (!window.confirm(`Refund ${order.number ?? order.id}? This cannot be undone.`)) return;
    setBusyId(order.id);
    setError('');
    try {
      await refundOrder(order.id);
      setOrders((current) =>
        current?.map((item) => (item.id === order.id ? { ...item, status: 'refunded' } : item)) ?? null,
      );
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That refund could not be made.');
    } finally {
      setBusyId('');
    }
  };

  const update = async (order: Order, status: string) => {
    setBusyId(order.id);
    setError('');
    try {
      await setOrderStatus(order.id, status);
      setOrders((current) =>
        current?.map((item) => (item.id === order.id ? { ...item, status: status as Order['status'] } : item)) ?? null,
      );
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That status could not be saved.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <main id="top" className="checkout-page admin-page">
      <div className="container">
        <header className="checkout-head">
          <h1>Order ledger</h1>
          <p>A read-only view of recent orders for studio accounts. Status changes are saved to the database.</p>
        </header>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {!orders && !error && <p className="muted">Opening the ledger…</p>}

        {orders && orders.length === 0 && (
          <div className="account-empty">
            <h3>No orders yet.</h3>
            <p>Orders will appear here as they are placed.</p>
          </div>
        )}

        {orders && orders.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Placed</th>
                  <th>Customer</th>
                  <th>Pieces</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.number ?? order.id.slice(0, 8)}</strong>
                      <span className="admin-sub">{order.email}</span>
                    </td>
                    <td>
                      {order.placedAt
                        ? new Intl.DateTimeFormat('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(order.placedAt))
                        : '—'}
                    </td>
                    <td>{order.name}</td>
                    <td>{order.items.reduce((n, item) => n + item.qty, 0)}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td>
                      <select
                        aria-label={`Status for ${order.number ?? order.id}`}
                        value={order.status ?? 'confirmed'}
                        disabled={busyId === order.id}
                        onChange={(event) => update(order, event.target.value)}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      {canRefund(order.status) && (
                        <button
                          type="button"
                          className="link-quiet admin-refund"
                          disabled={busyId === order.id}
                          onClick={() => refund(order)}
                        >
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="admin-foot">
          <Link to="/account" className="link-arrow">
            Back to your account <ArrowRight />
          </Link>
        </p>
      </div>
    </main>
  );
}
