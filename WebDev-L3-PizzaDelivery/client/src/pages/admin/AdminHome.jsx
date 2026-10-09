import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';
import { useTitle } from '../../hooks/useLiveOrders';
import { formatWhen, kes } from '../../utils';

export default function AdminHome() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  useTitle('Kitchen');

  useEffect(() => {
    api('/api/admin/stats')
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1 className="font-serif text-4xl">Nairobi service</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/65">
        Orders land here in Kenyan shillings the moment a payment clears. Stock emails go to {stats?.alertEmail || 'the kitchen inbox'} on the schedule {stats?.cron || 'configured in STOCK_CRON'}.
      </p>
      {error && <p className="mt-4 text-sm text-ember">{error}</p>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders today" value={stats ? stats.ordersToday : '—'} />
        <Stat label="Paid revenue (KES)" value={stats ? kes(stats.revenue) : '—'} />
        <Stat label="Still open" value={stats ? stats.activeOrders : '—'} />
        <Stat label="Below threshold" value={stats ? stats.lowStock : '—'} warn={stats?.lowStock > 0} />
      </div>
      {stats?.lowStock > 0 && (
        <Link to="/admin/inventory" className="mt-4 inline-block text-sm text-ember underline">
          Review low stock
        </Link>
      )}
      <h2 className="mt-10 font-serif text-2xl">Latest tickets</h2>
      <div className="mt-3 divide-y divide-ink/10 border border-ink/10 bg-cream">
        {stats?.recent?.map((order) => (
          <div key={order._id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{order.orderNumber} · {order.pizzaName}</p>
              <p className="text-ink/55">{order.user?.name} · {formatWhen(order.createdAt)}</p>
            </div>
            <p>{order.status}</p>
          </div>
        ))}
        {stats && stats.recent.length === 0 && <p className="px-4 py-6 text-sm text-ink/60">No orders yet.</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div className={`border px-4 py-4 ${warn ? 'border-ember bg-white' : 'border-ink/10 bg-cream'}`}>
      <p className="text-[11px] uppercase tracking-[0.14em] text-ink/50">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
    </div>
  );
}
