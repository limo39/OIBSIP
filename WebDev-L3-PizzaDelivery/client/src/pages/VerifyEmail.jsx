import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { api } from '../api';
import { useTitle } from '../hooks/useLiveOrders';

export default function VerifyEmail() {
  const { token } = useParams();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useTitle('Verify email');

  useEffect(() => {
    let cancelled = false;
    api(`/api/auth/verify-email/${token}`)
      .then((data) => {
        if (!cancelled) setMessage(data.message);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <AuthShell eyebrow="Email" title={error ? 'Link not valid' : message ? 'Email confirmed' : 'Checking the link…'}>
      {error && <p className="text-sm text-ember">{error}</p>}
      {message && (
        <p className="text-sm">
          {message} <Link className="text-ember" to="/login">Log in</Link>
        </p>
      )}
    </AuthShell>
  );
}
