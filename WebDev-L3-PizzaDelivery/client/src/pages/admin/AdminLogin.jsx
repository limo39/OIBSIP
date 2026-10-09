import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AuthShell from '../../components/AuthShell';
import Field from '../../components/Field';
import { OvenLoading } from '../../components/Layouts';
import { useAuth } from '../../context/AuthContext';
import { useTitle } from '../../hooks/useLiveOrders';

export default function AdminLogin() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useTitle('Staff entrance');

  if (loading) return <OvenLoading />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/" replace />;

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password, 'admin');
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Staff only"
      title="Jiko door."
      lede="This entrance is not part of guest registration. Accounts here are issued for the Westlands pass."
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Work email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-ember">{error}</p>}
        <button className="btn w-full" disabled={busy} type="submit">
          {busy ? 'Checking…' : 'Enter the kitchen'}
        </button>
      </form>
    </AuthShell>
  );
}
