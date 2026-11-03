import { CheckSquare, Download, Home, CalendarDays, Menu, Moon, Plus, Search, Sun } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Dialog, IconButton } from '../design';
import { formatDate, todayISO } from '../domain/dates';
import { download } from '../modules/download';
import { moduleGroups } from '../modules/registry';
import { ReminderWatcher } from '../modules/reminders';
import { CommandPalette } from './CommandPalette';
import { getStore, useData } from './store';
import { useUI } from './ui';

function Brand() {
  return (
    <NavLink to="/overview" className="block" aria-label="LIA OS, ir al inicio">
      <span className="font-serif text-2xl text-wine">LIA OS</span>
      <span className="block text-[11px] tracking-[0.14em] text-muted uppercase">Your life, your system</span>
    </NavLink>
  );
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Principal">
      {moduleGroups.map((group) => (
        <div key={group.title} className="mt-6 first:mt-0">
          <p className="eyebrow mb-1 px-3">{group.title}</p>
          {group.modules.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onNavigate}
              className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${isActive ? 'bg-wine-soft font-medium text-wine' : 'text-muted hover:text-wine'}`}
            >
              <Icon size={17} strokeWidth={1.6} aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

const mobileItem = ({ isActive }: { isActive: boolean }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-wine' : 'text-muted'}`;

export function Shell({ notice }: { notice: string | null }) {
  const data = useData();
  const { openForm, attempt, toast } = useUI();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { settings } = data;

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const exportBackup = () => {
    download(`lia-os-respaldo-${todayISO(settings.timezone)}.json`, getStore().exportBackup());
    toast('Respaldo descargado. Guárdalo en un lugar privado.');
  };

  return (
    <div className="flex min-h-dvh">
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }} className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-surface focus:p-2">
        Saltar al contenido
      </a>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line lg:flex">
        <div className="px-6 pt-7 pb-6">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <Navigation />
        </div>
        <button onClick={exportBackup} className="flex items-center gap-2 border-t border-line px-6 py-4 text-[13px] text-wine hover:underline">
          <Download size={15} aria-hidden /> Exportar respaldo
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur sm:px-8">
          <div className="lg:hidden">
            <Brand />
          </div>
          <p className="hidden text-[13px] text-muted lg:block">{formatDate(todayISO(settings.timezone))}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPaletteOpen(true)} className="hidden items-center gap-2 rounded-md border border-line px-3 py-2 text-[13px] text-muted hover:text-wine sm:flex">
              <Search size={15} aria-hidden /> Buscar <kbd className="text-[11px]">Ctrl K</kbd>
            </button>
            <IconButton icon={Search} label="Buscar" className="sm:hidden" onClick={() => setPaletteOpen(true)} />
            <IconButton
              icon={settings.theme === 'dark' ? Sun : Moon}
              label="Cambiar tema"
              onClick={() => attempt(() => getStore().updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' }))}
            />
            <button aria-label="Configuración" onClick={() => navigate('/settings')} className="ml-1 grid size-9 place-items-center rounded-full bg-wine font-serif text-wine-ink">
              {settings.name.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        {notice && (
          <p role="alert" className="border-b border-warn/40 bg-sunken px-4 py-2 text-center text-[13px] text-warn sm:px-8">
            {notice}
          </p>
        )}

        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-28 outline-none sm:px-8 lg:pb-16">
          <Suspense fallback={<p className="py-20 text-center text-muted">Cargando…</p>}>
            <div key={pathname} className="animate-rise">
              <Outlet />
            </div>
          </Suspense>
        </main>
        <footer className="hidden border-t border-line px-8 py-4 text-center text-[13px] text-muted lg:block">Tu información se guarda en este dispositivo</footer>
      </div>

      <nav aria-label="Accesos rápidos" className="fixed inset-x-0 bottom-0 z-30 flex items-center border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        <NavLink to="/overview" className={mobileItem}>
          <Home size={20} strokeWidth={1.6} aria-hidden /> Inicio
        </NavLink>
        <NavLink to="/tasks" className={mobileItem}>
          <CheckSquare size={20} strokeWidth={1.6} aria-hidden /> Tareas
        </NavLink>
        <button aria-label="Nueva tarea" onClick={() => openForm('tasks')} className="mx-2 grid size-12 shrink-0 place-items-center rounded-full bg-wine text-wine-ink">
          <Plus size={22} aria-hidden />
        </button>
        <NavLink to="/calendar" className={mobileItem}>
          <CalendarDays size={20} strokeWidth={1.6} aria-hidden /> Agenda
        </NavLink>
        <button onClick={() => setMenuOpen(true)} className={mobileItem({ isActive: false })}>
          <Menu size={20} strokeWidth={1.6} aria-hidden /> Más
        </button>
      </nav>

      {menuOpen && (
        <Dialog title="Todo LIA OS" onClose={() => setMenuOpen(false)}>
          <div className="p-3">
            <Navigation onNavigate={() => setMenuOpen(false)} />
          </div>
        </Dialog>
      )}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      <ReminderWatcher />
    </div>
  );
}
