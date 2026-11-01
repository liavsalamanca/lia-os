import { Moon, Plus, Search } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../design';
import { matches, searchAll } from '../domain/search';
import { collections, newRecordTitle } from '../modules/collections';
import { allModules } from '../modules/registry';
import { COLLECTIONS } from '../data/schema';
import { getStore, useData } from './store';
import { useUI } from './ui';

type Command = { key: string; label: string; hint: string; icon?: ReactNode; run: () => void };

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const data = useData();
  const { openForm, attempt } = useUI();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const pages = allModules.map((m) => {
      const Icon = m.icon;
      return { key: m.path, label: m.label, hint: 'Ir a', icon: <Icon size={16} aria-hidden />, run: () => navigate(m.path) };
    });
    const creators = COLLECTIONS.map((c) => ({ key: `new-${c}`, label: newRecordTitle(collections[c]), hint: 'Crear', icon: <Plus size={16} aria-hidden />, run: () => openForm(c) }));
    const theme = { key: 'theme', label: 'Cambiar tema', hint: 'Acción', icon: <Moon size={16} aria-hidden />, run: () => void attempt(() => getStore().updateSettings({ theme: data.settings.theme === 'dark' ? 'light' : 'dark' })) };
    const hits = searchAll(data, query).map((hit) => ({
      key: `${hit.collection}-${hit.id}`,
      label: hit.title,
      hint: collections[hit.collection].label,
      icon: <Search size={16} aria-hidden />,
      run: () => {
        navigate(collections[hit.collection].route);
        openForm(hit.collection, hit.id);
      },
    }));
    const actions = [...pages, ...creators, theme].filter((c) => !query.trim() || matches(c.label, query));
    return [...hits, ...actions].slice(0, 30);
  }, [query, data, navigate, openForm, attempt]);

  const run = (command?: Command) => {
    if (!command) return;
    onClose();
    command.run();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      setActive((active + delta + commands.length) % Math.max(1, commands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(commands[active]);
    }
  };

  return (
    <Dialog title="Buscar en LIA OS" onClose={onClose}>
      <div className="p-4">
        <input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls="palette-list"
          aria-activedescendant={commands[active] ? `palette-${active}` : undefined}
          aria-label="Buscar registros, páginas y acciones"
          placeholder="Proyecto, pedido, idea, tarea…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="control"
        />
        <ul id="palette-list" role="listbox" aria-label="Resultados" className="mt-3 max-h-[50dvh] overflow-auto">
          {commands.map((c, i) => (
            <li
              key={c.key}
              id={`palette-${i}`}
              role="option"
              aria-selected={i === active}
              onClick={() => run(c)}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center gap-3 rounded px-3 py-2 ${i === active ? 'bg-wine-soft text-wine' : ''}`}
            >
              <span className="text-muted">{c.icon}</span>
              <span className="min-w-0 flex-1 truncate">{c.label}</span>
              <span className="text-xs text-muted">{c.hint}</span>
            </li>
          ))}
          {!commands.length && <li className="px-3 py-8 text-center text-muted">Sin resultados. Prueba con otra palabra.</li>}
        </ul>
      </div>
    </Dialog>
  );
}
