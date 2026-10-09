import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import StatusTracker from '../components/StatusTracker';
import { useLiveOrders, useTitle } from '../hooks/useLiveOrders';
import { describeOrder, formatWhen, kes } from '../utils';

function merge(current, order) {
  const index = current.findIndex((item) => item._id === order._id);
  if (index === -1) return [order, ...current];
  const next = current.slice();
  next[index] = order;
  return next;
}

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  useTitle('Orders');

  const load = useCallback(async () => {
    try {
      const data = await api('/api/orders');
      setOrders(data.orders);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [load]);

  useLiveOrders((_type, order) => setOrders((current) => merge(current || [], order)));

  return (
    <div>
      <h1 className="font-serif text-4xl">Your orders</h1>
      <p className="mt-2 max-w-xl text-sm text-ink/65">
        The Westlands kitchen moves a ticket from Order Received to In Kitchen to Sent to Delivery. This page listens live, and checks again every few seconds.
      </p>
      {error && <p className="mt-4 text-sm text-ember">{error}</p>}
      {orders && orders.length === 0 && (
        <div className="mt-10">
          <p className="font-serif text-2xl">No pies in motion yet.</p>
          <Link to="/" className="btn mt-4">See the menu</Link>
        </div>
      )}
      <div className="mt-8 space-y-4">
        {orders?.map((order) => (
          <Link key={order._id} to={`/orders/${order._id}`} className="block border border-ink/10 bg-cream p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-2xl">{order.pizzaName}</h2>
              <p className="text-sm">{kes(order.totalAmount)}</p>
            </div>
            <p className="mt-1 text-xs text-ink/50">
              {order.orderNumber} · {formatWhen(order.createdAt)} · Qty {order.quantity}
            </p>
            <p className="mt-2 text-sm text-ink/70">{describeOrder(order)}</p>
            <div className="mt-4">
              <StatusTracker status={order.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
