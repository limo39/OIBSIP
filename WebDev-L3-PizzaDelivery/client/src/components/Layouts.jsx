import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function linkClass(isActive, light = false) {
  if (light) return `text-sm ${isActive ? 'text-gold' : 'text-paper/70 hover:text-paper'}`;
  return `text-sm ${isActive ? 'text-ember' : 'text-ink/70 hover:text-ink'}`;
}

function FlagStripe({ onDark = false }) {
  return (
    <span className="mt-1.5 flex h-[3px] w-14" aria-hidden="true">
      <span className={`flex-1 ${onDark ? 'bg-paper' : 'bg-ink'}`} />
      <span className="flex-1 bg-ember" />
      <span className="flex-1 bg-moss" />
    </span>
  );
}

export function OvenLoading({ label = 'Heating the oven…' }) {
  return (
    <div className="grid min-h-screen place-items-center bg-paper">
      <p className="font-serif text-2xl">{label}</p>
    </div>
  );
}

export function UserLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Link to="/" className="leading-none">
            <span className="font-serif text-2xl tracking-tight">Forno</span>
            <FlagStripe />
          </Link>
          <nav className="flex items-center gap-5">
            <NavLink to="/" end className={({ isActive }) => linkClass(isActive)}>
              Menu
            </NavLink>
            <NavLink to="/build" className={({ isActive }) => linkClass(isActive)}>
              Build
            </NavLink>
            <NavLink to="/orders" className={({ isActive }) => linkClass(isActive)}>
              Orders
            </NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink/70 sm:inline">{user?.name}</span>
            <button
              type="button"
              className="btn-ghost !px-3 !py-1.5"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen md:grid md:grid-cols-[230px_1fr]">
      <aside className="bg-olive text-paper md:min-h-screen">
        <div className="flex items-center justify-between gap-6 px-5 py-4 md:block md:px-6 md:py-8">
          <div>
            <Link to="/admin" className="inline-block leading-none">
              <span className="font-serif text-2xl">Forno</span>
              <FlagStripe onDark />
            </Link>
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-gold">Nairobi kitchen</p>
          </div>
          <nav className="flex gap-4 md:mt-10 md:flex-col md:gap-3">
            <NavLink to="/admin" end className={({ isActive }) => linkClass(isActive, true)}>
              Overview
            </NavLink>
            <NavLink to="/admin/orders" className={({ isActive }) => linkClass(isActive, true)}>
              Orders
            </NavLink>
            <NavLink to="/admin/inventory" className={({ isActive }) => linkClass(isActive, true)}>
              Inventory
            </NavLink>
          </nav>
        </div>
      </aside>
      <div>
        <header className="flex items-center justify-between border-b border-ink/10 px-5 py-4 md:px-8">
          <p className="text-sm text-ink/70">{user?.name}</p>
          <button
            type="button"
            className="btn-ghost !px-3 !py-1.5"
            onClick={async () => {
              await logout();
              navigate('/admin/login');
            }}
          >
            Log out
          </button>
        </header>
        <main className="px-5 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
