import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useLiveOrders, useTitle } from '../../hooks/useLiveOrders';
import { STATUSES, describeOrder, formatWhen, kes } from '../../utils';

const FILTERS = ['All', ...STATUSES];

export default function OrdersAdmin() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(null);
  const announced = useRef(new Set());
  useTitle('Orders');

  const load = useCallback(async () => {
    try {
      const query = filter === 'All' ? '' : `?status=${encodeURIComponent(filter)}`;
      const data = await api(`/api/admin/orders${query}`);
      setOrders(data.orders);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [filter]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [load]);

  useLiveOrders((type, order) => {
    if (type === 'created' && order?._id && !announced.current.has(order._id)) {
      announced.current.add(order._id);
      toast.success(`${order.orderNumber} just landed`);
    }
    setOrders((current) => {
      const visible = filter === 'All' || order.status === filter;
      const index = current.findIndex((item) => item._id === order._id);
      if (!visible) return current.filter((item) => item._id !== order._id);
      if (index === -1) return [order, ...current];
      const next = current.slice();
      next[index] = order;
      return next;
    });
  });

  async function update(order, status) {
    setSaving(order._id);
    try {
      const data = await api(`/api/admin/orders/${order._id}/status`, {
        method: 'PATCH',
        body: { status },
      });
      setOrders((current) => {
        if (filter !== 'All' && data.order.status !== filter) {
          return current.filter((item) => item._id !== order._id);
        }
        return current.map((item) => (item._id === order._id ? data.order : item));
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-4xl">Tickets</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/65">
        Move a pie from Order Received to In Kitchen to Sent to Delivery. The guest's Nairobi board updates over the socket, with polling behind it.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={item === filter ? 'btn !py-1.5' : 'btn-ghost !py-1.5'}
          >
            {item}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 text-sm text-ember">{error}</p>}
      <div className="mt-6 space-y-3">
        {orders.map((order) => (
          <article key={order._id} className="border border-ink/10 bg-cream p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-ember">{order.orderNumber}</p>
                <h2 className="font-serif text-2xl">{order.pizzaName} <span className="text-base text-ink/50">× {order.quantity}</span></h2>
                <p className="mt-1 text-sm text-ink/70">{describeOrder(order)}</p>
                <p className="mt-2 text-sm">
                  {order.address?.name || order.user?.name} · {order.user?.email} · {order.address?.phone}
                </p>
                <p className="text-sm text-ink/60">
                  {order.address?.line1}, {order.address?.city} {order.address?.pincode}
                </p>
                <p className="mt-1 text-xs text-ink/45">{formatWhen(order.createdAt)} · {kes(order.totalAmount)} · {order.payment?.mode}</p>
              </div>
              <label className="block text-sm">
                <span className="label">Status</span>
                <select
                  className="input min-w-48"
                  value={order.status}
                  disabled={saving === order._id || order.status === 'Cancelled' || order.status === 'Delivered'}
                  onChange={(event) => update(order, event.target.value)}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>
          </article>
        ))}
        {orders.length === 0 && <p className="text-sm text-ink/60">No tickets in this lane.</p>}
      </div>
    </div>
  );
}
