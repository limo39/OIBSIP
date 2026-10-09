import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import Field from '../components/Field';
import { api } from '../api';
import { useTitle } from '../hooks/useLiveOrders';

export default function ResetPassword() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useTitle('Reset password');

  async function onSubmit(event) {
    event.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/reset-password', { method: 'POST', body: { token, password } });
      setMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell eyebrow="New password" title="Choose another." footer={<Link to="/login">Back to log in</Link>}>
      {message ? (
        <p className="text-sm">
          {message} <Link className="text-ember" to="/login">Log in</Link>
        </p>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="New password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          <Field label="Confirm password" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          {error && <p className="text-sm text-ember">{error}</p>}
          <button className="btn w-full" disabled={busy} type="submit">
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
