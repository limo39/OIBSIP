import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('forno-token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!localStorage.getItem('forno-token')) {
        setLoading(false);
        return;
      }
      try {
        const data = await api('/api/auth/me');
        if (!cancelled) setUser(data.user);
      } catch {
        localStorage.removeItem('forno-token');
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email, password, portal) {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: { email, password, portal },
    });
    localStorage.setItem('forno-token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      /* Drop the local session even if the network call fails. */
    }
    localStorage.removeItem('forno-token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
