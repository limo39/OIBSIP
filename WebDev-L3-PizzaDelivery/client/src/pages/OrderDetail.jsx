import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import PizzaVisual from '../components/PizzaVisual';
import StatusTracker from '../components/StatusTracker';
import { useLiveOrders, useTitle } from '../hooks/useLiveOrders';
import { describeOrder, formatWhen, kes } from '../utils';

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  useTitle(order ? order.orderNumber : 'Order');

  const load = useCallback(async () => {
    try {
      const data = await api(`/api/orders/${id}`);
      setOrder(data.order);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [load]);

  useLiveOrders((_type, incoming) => {
    if (incoming._id === id) setOrder(incoming);
  });

  if (error) {
    return (
      <div>
        <p className="text-sm text-ember">{error}</p>
        <Link to="/orders" className="btn mt-4">All orders</Link>
      </div>
    );
  }

  if (!order) return <p className="font-serif text-2xl">Fetching the ticket…</p>;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <PizzaVisual
        className="mx-auto w-full max-w-sm"
        baseSlug={order.selection?.base?.slug}
        sauceSlug={order.selection?.sauce?.slug}
        cheeseSlug={order.selection?.cheese?.slug}
        vegetableSlugs={(order.selection?.vegetables || []).map((item) => item.slug)}
      />
      <div>
        <Link to="/orders" className="text-sm text-ink/60 underline">All orders</Link>
        <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-ember">{order.orderNumber}</p>
        <h1 className="mt-1 font-serif text-4xl">{order.pizzaName}</h1>
        <p className="mt-2 text-sm text-ink/60">{formatWhen(order.createdAt)} · Qty {order.quantity}</p>
        <p className="mt-3 text-sm text-ink/75">{describeOrder(order)}</p>
        <div className="mt-6 border border-ink/10 bg-cream p-4">
          <StatusTracker status={order.status} />
        </div>
        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{kes(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Delivery</dt><dd>{order.deliveryFee ? kes(order.deliveryFee) : 'Free'}</dd></div>
          <div className="flex justify-between font-medium"><dt>Paid</dt><dd>{kes(order.totalAmount)}</dd></div>
        </dl>
        <div className="mt-6 text-sm leading-relaxed text-ink/75">
          <p className="label">Deliver to</p>
          <p>{order.address?.name}</p>
          <p>{order.address?.line1}</p>
          <p>{order.address?.city} {order.address?.pincode}</p>
          <p>{order.address?.phone}</p>
        </div>
        <p className="mt-4 text-xs text-ink/45">
          {order.payment?.mode === 'demo' ? 'Demo checkout' : 'Razorpay'} · {order.payment?.razorpayPaymentId}
        </p>
      </div>
    </div>
  );
}
