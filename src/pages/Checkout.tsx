import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatPrice, getProduct } from '../data/products';
import { useSession } from '../lib/auth';
import { useCart } from '../lib/cart';
import { fetchMeta, placeOrder, subscribe, type StoreMeta } from '../lib/orders';
import { shippingCostFor, type ShippingMethod } from '../lib/pricing';
import { ArrowRight, CheckIcon } from '../components/Icons';

export default function Checkout() {
  const { lines, subtotal, clear, open } = useCart();
  const { data: session } = useSession();
  const [shipping, setShipping] = useState<ShippingMethod>('standard');
  const [processing, setProcessing] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [meta, setMeta] = useState<StoreMeta | null>(null);
  const [card, setCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [params] = useSearchParams();
  const cancelled = params.get('cancelled') === '1';
  const errorRef = useRef<HTMLParagraphElement>(null);
  const idempotencyKey = useRef(crypto.randomUUID());
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    fetchMeta()
      .then((next) => {
        if (alive) setMeta(next);
      })
      .catch(() => {
        /* the safe default is demo copy */
      });
    return () => {
      alive = false;
    };
  }, []);

  const stripe = meta?.payments === 'stripe';

  const shippingCost = shippingCostFor(shipping, subtotal);
  const total = subtotal + shippingCost;
  const [accountFirst = '', ...accountRest] = (session?.user.name ?? '').split(' ');
  const accountLast = accountRest.join(' ');

  const submitOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (processing || lines.length === 0) return;
    setProcessing(true);
    setSubmitError('');

    const data = new FormData(e.currentTarget);

    try {
      const order = await placeOrder(
        {
        email: String(data.get('email') ?? ''),
        name: `${data.get('firstName') ?? ''} ${data.get('lastName') ?? ''}`.trim(),
        address: `${data.get('address') ?? ''}${data.get('apt') ? `, ${data.get('apt')}` : ''}`,
        city: `${data.get('city') ?? ''}, ${data.get('region') ?? ''} ${data.get('postcode') ?? ''}`.trim(),
        country: String(data.get('country') ?? ''),
        shipping,
        items: lines.map((line) => ({ slug: line.slug, qty: line.qty, options: line.options })),
        },
        idempotencyKey.current,
      );

      if (data.get('news') === 'on') {
        void subscribe(String(data.get('email') ?? ''), 'checkout').catch(() => {
          /* the order is already saved; the newsletter is best-effort */
        });
      }

      try {
        sessionStorage.setItem('ler.lastOrder', JSON.stringify(order));
      } catch {
        /* the database is the source of truth */
      }
      clear();
      if (order.checkoutUrl) {
        window.location.assign(order.checkoutUrl);
        return;
      }
      navigate(`/order/confirmed?id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.accessToken ?? '')}`);
    } catch (problem) {
      setSubmitError(problem instanceof Error ? problem.message : 'The order could not be placed.');
      setProcessing(false);
      requestAnimationFrame(() => errorRef.current?.scrollIntoView({ block: 'center' }));
    }
  };

  if (lines.length === 0) {
    return (
      <main id="top" className="checkout-page">
        <div className="container empty-page">
          <h1>Your bag is empty</h1>
          <p>Add a piece or two and come back. We’ll keep the kettle on.</p>
          <Link to="/shop" className="btn">
            Shop the collection
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="top" className="checkout-page">
      <div className="container">
        {cancelled && (
          <p className="checkout-cancelled" role="status">
            Payment was cancelled. Your bag is exactly as you left it.
          </p>
        )}

        <header className="checkout-head" data-reveal>
          <h1>Checkout</h1>
          <p>
            {stripe
              ? 'You will continue to our secure payment page. Card details are handled by Stripe, never by this site.'
              : 'A demo checkout. No payment is taken and nothing ships. Orders are saved so you can find them again.'}
          </p>
        </header>

        <p className="checkout-account">
          {session ? (
            <>
              Signed in as <strong>{session.user.email}</strong>. This order will appear in{' '}
              <Link to="/account">your account</Link>.
            </>
          ) : (
            <>
              <Link to="/account?next=/checkout">Sign in</Link> to keep this order in your account, or check
              out as a guest.
            </>
          )}
        </p>

        <form
          id="checkout-form"
          className="checkout-grid"
          onSubmit={submitOrder}
          key={session?.user.id ?? 'guest'}
        >
          <div className="checkout-form">
            <section className="form-section">
              <h2>Contact</h2>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={200}
                  placeholder="you@example.com"
                  defaultValue={session?.user.email ?? ''}
                  readOnly={Boolean(session)}
                  aria-describedby={session ? 'checkout-email-note' : undefined}
                />
                {session && (
                  <p className="field-hint" id="checkout-email-note">
                    Your receipt goes to your account email.
                  </p>
                )}
              </div>
              <label className="check-line">
                <input type="checkbox" name="news" defaultChecked />
                <span>Send me notes from the studio, once a month.</span>
              </label>
            </section>

            <section className="form-section">
              <h2>Shipping address</h2>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="firstName">First name</label>
                  <input
                    id="firstName"
                    name="firstName"
                    autoComplete="given-name"
                    required
                    defaultValue={accountFirst}
                  />
                </div>
                <div className="field">
                  <label htmlFor="lastName">Last name</label>
                  <input
                    id="lastName"
                    name="lastName"
                    autoComplete="family-name"
                    required
                    defaultValue={accountLast}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="address">Address</label>
                <input id="address" name="address" autoComplete="street-address" required maxLength={220} placeholder="Strandgade 24" />
              </div>
              <div className="field">
                <label htmlFor="apt">
                  Apartment, suite <span className="optional">(optional)</span>
                </label>
                <input id="apt" name="apt" autoComplete="address-line2" maxLength={80} />
              </div>
              <div className="field-row three">
                <div className="field">
                  <label htmlFor="city">City</label>
                  <input id="city" name="city" autoComplete="address-level2" required maxLength={160} placeholder="Copenhagen" />
                </div>
                <div className="field">
                  <label htmlFor="region">Region</label>
                  <input id="region" name="region" autoComplete="address-level1" required maxLength={80} placeholder="Capital Region" />
                </div>
                <div className="field">
                  <label htmlFor="postcode">Postcode</label>
                  <input id="postcode" name="postcode" autoComplete="postal-code" required maxLength={24} placeholder="1060" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="country">Country</label>
                <select id="country" name="country" autoComplete="country-name" required defaultValue="Denmark">
                  <option>Denmark</option>
                  <option>Sweden</option>
                  <option>Norway</option>
                  <option>Germany</option>
                  <option>Netherlands</option>
                  <option>United Kingdom</option>
                  <option>United States</option>
                  <option>Canada</option>
                  <option>France</option>
                  <option>Japan</option>
                </select>
              </div>
            </section>

            <section className="form-section">
              <h2>Shipping method</h2>
              <div className="ship-choices">
                <label className={`ship-choice${shipping === 'standard' ? ' is-active' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    value="standard"
                    checked={shipping === 'standard'}
                    onChange={() => setShipping('standard')}
                  />
                  <span className="radio-mark" aria-hidden="true" />
                  <span className="ship-choice-copy">
                    <span>Standard</span>
                    <span className="ship-choice-sub">2–3 working days</span>
                  </span>
                  <span className="ship-choice-price">{shippingCostFor('standard', subtotal) === 0 ? 'Free' : '$8'}</span>
                </label>
                <label className={`ship-choice${shipping === 'express' ? ' is-active' : ''}`}>
                  <input
                    type="radio"
                    name="shipping"
                    value="express"
                    checked={shipping === 'express'}
                    onChange={() => setShipping('express')}
                  />
                  <span className="radio-mark" aria-hidden="true" />
                  <span className="ship-choice-copy">
                    <span>Express</span>
                    <span className="ship-choice-sub">1–2 working days</span>
                  </span>
                  <span className="ship-choice-price">$14</span>
                </label>
              </div>
            </section>

            <section className="form-section">
              <div className="form-section-head">
                <h2>Payment</h2>
                <span className="secure-note">{stripe ? 'Secured by Stripe' : 'Demo only'}</span>
              </div>
              {stripe ? (
                <p className="payment-note">
                  The next step takes you to Stripe’s secure checkout. Your card details are entered there,
                  never on this site. We only receive confirmation of payment.
                </p>
              ) : (
                <>
                  <div className="field">
                    <label htmlFor="card">Card number</label>
                    <input
                      id="card"
                      name="card"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      required
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                      pattern="[0-9 ]{12,19}"
                      value={card}
                      onChange={(event) =>
                        setCard(
                          event.target.value
                            .replace(/\D/g, '')
                            .slice(0, 16)
                            .replace(/(.{4})/g, '$1 ')
                            .trim(),
                        )
                      }
                    />
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label htmlFor="expiry">Expiry</label>
                      <input
                        id="expiry"
                        name="expiry"
                        required
                        placeholder="MM / YY"
                        maxLength={7}
                        pattern="(0[1-9]|1[0-2])\s*/\s*[0-9]{2,4}"
                        inputMode="numeric"
                        value={expiry}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
                          setExpiry(digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits);
                        }}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="cvc">CVC</label>
                      <input
                        id="cvc"
                        name="cvc"
                        inputMode="numeric"
                        required
                        placeholder="123"
                        maxLength={4}
                        pattern="[0-9]{3,4}"
                        value={cvc}
                        onChange={(event) => setCvc(event.target.value.replace(/\D/g, '').slice(0, 4))}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="link-quiet demo-card-btn"
                    onClick={() => {
                      setCard('4242 4242 4242 4242');
                      setExpiry('12 / 30');
                      setCvc('123');
                    }}
                  >
                    Fill a demo card
                  </button>
                  <div className="field">
                    <label htmlFor="cardName">Name on card</label>
                    <input id="cardName" name="cardName" autoComplete="cc-name" required />
                  </div>
                  <p className="payment-note">
                    This store is a design demo. Do not enter a real card. Nothing is charged, and card details
                    stay in this browser. Only the order details are saved to the local database.
                  </p>
                </>
              )}
            </section>

            <div className="checkout-actions-mobile">
              <button type="submit" className="btn btn-block btn-order" disabled={processing}>
                {processing ? (stripe ? 'Opening payment…' : 'Placing order…') : `${stripe ? 'Continue to payment' : 'Place order'} · ${formatPrice(total)}`}
              </button>
            </div>
          </div>

          <aside className="checkout-summary">
            <div className="summary-card">
              <div className="summary-head">
                <h2>Your order</h2>
                <button type="button" className="link-quiet" onClick={open}>
                  Edit bag
                </button>
              </div>
              <ul className="summary-items">
                {lines.map((l) => {
                  const p = getProduct(l.slug);
                  if (!p) return null;
                  return (
                    <li key={l.key}>
                      <img src={p.image} alt="" width="768" height="1376" loading="lazy" />
                      <div>
                        <p className="summary-name">{p.name}</p>
                        <p className="summary-meta">
                          {p.colour}
                          {Object.values(l.options).length ? ` · ${Object.values(l.options).join(' · ')}` : ''}
                          {' · '}Qty {l.qty}
                        </p>
                      </div>
                      <span className="summary-price">{formatPrice(p.price * l.qty)}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="summary-totals">
                <div>
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div>
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? 'Free' : formatPrice(shippingCost)}</span>
                </div>
                <div className="summary-tax">
                  <span>Tax</span>
                  <span>Included</span>
                </div>
                <div className="summary-total">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {submitError && (
                <p className="form-error summary-error" role="alert" ref={errorRef}>
                  {submitError}
                </p>
              )}

              <button type="submit" className="btn btn-block btn-order" disabled={processing}>
                {processing ? (
                  stripe ? 'Opening payment…' : 'Placing order…'
                ) : (
                  <>
                    {stripe ? 'Continue to payment' : 'Place order'} <ArrowRight />
                  </>
                )}
              </button>

              <ul className="summary-assurances">
                <li>
                  <CheckIcon /> 30-day returns
                </li>
                <li>
                  <CheckIcon /> Packed without plastic
                </li>
                <li>
                  <CheckIcon /> Every piece wrapped by hand
                </li>
              </ul>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
