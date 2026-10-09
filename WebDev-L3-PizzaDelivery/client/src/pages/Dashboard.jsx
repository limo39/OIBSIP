import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import PizzaVisual from '../components/PizzaVisual';
import StatusTracker from '../components/StatusTracker';
import { useLiveOrders, useTitle } from '../hooks/useLiveOrders';
import { formatWhen, kes, saveDraft } from '../utils';

function mergeOrder(current, order) {
  const index = current.findIndex((item) => item._id === order._id);
  if (index === -1) return [order, ...current];
  const next = current.slice();
  next[index] = order;
  return next;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  useTitle('Menu');

  const load = useCallback(async () => {
    try {
      const [menu, mine] = await Promise.all([api('/api/catalog'), api('/api/orders')]);
      setCatalog(menu);
      setOrders(mine.orders);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [load]);

  useLiveOrders((_type, order) => {
    setOrders((current) => mergeOrder(current, order));
  });

  const featured = catalog?.pizzas?.find((pizza) => pizza.featured) || catalog?.pizzas?.[0];
  const active = orders.filter((order) => !['Delivered', 'Cancelled'].includes(order.status));

  function orderPreset(pizza) {
    saveDraft({ kind: 'preset', presetSlug: pizza.slug, quantity: 1 });
    navigate('/summary');
  }

  return (
    <div>
      <section className="grid items-center gap-8 border-b border-ink/10 pb-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-ember">Nairobi · Karibu</p>
          <h1 className="mt-3 max-w-xl font-serif text-5xl leading-[0.95] md:text-6xl">
            Pizza from a Westlands oven.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink/70">
            Six house pies, or a build of your own. Prices are in Kenyan shillings.
            We ride across Kilimani, Lang&apos;ata, and the CBD.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/build" className="btn">Build a pie</Link>
            {featured?.available && (
              <button type="button" className="btn-ghost" onClick={() => orderPreset(featured)}>
                Order the {featured.name}
              </button>
            )}
          </div>
        </div>
        <PizzaVisual
          className="mx-auto w-full max-w-md"
          baseSlug={featured?.base?.slug}
          sauceSlug={featured?.sauce?.slug}
          cheeseSlug={featured?.cheese?.slug}
          vegetableSlugs={featured?.vegetables?.map((item) => item.slug) || []}
        />
      </section>

      {error && <p className="mt-6 text-sm text-ember">{error}</p>}

      {active.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-3xl">In motion</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {active.map((order) => (
              <Link key={order._id} to={`/orders/${order._id}`} className="border border-ink/10 bg-cream p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-serif text-xl">{order.pizzaName}</p>
                  <p className="text-xs text-ink/50">{order.orderNumber}</p>
                </div>
                <p className="mt-1 text-xs text-ink/50">{formatWhen(order.createdAt)}</p>
                <div className="mt-4">
                  <StatusTracker status={order.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-serif text-3xl">House pies</h2>
          <p className="text-sm text-ink/50">Kenyan shillings, before delivery</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog?.pizzas?.map((pizza) => (
            <article key={pizza._id} className="flex flex-col border border-ink/10 bg-cream">
              <PizzaVisual
                className="w-full"
                baseSlug={pizza.base?.slug}
                sauceSlug={pizza.sauce?.slug}
                cheeseSlug={pizza.cheese?.slug}
                vegetableSlugs={pizza.vegetables.map((item) => item.slug)}
              />
              <div className="flex flex-1 flex-col p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-ember">{pizza.tag}</p>
                <h3 className="mt-1 font-serif text-2xl">{pizza.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">{pizza.description}</p>
                <p className="mt-3 text-xs leading-relaxed text-ink/50">{describePizza(pizza)}</p>
                <div className="mt-4 flex items-center justify-between">
                  <p className="font-medium">{pizza.price != null ? kes(pizza.price) : '—'}</p>
                  <button type="button" className="btn" disabled={!pizza.available} onClick={() => orderPreset(pizza)}>
                    {pizza.available ? 'Order' : 'Sold out'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function describePizza(pizza) {
  return [pizza.base?.name, pizza.sauce?.name, pizza.cheese?.name, ...(pizza.vegetables || []).map((item) => item.name)]
    .filter(Boolean)
    .join(' · ');
}
