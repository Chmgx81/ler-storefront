import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword, useSession } from '../lib/auth';
import { ArrowRight } from '../components/Icons';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { refetch } = useSession();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!token) {
      setError('This link is missing its token. Request a new one.');
      return;
    }
    if (password !== confirm) {
      setError('Those passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await resetPassword(token, password);
      // Password reset revokes sessions on the server; refresh the client view too.
      await refetch();
      navigate('/account', { replace: true, state: { passwordChanged: true } });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That password could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="top" className="account-page">
      <div className="container account-shell narrow">
        <section className="account-aside">
          <h1>A fresh start.</h1>
          <p>Choose a new password. Use at least eight characters, and something you have not used before.</p>
        </section>

        <div className="auth-panel">
          <h2>Choose a password.</h2>
          <p className="auth-lede">Changing it signs you out of other devices.</p>
          <form onSubmit={submit} className="auth-form">
            <div className="field">
              <label htmlFor="reset-password">New password</label>
              <input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="reset-confirm">Repeat password</label>
              <input
                id="reset-confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
              />
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-block" disabled={busy}>
              {busy ? 'Saving…' : 'Save password'} <ArrowRight />
            </button>
          </form>
          <p className="auth-forgot">
            <Link to="/account/forgot">Request a new link</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
