import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import Field from '../components/Field';
import { OvenLoading } from '../components/Layouts';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { useTitle } from '../hooks/useLiveOrders';

export default function Register() {
  const { user, loading } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  useTitle('Create account');

  if (loading) return <OvenLoading />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/" replace />;

  function set(key) {
    return (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: { name: form.name, email: form.email, password: form.password },
      });
      setDone(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="New guest"
      title="Karibu."
      lede="Registration is for guests only. The Nairobi kitchen keeps its own keys."
      footer={
        <>
          Already ordering? <Link className="text-ember" to="/login">Log in</Link>
        </>
      }
    >
      {done ? (
        <div className="space-y-3 text-sm leading-relaxed">
          <p>{done.message}</p>
          {done.devPreview?.verificationUrl && (
            <p>
              No mailbox is configured, so the link is here as well as in the server log:{' '}
              <a className="text-ember underline" href={done.devPreview.verificationUrl}>
                Verify email
              </a>
            </p>
          )}
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <Field label="Name" required minLength={2} value={form.name} onChange={set('name')} />
          <Field label="Email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
          <Field label="Password" type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} />
          <Field label="Confirm password" type="password" required value={form.confirm} onChange={set('confirm')} />
          <p className="text-xs text-ink/50">At least 8 characters, with a letter and a number.</p>
          {error && <p className="text-sm text-ember">{error}</p>}
          <button className="btn w-full" disabled={busy} type="submit">
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
