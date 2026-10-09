import { useEffect, useState } from 'react';
import { api } from '../../api';
import { useToast } from '../../context/ToastContext';
import { useTitle } from '../../hooks/useLiveOrders';
import { kes } from '../../utils';

const GROUPS = [
  ['base', 'Pizza bases'],
  ['sauce', 'Sauces'],
  ['cheese', 'Cheeses'],
  ['vegetable', 'Vegetables'],
];

export default function Inventory() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  useTitle('Inventory');

  useEffect(() => {
    api('/api/admin/inventory')
      .then((data) => {
        setItems(data.items);
        setDrafts(Object.fromEntries(data.items.map((item) => [item._id, fields(item)])));
      })
      .catch((err) => setError(err.message));
  }, []);

  function edit(id, key, value) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  }

  async function save(item) {
    const draft = drafts[item._id];
    if ([draft.stock, draft.threshold, draft.price].some((value) => String(value).trim() === '')) {
      toast.error('Fill in price, stock, and threshold');
      return;
    }
    const stock = Number(draft.stock);
    const threshold = Number(draft.threshold);
    const price = Number(draft.price);
    if ([stock, threshold, price].some((value) => !Number.isInteger(value) || value < 0)) {
      toast.error('Use whole numbers, zero or more');
      return;
    }
    setSaving(item._id);
    try {
      const data = await api(`/api/admin/inventory/${item._id}`, {
        method: 'PATCH',
        body: { stock, threshold, price },
      });
      setItems((current) => current.map((row) => (row._id === item._id ? data.item : row)));
      setDrafts((current) => ({ ...current, [item._id]: fields(data.item) }));
      toast.success(`${item.name} updated`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-4xl">Walk-in</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink/65">
        Stock drops by the quantity ordered once payment is confirmed. Set a threshold on each item — when the count falls below it, the scheduled job emails the kitchen. Raising stock back over the line arms the alert again.
      </p>
      {error && <p className="mt-4 text-sm text-ember">{error}</p>}
      <div className="mt-8 space-y-8">
        {GROUPS.map(([category, label]) => (
          <section key={category}>
            <h2 className="font-serif text-2xl">{label}</h2>
            <div className="mt-3 overflow-x-auto border border-ink/10 bg-cream">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="text-[11px] uppercase tracking-[0.14em] text-ink/45">
                  <tr>
                    <th className="px-3 py-3 font-medium">Item</th>
                    <th className="px-3 py-3 font-medium">Price</th>
                    <th className="px-3 py-3 font-medium">Stock</th>
                    <th className="px-3 py-3 font-medium">Threshold</th>
                    <th className="px-3 py-3 font-medium">State</th>
                    <th className="px-3 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {items?.filter((item) => item.category === category).map((item) => {
                    const draft = drafts[item._id] || fields(item);
                    const low = item.stock < item.threshold;
                    return (
                      <tr key={item._id} className={low ? 'bg-[#f8e6dc]' : 'border-t border-ink/10'}>
                        <td className="px-3 py-3">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-ink/50">{item.description}</p>
                        </td>
                        <td className="px-3 py-3">
                          <input className="input w-24" inputMode="numeric" value={draft.price} onChange={(e) => edit(item._id, 'price', e.target.value)} aria-label={`${item.name} price`} />
                          <p className="mt-1 text-xs text-ink/40">Now {kes(item.price)}</p>
                        </td>
                        <td className="px-3 py-3">
                          <input className="input w-24" inputMode="numeric" value={draft.stock} onChange={(e) => edit(item._id, 'stock', e.target.value)} aria-label={`${item.name} stock`} />
                        </td>
                        <td className="px-3 py-3">
                          <input className="input w-24" inputMode="numeric" value={draft.threshold} onChange={(e) => edit(item._id, 'threshold', e.target.value)} aria-label={`${item.name} threshold`} />
                        </td>
                        <td className="px-3 py-3 text-xs uppercase tracking-[0.12em]">
                          {low ? 'Low' : 'Ok'}
                          {item.alertedWhileLow && <span className="mt-1 block normal-case tracking-normal text-ink/50">Alert sent</span>}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button type="button" className="btn !py-1.5" disabled={saving === item._id} onClick={() => save(item)}>
                            {saving === item._id ? 'Saving…' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function fields(item) {
  return { stock: String(item.stock), threshold: String(item.threshold), price: String(item.price) };
}
