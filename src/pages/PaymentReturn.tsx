import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchPaymentReturn } from '../lib/orders';
import { ArrowRight } from '../components/Icons';

export default function PaymentReturn() {
  const [params] = useSearchParams();
  const order = params.get('order') ?? '';
  const session = params.get('session') ?? '';
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current || !order || !session || !token) return;
    tried.current = true;

    const check = (n: number) => {
      fetchPaymentReturn(order, session, token)
        .then((result) => {
          if (result.status === 'paid' && result.order) {
            try {
              sessionStorage.setItem('ler.lastOrder', JSON.stringify(result.order));
            } catch {
              /* the database is the source of truth */
            }
            navigate(
              `/order/confirmed?id=${encodeURIComponent(order)}&token=${encodeURIComponent(token)}`,
              { replace: true },
            );
            return;
          }
          if (n < 3) {
            setAttempts(n + 1);
            window.setTimeout(() => check(n + 1), 1500);
            return;
          }
          setError('We have not received confirmation yet. Your order is safe; check your account shortly.');
        })
        .catch((problem: Error) => setError(problem.message));
    };

    check(0);
  }, [order, session, token, navigate]);

  if (!order || !session || !token) {
    return (
      <main id="top" className="checkout-page">
        <div className="container empty-page">
          <h1>That link is incomplete</h1>
          <p>Open the return link from your payment page, or find the order in your account.</p>
          <Link to="/account" className="btn">
            Open your account <ArrowRight />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="top" className="checkout-page">
      <div className="container empty-page">
        <h1>{error ? 'One moment…' : 'Confirming your payment'}</h1>
        <p>
          {error ||
            (attempts
              ? `Still checking with the payment provider (attempt ${attempts + 1} of 4).`
              : 'We are checking with the payment provider. This takes a few seconds.')}
        </p>
        {error && (
          <div className="empty-actions">
            <Link to="/account" className="btn">
              Check your orders <ArrowRight />
            </Link>
            <Link to="/shop" className="link-arrow">
              Back to the collection <ArrowRight />
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
