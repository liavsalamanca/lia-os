import { Plus, X } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import type { Subtask, Task } from '../data/schema';
import { IconButton } from '../design';
import { dependencyCandidates, isTaskDone } from '../domain/tasks';

const legend = 'mb-1 block text-[13px] font-medium text-muted';

export function SubtaskEditor({ label, value, onChange }: { label: string; value: Subtask[]; onChange: (next: Subtask[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const title = draft.trim();
    if (!title) return;
    onChange([...value, { id: crypto.randomUUID(), title, done: false }]);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter añade la subtarea en lugar de enviar el formulario.
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  };
  const update = (id: string, patch: Partial<Subtask>) => onChange(value.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  return (
    <fieldset>
      <legend className={legend}>{label}</legend>
      <ul className="grid gap-1.5">
        {value.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-wine" aria-label={`Subtarea hecha: ${s.title}`} checked={s.done} onChange={(e) => update(s.id, { done: e.target.checked })} />
            <input className="control" aria-label="Texto de la subtarea" value={s.title} onChange={(e) => update(s.id, { title: e.target.value })} />
            <IconButton icon={X} label={`Quitar subtarea ${s.title}`} onClick={() => onChange(value.filter((x) => x.id !== s.id))} />
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex items-center gap-2">
        <input className="control" aria-label="Nueva subtarea" placeholder="Añade un paso y pulsa Enter" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} />
        <IconButton icon={Plus} label="Añadir subtarea" onClick={add} />
      </div>
    </fieldset>
  );
}

export function DependencyPicker({ label, value, onChange, tasks, taskId }: { label: string; value: string[]; onChange: (next: string[]) => void; tasks: Task[]; taskId?: string }) {
  const selected = new Set(value);
  // Se ofrecen las pendientes; una ya elegida se mantiene aunque esté hecha.
  const options = dependencyCandidates(taskId, tasks).filter((t) => !isTaskDone(t) || selected.has(t.id));
  const toggle = (id: string, on: boolean) => onChange(on ? [...value, id] : value.filter((v) => v !== id));

  return (
    <fieldset>
      <legend className={legend}>{label}</legend>
      {options.length ? (
        <ul className="max-h-40 overflow-auto rounded-md border border-line px-3 py-1">
          {options.map((t) => (
            <li key={t.id}>
              <label className="flex items-center gap-2 py-1.5 text-sm">
                <input type="checkbox" className="size-4 accent-wine" checked={selected.has(t.id)} onChange={(e) => toggle(t.id, e.target.checked)} />
                <span className={isTaskDone(t) ? 'line-through opacity-60' : ''}>{t.title}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted">No hay otras tareas pendientes.</p>
      )}
    </fieldset>
  );
}
