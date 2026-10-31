import { Plus } from 'lucide-react';
import { useState } from 'react';
import { getStore, useData } from '../app/store';
import { useUI } from '../app/ui';
import type { Task } from '../data/schema';
import { Button, Chip, EmptyState, Metrics, PageHeader, Row, RowBody, SelectFilter } from '../design';
import { formatDate, todayISO } from '../domain/dates';
import { AREAS } from './collections';
import { byText, ListControls, RowActions, useListing } from './shared';

const PRIORITY_RANK: Record<string, number> = { Alta: 0, Media: 1, Baja: 2 };
const doneLast = (a: Task, b: Task) => Number(a.status === 'Hecho') - Number(b.status === 'Hecho');
const sorts = [
  { label: 'Por fecha', compare: (a: Task, b: Task) => doneLast(a, b) || byText<Task>((t) => t.due)(a, b) },
  { label: 'Por prioridad', compare: (a: Task, b: Task) => doneLast(a, b) || (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3) },
  { label: 'Por nombre', compare: byText<Task>((t) => t.title) },
];

const all = (label: string, values: string[]) => [{ value: '', label }, ...values.map((v) => ({ value: v, label: v }))];

export default function Tasks() {
  const data = useData();
  const { openForm, attempt } = useUI();
  const [status, setStatus] = useState('');
  const [area, setArea] = useState('');
  const today = todayISO(data.settings.timezone);
  const filtered = data.tasks.filter((t) => (!status || t.status === status) && (!area || t.area === area));
  const listing = useListing(filtered, (t) => `${t.title} ${t.notes}`, sorts);
  const done = data.tasks.filter((t) => t.status === 'Hecho').length;
  const projectName = (id: string) => data.projects.find((p) => p.id === id)?.name;

  return (
    <>
      <PageHeader
        eyebrow="Productivity"
        title="Mis tareas"
        subtitle="Que tus ideas dejen de ser pendientes eternos."
        action={
          <Button variant="primary" onClick={() => openForm('tasks')}>
            <Plus size={16} aria-hidden /> Nueva tarea
          </Button>
        }
      />
      <Metrics
        items={[
          { label: 'Total', value: data.tasks.length, foot: 'Todas las tareas' },
          { label: 'Completadas', value: done, foot: `${data.tasks.length ? Math.round((done / data.tasks.length) * 100) : 0}% del total` },
          { label: 'Para hoy', value: data.tasks.filter((t) => t.due === today && t.status !== 'Hecho').length, foot: 'En tu agenda' },
        ]}
      />
      <ListControls listing={listing} placeholder="Buscar tarea">
        <SelectFilter label="Filtrar por estado" value={status} onChange={setStatus} options={all('Todos los estados', ['Pendiente', 'En progreso', 'Hecho'])} />
        <SelectFilter label="Filtrar por área" value={area} onChange={setArea} options={all('Todas las áreas', AREAS)} />
      </ListControls>
      {listing.visible.length ? (
        <ul>
          {listing.visible.map((t) => {
            const isDone = t.status === 'Hecho';
            const project = projectName(t.projectId);
            return (
              <Row key={t.id} muted={isDone}>
                <input type="checkbox" aria-label={`Completar ${t.title}`} className="size-4 accent-wine" checked={isDone} onChange={(e) => attempt(() => getStore().setTaskDone(t.id, e.target.checked))} />
                <RowBody strike={isDone} title={t.title} sub={`${t.area} · ${formatDate(t.due)}${project ? ` · ${project}` : ''}${!isDone && t.due && t.due < today ? ' · Vencida' : ''}`} />
                <Chip>{t.priority}</Chip>
                <Chip>{t.status}</Chip>
                <RowActions collection="tasks" id={t.id} />
              </Row>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="No hay tareas con esos filtros" hint="Crea una tarea o cambia los filtros." />
      )}
    </>
  );
}
