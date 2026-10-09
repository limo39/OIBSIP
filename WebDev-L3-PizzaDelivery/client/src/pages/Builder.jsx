import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import PizzaVisual from '../components/PizzaVisual';
import { useTitle } from '../hooks/useLiveOrders';
import { kes, loadDraft, saveDraft } from '../utils';

const STEPS = [
  { label: 'Base', hint: 'Five doughs, priced in Kenyan shillings. This is what the oven actually touches.' },
  { label: 'Sauce', hint: 'One sauce, edge to edge.' },
  { label: 'Cheese', hint: 'The melt. Pick one.' },
  { label: 'Vegetables', hint: 'Choose as many as you like. At least one.' },
];

export default function Builder() {
  const navigate = useNavigate();
  const saved = loadDraft();
  const resume = saved?.kind === 'custom' ? saved : null;
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [baseId, setBaseId] = useState(resume?.baseId || '');
  const [sauceId, setSauceId] = useState(resume?.sauceId || '');
  const [cheeseId, setCheeseId] = useState(resume?.cheeseId || '');
  const [vegetableIds, setVegetableIds] = useState(resume?.vegetableIds || []);
  useTitle('Build');

  useEffect(() => {
    api('/api/catalog')
      .then(setCatalog)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    saveDraft({ kind: 'custom', baseId, sauceId, cheeseId, vegetableIds, quantity: resume?.quantity || 1 });
  }, [baseId, sauceId, cheeseId, vegetableIds, resume?.quantity]);

  const base = catalog?.bases.find((item) => item._id === baseId);
  const sauce = catalog?.sauces.find((item) => item._id === sauceId);
  const cheese = catalog?.cheeses.find((item) => item._id === cheeseId);
  const vegetables = (catalog?.vegetables || []).filter((item) => vegetableIds.includes(item._id));
  const unit = [base, sauce, cheese, ...vegetables].reduce((sum, item) => sum + (item?.price || 0), 0);

  const options = [catalog?.bases, catalog?.sauces, catalog?.cheeses, catalog?.vegetables][step] || [];
  const selectedId = [baseId, sauceId, cheeseId][step];

  function choose(item) {
    if (!item.available) return;
    if (step === 0) setBaseId(item._id);
    if (step === 1) setSauceId(item._id);
    if (step === 2) setCheeseId(item._id);
    if (step === 3) {
      setVegetableIds((current) =>
        current.includes(item._id) ? current.filter((id) => id !== item._id) : [...current, item._id]
      );
    }
  }

  function canContinue() {
    if (step === 0) return Boolean(baseId);
    if (step === 1) return Boolean(sauceId);
    if (step === 2) return Boolean(cheeseId);
    return vegetableIds.length > 0;
  }

  function reset() {
    setBaseId('');
    setSauceId('');
    setCheeseId('');
    setVegetableIds([]);
    setStep(0);
  }

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="lg:sticky lg:top-24">
        <PizzaVisual
          className="mx-auto w-full max-w-md"
          baseSlug={base?.slug}
          sauceSlug={sauce?.slug}
          cheeseSlug={cheese?.slug}
          vegetableSlugs={vegetables.map((item) => item.slug)}
        />
        <p className="text-center font-serif text-2xl">{nameLine(base, sauce, cheese)}</p>
        <p className="mt-1 text-center text-sm text-ink/60">{unit ? kes(unit) : 'Price builds as you choose'}</p>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ember">0{step + 1} / 04</p>
        <h1 className="mt-2 font-serif text-4xl">{STEPS[step].label}</h1>
        <p className="mt-2 text-sm text-ink/70">{STEPS[step].hint}</p>
        {error && <p className="mt-4 text-sm text-ember">{error}</p>}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {options.map((item) => {
            const selected = step === 3 ? vegetableIds.includes(item._id) : selectedId === item._id;
            return (
              <button
                key={item._id}
                type="button"
                disabled={!item.available}
                aria-pressed={selected}
                onClick={() => choose(item)}
                className={`border p-4 text-left transition-colors ${
                  selected ? 'border-ember bg-white' : 'border-ink/10 bg-white/60 hover:border-ink/30'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-xl">{item.name}</span>
                  <span className="text-sm">{kes(item.price)}</span>
                </span>
                <span className="mt-1 block text-sm text-ink/65">{item.description}</span>
                <span className="mt-3 block text-[11px] uppercase tracking-[0.14em] text-ink/45">
                  {item.available ? (item.stock <= 15 ? `Only ${item.stock} left` : `${item.stock} in the walk-in`) : 'Sold out'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button type="button" className="btn-ghost" onClick={() => (step === 0 ? reset() : setStep((value) => value - 1))}>
            {step === 0 ? 'Start over' : 'Back'}
          </button>
          <button
            type="button"
            className="btn"
            disabled={!canContinue()}
            onClick={() => {
              if (step < 3) setStep((value) => value + 1);
              else navigate('/summary');
            }}
          >
            {step < 3 ? 'Next' : 'Review order'}
          </button>
        </div>
      </div>
    </div>
  );
}

function nameLine(base, sauce, cheese) {
  const parts = [base?.name, sauce?.name, cheese?.name].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Your pie';
}
