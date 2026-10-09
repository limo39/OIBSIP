import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import Field from '../components/Field';
import { api } from '../api';
import { useTitle } from '../hooks/useLiveOrders';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [devLink, setDevLink] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useTitle('Forgot password');

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/api/auth/forgot-password', { method: 'POST', body: { email } });
      setMessage(data.message);
      setDevLink(data.devPreview?.resetUrl || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Password reset"
      title="We'll send a link."
      lede="If the email belongs to a verified account, it gets a reset link that lasts 30 minutes."
      footer={<Link to="/login">Back to log in</Link>}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        {message && <p className="text-sm">{message}</p>}
        {devLink && (
          <p className="text-xs leading-relaxed text-ink/70">
            Mail is printing to the server console.{' '}
            <a className="text-ember underline" href={devLink}>Open the reset link</a>
          </p>
        )}
        {error && <p className="text-sm text-ember">{error}</p>}
        <button className="btn w-full" disabled={busy} type="submit">
          {busy ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  );
}
