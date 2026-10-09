import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export function useLiveOrders(handler) {
  const { token } = useAuth();
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!token) return undefined;
    const socket = io({
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });
    const onUpdated = (order) => ref.current?.('updated', order);
    const onCreated = (order) => ref.current?.('created', order);
    socket.on('order:updated', onUpdated);
    socket.on('order:created', onCreated);
    return () => socket.disconnect();
  }, [token]);
}

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Forno Nairobi` : 'Forno Nairobi';
  }, [title]);
}
