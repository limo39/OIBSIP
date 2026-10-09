import { Link } from 'react-router-dom';
import PizzaVisual from './PizzaVisual';

export default function AuthShell({ eyebrow, title, lede, children, footer }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-ink text-paper lg:flex lg:flex-col lg:justify-between lg:p-12">
        <PizzaVisual
          className="pointer-events-none absolute -right-16 top-10 w-[440px] opacity-90"
          baseSlug="classic"
          sauceSlug="marinara"
          cheeseSlug="mozzarella"
          vegetableSlugs={['tomatoes', 'peppers', 'onions']}
        />
        <Link to="/login" className="relative inline-block leading-none">
          <span className="font-serif text-3xl">Forno</span>
          <span className="mt-2 flex h-[3px] w-16" aria-hidden="true">
            <span className="flex-1 bg-paper" />
            <span className="flex-1 bg-ember" />
            <span className="flex-1 bg-moss" />
          </span>
        </Link>
        <div className="relative max-w-md">
          <p className="text-xs uppercase tracking-[0.22em] text-gold">Nairobi · Wood-fired</p>
          <h2 className="mt-4 font-serif text-5xl leading-[1.02]">Karibu. The oven is hot, and the rider knows the city.</h2>
        </div>
        <p className="relative max-w-sm text-sm text-paper/60">
          Counted in the walk-in on Waiyaki Way. Taken off the shelf when you pay, in Kenyan shillings.
        </p>
      </aside>
      <main className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <Link to="/login" className="inline-block leading-none lg:hidden">
            <span className="font-serif text-3xl">Forno</span>
            <span className="mt-1.5 flex h-[3px] w-14" aria-hidden="true">
              <span className="flex-1 bg-ink" />
              <span className="flex-1 bg-ember" />
              <span className="flex-1 bg-moss" />
            </span>
          </Link>
          <p className="mt-8 text-[11px] uppercase tracking-[0.18em] text-ember">{eyebrow}</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight">{title}</h1>
          {lede && <p className="mt-3 text-sm leading-relaxed text-ink/70">{lede}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-ink/70">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
