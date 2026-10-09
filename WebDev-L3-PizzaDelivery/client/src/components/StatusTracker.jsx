import { PIPELINE } from '../utils';

export default function StatusTracker({ status }) {
  if (status === 'Cancelled') {
    return <p className="text-sm text-ember">This order was cancelled. Stock went back on the shelf.</p>;
  }

  const index = PIPELINE.indexOf(status);
  const delivered = status === 'Delivered';

  return (
    <div>
      <ol className="grid grid-cols-3 gap-3" aria-live="polite" aria-label="Order status">
        {PIPELINE.map((label, step) => {
          const done = delivered || (index > -1 && step < index);
          const active = !delivered && step === index;
          return (
            <li key={label}>
              <div className={`h-1 ${done || active ? 'bg-ember' : 'bg-ink/10'} ${active ? 'pulse-ember' : ''}`} />
              <p className={`mt-2 text-xs ${active ? 'font-medium text-ember' : done ? 'text-ink' : 'text-ink/45'}`}>
                {label}
              </p>
            </li>
          );
        })}
      </ol>
      {delivered && <p className="mt-3 text-sm text-moss">Delivered.</p>}
    </div>
  );
}
