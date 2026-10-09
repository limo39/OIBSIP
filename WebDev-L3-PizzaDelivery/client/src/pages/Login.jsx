import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import Field from '../components/Field';
import { OvenLoading } from '../components/Layouts';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';
import { useTitle } from '../hooks/useLiveOrders';

export default function Login() {
  const { user, loading, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unverified, setUnverified] = useState(false);
  const [devLink, setDevLink] = useState('');
  const [busy, setBusy] = useState(false);
  useTitle('Log in');

  if (loading) return <OvenLoading />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/" replace />;

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setUnverified(false);
    setBusy(true);
    try {
      await login(email, password, 'user');
      navigate('/');
    } catch (err) {
      setError(err.message);
      if (err.code === 'UNVERIFIED') setUnverified(true);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      const data = await api('/api/auth/resend-verification', { method: 'POST', body: { email } });
      if (data.devPreview?.verificationUrl) setDevLink(data.devPreview.verificationUrl);
      toast.success('If that account is waiting, a new link is on its way.');
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <AuthShell
      eyebrow="Guest entrance"
      title="Karibu tena."
      lede="A verified email opens the Nairobi menu."
      footer={
        <>
          New here? <Link className="text-ember" to="/register">Create an account</Link>
          <span className="mx-2 text-ink/30">·</span>
          <Link to="/admin/login">Staff entrance</Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-ember">{error}</p>}
        {unverified && (
          <button type="button" className="text-sm underline" onClick={resend}>
            Resend verification email
          </button>
        )}
        {devLink && (
          <p className="text-xs leading-relaxed text-ink/70">
            Mail is printing to the server console in this environment.{' '}
            <a className="text-ember underline" href={devLink}>Open the verification link</a>
          </p>
        )}
        <button className="btn w-full" disabled={busy} type="submit">
          {busy ? 'Checking…' : 'Log in'}
        </button>
        <p className="text-sm">
          <Link className="text-ink/70 underline" to="/forgot-password">Forgot password</Link>
        </p>
      </form>
    </AuthShell>
  );
}
