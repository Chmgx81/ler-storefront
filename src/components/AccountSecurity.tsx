import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  changePassword,
  deleteAccount,
  revokeOtherSessions,
  sendVerificationEmail,
  signOut,
  updateName,
  useSession,
} from '../lib/auth';
import { ArrowRight } from './Icons';

type Props = {
  name: string;
  email: string;
  emailVerified: boolean;
  emailVerification: boolean;
};

export default function AccountSecurity({ name, email, emailVerified, emailVerification }: Props) {
  const { refetch } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [newName, setNewName] = useState(name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  const run = async (key: string, action: () => Promise<void>, success: string) => {
    if (busy) return;
    setBusy(key);
    setError('');
    setNotice('');
    try {
      await action();
      await refetch();
      setNotice(success);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'That did not work. Please try again.');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="account-panel security-panel" aria-labelledby="security-title">
      <h2 id="security-title">Security</h2>

      {notice && <p className="form-success" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {emailVerification && !emailVerified && (
        <div className="security-row">
          <p className="security-copy">
            <strong>Email not verified.</strong> Verify {email} to keep your account recoverable.
          </p>
          <button
            type="button"
            className="link-quiet"
            disabled={Boolean(busy)}
            onClick={() =>
              run('verify', () => sendVerificationEmail(email), 'Check your inbox for a verification link.')
            }
          >
            {busy === 'verify' ? 'Sending…' : 'Resend link'}
          </button>
        </div>
      )}

      <form
        className="security-row"
        onSubmit={(event) => {
          event.preventDefault();
          void run('name', () => updateName(newName.trim()), 'Your name was saved.');
        }}
      >
        <div className="security-copy">
          <label htmlFor="security-name">Display name</label>
          <input
            id="security-name"
            value={newName}
            maxLength={80}
            required
            onChange={(event) => setNewName(event.target.value)}
          />
        </div>
        <button type="submit" className="link-quiet" disabled={Boolean(busy)}>
          {busy === 'name' ? 'Saving…' : 'Save'}
        </button>
      </form>

      <form
        className="security-row security-stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (newPassword.length < 8) {
            setError('Use at least 8 characters for your new password.');
            return;
          }
          void run('password', async () => {
            await changePassword(currentPassword, newPassword);
            setCurrentPassword('');
            setNewPassword('');
          }, 'Password changed. Other devices were signed out.');
        }}
      >
        <div className="security-copy">
          <label htmlFor="security-current">Change password</label>
          <input
            id="security-current"
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            value={currentPassword}
            required
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <input
            id="security-new"
            type="password"
            autoComplete="new-password"
            placeholder="New password (8+ characters)"
            minLength={8}
            maxLength={128}
            value={newPassword}
            required
            aria-label="New password"
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </div>
        <button type="submit" className="link-quiet" disabled={Boolean(busy)}>
          {busy === 'password' ? 'Changing…' : 'Change'}
        </button>
      </form>

      <div className="security-row">
        <p className="security-copy">Signed in somewhere else? Close every other session.</p>
        <button
          type="button"
          className="link-quiet"
          disabled={Boolean(busy)}
          onClick={() => run('sessions', revokeOtherSessions, 'Other sessions were closed.')}
        >
          {busy === 'sessions' ? 'Closing…' : 'Sign out elsewhere'}
        </button>
      </div>

      <div className="security-danger">
        <button type="button" className="link-quiet" onClick={() => setShowDelete(!showDelete)}>
          {showDelete ? 'Cancel' : 'Delete account'}
        </button>
        {showDelete && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (deleteConfirm.trim().toUpperCase() !== 'DELETE') {
                setError('Type DELETE to confirm.');
                return;
              }
              void run('delete', async () => {
                await deleteAccount(deletePassword);
                await signOut();
                navigate('/');
              }, 'Your account was deleted.');
            }}
          >
            <p>
              This deletes your account, your orders and your newsletter subscription. It cannot be undone.
            </p>
            <label htmlFor="delete-password">Password</label>
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              required
              onChange={(event) => setDeletePassword(event.target.value)}
            />
            <label htmlFor="delete-confirm">Type DELETE</label>
            <input
              id="delete-confirm"
              value={deleteConfirm}
              required
              autoComplete="off"
              onChange={(event) => setDeleteConfirm(event.target.value)}
            />
            <button type="submit" className="btn btn-danger" disabled={Boolean(busy)}>
              {busy === 'delete' ? 'Deleting…' : 'Delete my account'} <ArrowRight />
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
