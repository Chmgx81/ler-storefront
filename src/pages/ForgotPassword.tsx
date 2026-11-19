import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../lib/auth';
import { ArrowRight, CheckIcon } from '../components/Icons';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That request could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="top" className="account-page">
      <div className="container account-shell narrow">
        <section className="account-aside">
          <h1>A way back in.</h1>
          <p>
            Enter the email on your account. If we have it, we will send a link that lets you choose a new
            password. The link expires in 30 minutes and can be used once.
          </p>
          <ul className="account-points">
            <li>
              <CheckIcon />
              The link works for one sign-in only
            </li>
            <li>
              <CheckIcon />
              Changing your password closes other sessions
            </li>
          </ul>
        </section>

        <div className="auth-panel">
          {sent ? (
            <>
              <h2>Check your inbox.</h2>
              <p className="auth-lede">
                If an account exists for that address, a reset link is on its way. Nothing is sent when the
                address is unknown.
              </p>
            </>
          ) : (
            <>
              <h2>Reset your password.</h2>
              <p className="auth-lede">We never ask for your old password here.</p>
              <form onSubmit={submit} className="auth-form">
                <div className="field">
                  <label htmlFor="forgot-email">Email</label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={200}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
                <button type="submit" className="btn btn-block" disabled={busy}>
                  {busy ? 'Sending…' : 'Send reset link'} <ArrowRight />
                </button>
              </form>
            </>
          )}
          <p className="auth-forgot">
            <Link to="/account">Back to sign in</Link>
          </p>
          <p className="auth-note">
            Without an email provider configured, links are written to the local outbox in <code>data/outbox</code>.
          </p>
        </div>
      </div>
    </main>
  );
}
