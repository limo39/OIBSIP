import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Field from '../components/Field';
import PizzaVisual from '../components/PizzaVisual';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTitle } from '../hooks/useLiveOrders';
import {
  clearDraft,
  kes,
  loadAddress,
  loadDraft,
  loadRazorpay,
  saveAddress,
  saveDraft,
  selectionPayload,
} from '../utils';

export default function Summary() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => loadDraft());
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [config, setConfig] = useState(null);
  const [paying, setPaying] = useState(false);
  const [demo, setDemo] = useState(null);
  const [error, setError] = useState('');
  const stored = loadAddress();
  const [address, setAddress] = useState({
    name: stored?.name || user?.name || '',
    phone: stored?.phone || '',
    line1: stored?.line1 || '',
    city: stored?.city || '',
    pincode: stored?.pincode || '',
  });
  useTitle('Order summary');

  const draftKey = useMemo(() => JSON.stringify(draft), [draft]);

  useEffect(() => {
    api('/api/payments/config')
      .then(setConfig)
      .catch(() => setConfig({ demo: true }));
  }, []);

  useEffect(() => {
    if (!draft || (draft.kind !== 'preset' && draft.kind !== 'custom')) return undefined;
    let cancelled = false;
    setQuoteError('');
    api('/api/payments/quote', { method: 'POST', body: selectionPayload(draft) })
      .then((data) => {
        if (!cancelled) setQuote(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [draftKey, draft]);

  if (!draft) {
    return (
      <div>
        <h1 className="font-serif text-4xl">Nothing on the peel.</h1>
        <Link to="/build" className="btn mt-6">Build a pie</Link>
      </div>
    );
  }

  function setQuantity(next) {
    const max = quote?.maxQuantity || 10;
    const quantity = Math.max(1, Math.min(max, next));
    const updated = { ...draft, quantity };
    setDraft(updated);
    saveDraft(updated);
  }

  function updateAddress(key, value) {
    setAddress((current) => ({ ...current, [key]: value }));
  }

  async function finish(result) {
    clearDraft();
    navigate(`/orders/${result.order._id}`);
  }

  async function pay(event) {
    event.preventDefault();
    setError('');
    if (!/^0[17]\d{8}$/.test(address.phone)) {
      setError('Enter a 10-digit Kenyan number starting with 07 or 01');
      return;
    }
    if (!/^\d{5}$/.test(address.pincode)) {
      setError('Enter a 5-digit postal code');
      return;
    }
    setPaying(true);
    saveAddress(address);
    try {
      const session = await api('/api/payments/create-order', {
        method: 'POST',
        body: { ...selectionPayload(draft), address },
      });
      if (session.demo) {
        setDemo(session);
        setPaying(false);
        return;
      }
      await loadRazorpay();
      const checkout = new window.Razorpay({
        key: session.keyId,
        amount: session.amount,
        currency: session.currency,
        name: 'Forno',
        description: session.pizzaName,
        order_id: session.orderId,
        prefill: { name: address.name, email: user.email, contact: address.phone },
        theme: { color: '#c8102e' },
        handler: async (response) => {
          try {
            const result = await api('/api/payments/verify', { method: 'POST', body: response });
            await finish(result);
          } catch (err) {
            setError(err.message);
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      checkout.on('payment.failed', () => {
        setError('Payment was not completed.');
        setPaying(false);
      });
      checkout.open();
    } catch (err) {
      setError(err.message);
      setPaying(false);
    }
  }

  async function confirmDemo() {
    setPaying(true);
    setError('');
    try {
      const result = await api('/api/payments/verify', {
        method: 'POST',
        body: {
          razorpay_order_id: demo.orderId,
          razorpay_payment_id: 'pay_DEMO_success',
          razorpay_signature: 'demo',
        },
      });
      await finish(result);
    } catch (err) {
      setError(err.message);
      setPaying(false);
    }
  }

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div>
        <PizzaVisual
          className="mx-auto w-full max-w-md"
          baseSlug={quote?.selection?.base?.slug}
          sauceSlug={quote?.selection?.sauce?.slug}
          cheeseSlug={quote?.selection?.cheese?.slug}
          vegetableSlugs={(quote?.selection?.vegetables || []).map((item) => item.slug)}
        />
        <p className="text-center font-serif text-3xl">{quote?.pizzaName || 'Your pie'}</p>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ember">Before you pay</p>
        <h1 className="mt-2 font-serif text-4xl">Order summary</h1>
        <Link className="mt-2 inline-block text-sm text-ink/60 underline" to={draft.kind === 'preset' ? '/' : '/build'}>
          {draft.kind === 'preset' ? 'Back to the menu' : 'Edit this pie'}
        </Link>

        {quoteError && <p className="mt-4 text-sm text-ember">{quoteError}</p>}

        {quote && (
          <div className="mt-6 border border-ink/10 bg-cream p-4">
            <ul className="space-y-2 text-sm">
              {quote.lines.map((line) => (
                <li key={`${line.category}-${line.label}`} className="flex justify-between gap-4">
                  <span>{line.label}</span>
                  <span>{kes(line.price)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-4 text-sm">
              <span>Quantity</span>
              <span className="flex items-center gap-3">
                <button type="button" className="btn-ghost !px-2 !py-1" onClick={() => setQuantity((draft.quantity || 1) - 1)}>–</button>
                <span>{quote.quantity}</span>
                <button type="button" className="btn-ghost !px-2 !py-1" onClick={() => setQuantity((draft.quantity || 1) + 1)}>+</button>
              </span>
            </div>
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{kes(quote.subtotal)}</dd></div>
              <div className="flex justify-between">
                <dt>Delivery</dt>
                <dd>{quote.deliveryFee === 0 ? 'Free' : kes(quote.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between font-serif text-2xl pt-2">
                <dt>Total</dt><dd>{kes(quote.totalAmount)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink/50">
              Prices in Kenyan shillings, tax included. Free delivery across Nairobi from {kes(quote.freeDeliveryOver)}.
            </p>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={pay}>
          <Field label="Name" required value={address.name} onChange={(e) => updateAddress('name', e.target.value)} />
          <Field label="Mobile" required inputMode="numeric" value={address.phone} onChange={(e) => updateAddress('phone', e.target.value)} placeholder="0712345678" />
          <Field label="Address" required textarea value={address.line1} onChange={(e) => updateAddress('line1', e.target.value)} placeholder="Estate, street, and house" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" required value={address.city} onChange={(e) => updateAddress('city', e.target.value)} placeholder="Nairobi" />
            <Field label="Postal code" required inputMode="numeric" value={address.pincode} onChange={(e) => updateAddress('pincode', e.target.value)} placeholder="00100" />
          </div>
          {error && <p className="text-sm text-ember">{error}</p>}
          <button className="btn w-full" type="submit" disabled={paying || !quote}>
            {paying ? 'Opening checkout…' : quote ? `Pay ${kes(quote.totalAmount)}` : 'Pay'}
          </button>
          <p className="text-xs leading-relaxed text-ink/55">
            {config?.demo
              ? 'Checkout is in Kenyan shillings. Razorpay keys are not set, so this is a test sheet. Clicking Success confirms the order.'
              : 'Razorpay test mode, charged in Kenyan shillings. Use a test card. The bank page has Success and Failure, and nothing is charged.'}
          </p>
        </form>
      </div>

      {demo && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-ink/50 p-4">
          <div className="w-full max-w-md border border-ink/10 bg-cream p-6 shadow-sheet" role="dialog" aria-modal="true" aria-labelledby="pay-title">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ember">Test checkout</p>
            <h2 id="pay-title" className="mt-2 font-serif text-3xl">Confirm payment</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink/70">
              This stands in for Razorpay's test bank page. Success places the order and takes the ingredients off the shelf. Failure leaves the order unmade.
            </p>
            <p className="mt-5 font-serif text-4xl">{kes(demo.totalAmount)}</p>
            <p className="mt-1 text-xs text-ink/40">{demo.orderId}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" className="btn" disabled={paying} onClick={confirmDemo}>
                Success
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setDemo(null);
                  toast.error('Payment cancelled');
                }}
              >
                Failure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
