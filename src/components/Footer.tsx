import { useState } from 'react';
import { Link } from 'react-router-dom';
import { collections } from '../data/products';
import { ArrowRight, ArrowUpRight } from './Icons';
import { useCart } from '../lib/cart';
import { subscribe } from '../lib/orders';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { open } = useCart();

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await subscribe(email.trim(), 'footer');
      setDone(true);
      setEmail('');
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That address could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="newsletter">
          <div className="newsletter-copy">
            <h2>
              Notes from
              <br />
              the studio
            </h2>
            <p>
              New glazes, small runs and the occasional seconds sale. One letter a month, nothing more.
            </p>
          </div>
          <div className="newsletter-form-wrap">
            {done ? (
              <p className="newsletter-done">You’re on the list. Thank you.</p>
            ) : (
              <form className="newsletter-form" onSubmit={signUp}>
                <label htmlFor="news-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="news-email"
                  type="email"
                  required
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <button type="submit" aria-label="Subscribe" disabled={busy}>
                  <ArrowRight />
                </button>
              </form>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <p className="newsletter-small">
              One letter a month, stored in the studio list. <Link to="/legal/privacy">How we handle email</Link>.
            </p>
          </div>
        </div>

        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="logo">
              ler<span>.</span>
            </Link>
            <p>Stoneware for the everyday table. Thrown by hand in small batches.</p>
            <a href="mailto:hello@ler.studio">hello@ler.studio</a>
          </div>

          <div className="footer-col">
            <h3>Shop</h3>
            <Link to="/shop">All pieces</Link>
            {collections.map((c) => (
              <Link key={c} to={`/shop?collection=${encodeURIComponent(c)}`}>
                {c}
              </Link>
            ))}
            <button onClick={open} className="footer-btn">
              Your bag
            </button>
          </div>

          <div className="footer-col">
            <h3>Studio</h3>
            <Link to="/story">Our story</Link>
            <Link to="/story#process">How it’s made</Link>
            <a href="mailto:hello@ler.studio?subject=Studio%20visit">Visit the studio</a>
            <a href="mailto:hello@ler.studio?subject=Trade%20enquiry">Trade &amp; wholesale</a>
          </div>

          <div className="footer-col">
            <h3>Help</h3>
            <Link to="/story#care">Care guide</Link>
            <Link to="/legal/shipping-returns">Shipping &amp; returns</Link>
            <Link to="/legal/privacy">Privacy</Link>
            <Link to="/legal/terms">Terms</Link>
            <a href="mailto:hello@ler.studio">Contact</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 LER Studio</p>
          <p className="footer-made">Made slowly in Copenhagen</p>
          <div className="footer-social">
            <span className="footer-pay">Demo checkout — no payment is taken</span>
          </div>
        </div>

        <div className="footer-word" aria-hidden="true">
          ler<span>.</span>
        </div>
      </div>

      <a className="footer-top" href="#top" aria-label="Back to top">
        Back to top <ArrowUpRight />
      </a>
    </footer>
  );
}
