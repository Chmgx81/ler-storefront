import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckIcon } from '../components/Icons';
import { formatPrice } from '../data/products';
import { signIn, signOut, signUp, useSession } from '../lib/auth';
import { fetchMeta, fetchOrders } from '../lib/orders';
import type { StoreMeta } from '../lib/orders';
import AccountSecurity from '../components/AccountSecurity';
import type { Order } from '../types';

type Mode = 'signin' | 'create';

function messageFor(error: { code?: string; message?: string } | undefined) {
  switch (error?.code) {
    case 'INVALID_EMAIL_OR_PASSWORD':
      return 'That email and password do not match. Try again.';
    case 'USER_ALREADY_EXISTS':
      return 'An account with that email already exists. Sign in instead.';
    case 'PASSWORD_TOO_SHORT':
      return 'Use at least 8 characters for your password.';
    case 'INVALID_EMAIL':
      return 'Enter a valid email address.';
    case 'EMAIL_NOT_VERIFIED':
      return 'Verify your email first. Check your inbox for the link.';
    default:
      return error?.message || 'Something went wrong. Please try again.';
  }
}

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function AuthPanel({ next, notice }: { next: string | null; notice: string }) {
  const navigate = useNavigate();
  const { refetch } = useSession();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');

    const result =
      mode === 'signin'
        ? await signIn.email({ email, password })
        : await signUp.email({ name, email, password });

    if (result.error) {
      setError(messageFor(result.error));
      setBusy(false);
      return;
    }

    await refetch();
    if (next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')) navigate(next);
    setBusy(false);
  };

  return (
    <div className="auth-panel">
      <div className="auth-switch">
        <button
          type="button"
          className={mode === 'signin' ? 'is-active' : ''}
          aria-pressed={mode === 'signin'}
          onClick={() => {
            setMode('signin');
            setError('');
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === 'create' ? 'is-active' : ''}
          aria-pressed={mode === 'create'}
          onClick={() => {
            setMode('create');
            setError('');
          }}
        >
          Create account
        </button>
      </div>

      {notice && (
        <p className="form-success" role="status">
          {notice}
        </p>
      )}

      <h2>{mode === 'signin' ? 'Welcome back.' : 'A place for your pieces.'}</h2>
      <p className="auth-lede">
        {mode === 'signin'
          ? 'Sign in to see your orders and keep your details close.'
          : 'Create an account to keep your order history in one quiet place.'}
      </p>

      <form onSubmit={submit} className="auth-form">
        {mode === 'create' && (
          <div className="field">
            <label htmlFor="account-name">Name</label>
            <input
              id="account-name"
              name="name"
              autoComplete="name"
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="account-email">Email</label>
          <input
            id="account-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="account-password">Password</label>
          <input
            id="account-password"
            name="password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            aria-describedby={mode === 'create' ? 'password-hint' : undefined}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {mode === 'create' && (
            <p className="field-hint" id="password-hint">
              At least 8 characters.
            </p>
          )}
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-block" disabled={busy}>
          {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          {!busy && <ArrowRight />}
        </button>
      </form>

      <p className="auth-forgot">
        <Link to="/account/forgot">Forgot your password?</Link>
      </p>
      <p className="auth-note">
        Accounts and orders are stored in the studio database. Use a password you do not use elsewhere.
      </p>
    </div>
  );
}

const STATUS: Record<string, string> = {
  awaiting_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  paid: 'Paid',
  packed: 'Packed',
  shipped: 'On its way',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

function OrderCard({ order }: { order: Order }) {
  return (
    <article className="order-card">
      <header className="order-card-head">
        <div>
          <h3>{order.number ?? 'Order'}</h3>
          <p className="muted">
            {formatDate(order.placedAt)} · {order.items.reduce((n, item) => n + item.qty, 0)} pieces
          </p>
        </div>
        <div className="order-card-total">
          <p>{formatPrice(order.total)}</p>
          <span className="order-status">
            <span className="order-status-dot" aria-hidden="true" />
            {STATUS[order.status ?? 'confirmed'] ?? 'Confirmed'}
          </span>
        </div>
      </header>

      <ul className="order-card-items">
        {order.items.map((item) => (
          <li key={`${item.name}-${item.options}`}>
            <img src={item.image} alt="" width="768" height="1376" loading="lazy" />
            <div>
              <p className="order-item-name">{item.name}</p>
              <p className="muted">
                {item.options ? `${item.options} · ` : ''}Qty {item.qty}
              </p>
            </div>
            <span>{formatPrice(item.price * item.qty)}</span>
          </li>
        ))}
      </ul>

      <footer className="order-card-foot">
        <span>{order.shipping}</span>
        <span className="muted">Ships from Copenhagen</span>
      </footer>
    </article>
  );
}

function Dashboard({
  email,
  name,
  createdAt,
  emailVerified,
  emailVerification,
  isAdmin,
}: {
  email: string;
  name: string;
  createdAt: Date;
  emailVerified: boolean;
  emailVerification: boolean;
  isAdmin: boolean;
}) {
  const navigate = useNavigate();
  const { refetch } = useSession();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchOrders()
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

  const leave = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
    await refetch();
    navigate('/');
  };

  const firstName = name.trim().split(/\s+/)[0] || 'there';
  const memberSince = new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(createdAt);

  return (
    <main id="top" className="account-page">
      <div className="container">
        <header className="account-head">
          <div>
            <h1>Hello, {firstName}.</h1>
            <p className="account-email">{email}</p>
          </div>
          <button type="button" className="link-quiet" onClick={leave} disabled={signingOut}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </header>

        <div className="account-grid">
          <section className="account-orders" aria-labelledby="orders-title">
            <div className="account-section-head">
              <h2 id="orders-title">Your orders</h2>
              <span className="muted">
                {orders ? `${orders.length} ${orders.length === 1 ? 'order' : 'orders'}` : ''}
              </span>
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            {!orders && !error && (
              <div className="account-skeleton" aria-label="Loading orders">
                <span />
                <span />
                <span />
              </div>
            )}

            {orders && orders.length === 0 && (
              <div className="account-empty">
                <h3>No orders yet.</h3>
                <p>When you place an order, it will live here with everything you chose.</p>
                <Link to="/shop" className="link-arrow">
                  Shop the collection <ArrowRight />
                </Link>
              </div>
            )}

            {orders && orders.map((order) => <OrderCard key={order.id} order={order} />)}
          </section>

          <aside className="account-side">
            {emailVerification && !emailVerified && (
              <section className="account-panel verification-note">
                <h2>One more step</h2>
                <p className="account-panel-copy">
                  Verify {email} so you can always get back into your account.
                </p>
                <Link className="link-arrow small" to="/account">
                  Use the resend link in Security <ArrowRight />
                </Link>
              </section>
            )}

            {isAdmin && (
              <section className="account-panel">
                <h2>Studio</h2>
                <p className="account-panel-copy">The order ledger is available to studio accounts.</p>
                <Link className="link-arrow small" to="/admin">
                  Open order ledger <ArrowRight />
                </Link>
              </section>
            )}

            <section className="account-panel">
              <h2>Details</h2>
              <dl className="account-details">
                <div>
                  <dt>Name</dt>
                  <dd>{name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{email}</dd>
                </div>
                <div>
                  <dt>Member since</dt>
                  <dd>{memberSince}</dd>
                </div>
              </dl>
            </section>

            <section className="account-panel">
              <h2>Help</h2>
              <p className="account-panel-copy">
                A question about a piece or an order? Write to the studio and we will answer by hand.
              </p>
              <a className="link-arrow small" href="mailto:hello@ler.studio">
                hello@ler.studio <ArrowRight />
              </a>
            </section>

            <AccountSecurity
              name={name}
              email={email}
              emailVerified={emailVerified}
              emailVerification={emailVerification}
            />

            <section className="account-panel account-panel-quiet">
              <CheckIcon />
              <p>Orders are kept in your account, not in this browser.</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function Account() {
  const { data: session, isPending } = useSession();
  const [params] = useSearchParams();
  const location = useLocation();
  const next = params.get('next');
  const passwordChanged = (location.state as { passwordChanged?: boolean } | null)?.passwordChanged;
  const [meta, setMeta] = useState<StoreMeta | null>(null);

  useEffect(() => {
    let alive = true;
    fetchMeta()
      .then((nextMeta) => {
        if (alive) setMeta(nextMeta);
      })
      .catch(() => {
        /* defaults are safe */
      });
    return () => {
      alive = false;
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (session) window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [session]);

  if (isPending) {
    return (
      <main id="top" className="account-page">
        <div className="container account-loading">
          <p>Opening your account…</p>
        </div>
      </main>
    );
  }

  if (session) {
    return (
      <Dashboard
        email={session.user.email}
        name={session.user.name}
        createdAt={new Date(session.user.createdAt)}
        emailVerified={meta?.emailVerified ?? false}
        emailVerification={meta?.emailVerification ?? false}
        isAdmin={meta?.isAdmin ?? false}
      />
    );
  }

  return (
    <main id="top" className="account-page">
      <div className="container account-shell">
        <section className="account-aside">
          <h1>Your pieces, kept together.</h1>
          <p>
            An account keeps your orders and details in one place. No noise, no points, no scheme. Just a
            record of what you have chosen.
          </p>
          <ul className="account-points">
            <li>
              <CheckIcon />
              Order history, kept in the studio ledger
            </li>
            <li>
              <CheckIcon />
              Your name and address remembered at checkout
            </li>
            <li>
              <CheckIcon />
              A record you can return to, from any browser
            </li>
          </ul>
        </section>

        <AuthPanel next={next} notice={passwordChanged ? 'Password saved. Sign in with your new password.' : ''} />
      </div>
    </main>
  );
}
