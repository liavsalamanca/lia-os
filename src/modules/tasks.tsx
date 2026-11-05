import { ChevronDown, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getStore, useData } from '../app/store';
import { useUI } from '../app/ui';
import type { Task } from '../data/schema';
import { Button, Chip, EmptyState, Metrics, PageHeader, Row, RowBody, SelectFilter } from '../design';
import { formatDate, todayISO } from '../domain/dates';
import { allTags, blockers, inSmartView, isTaskDone, SMART_VIEWS, subtaskProgress, type SmartView } from '../domain/tasks';
import { AREAS } from './collections';
import { useCompleteTask } from './completeTask';
import { EnableNotifications } from './reminders';
import { byText, ListControls, RowActions, useListing } from './shared';

const PRIORITY_RANK: Record<string, number> = { Alta: 0, Media: 1, Baja: 2 };
const doneLast = (a: Task, b: Task) => Number(isTaskDone(a)) - Number(isTaskDone(b));
const sorts = [
  { label: 'Por fecha', compare: (a: Task, b: Task) => doneLast(a, b) || byText<Task>((t) => t.due)(a, b) },
  { label: 'Por prioridad', compare: (a: Task, b: Task) => doneLast(a, b) || (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3) },
  { label: 'Por nombre', compare: byText<Task>((t) => t.title) },
];

const all = (label: string, values: string[]) => [{ value: '', label }, ...values.map((v) => ({ value: v, label: v }))];
const searchText = (t: Task) => `${t.title} ${t.notes} ${t.tags.join(' ')} ${t.subtasks.map((s) => s.title).join(' ')}`;

function ViewTabs({ view, onChange, count }: { view: SmartView; onChange: (v: SmartView) => void; count: (v: SmartView) => number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  // Un difuminado a la derecha indica que hay más vistas al desplazar, solo mientras las haya.
  const measure = () => {
    const el = ref.current;
    if (el) setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return (
    <div
      ref={ref}
      onScroll={measure}
      role="group"
      aria-label="Vistas de tareas"
      className={`-mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-line px-4 ${more ? '[mask-image:linear-gradient(to_right,black_80%,transparent)]' : ''}`}
    >
      {SMART_VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          onClick={(e) => {
            onChange(v);
            e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }}
          className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors ${view === v ? 'border-wine text-wine' : 'border-transparent text-muted hover:text-ink'}`}
        >
          {v} <span className="text-[12px] opacity-70">{count(v)}</span>
        </button>
      ))}
    </div>
  );
}

function TaskRow({ task, tasks, today, projectName }: { task: Task; tasks: Task[]; today: string; projectName?: string }) {
  const { attempt } = useUI();
  const complete = useCompleteTask();
  const [open, setOpen] = useState(false);
  const isDone = isTaskDone(task);
  const waiting = isDone ? [] : blockers(task, tasks);
  const steps = subtaskProgress(task);
  const sub = [
    task.area,
    formatDate(task.due),
    task.remindAt && task.due ? `Aviso ${task.remindAt}` : '',
    task.recurrence ? `Se repite: ${task.recurrence.toLowerCase()}` : '',
    projectName ?? '',
    !isDone && task.due && task.due < today ? 'Vencida' : '',
    waiting.length ? `Espera a: ${waiting.map((t) => t.title).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Row muted={isDone}>
      <input type="checkbox" aria-label={`Completar ${task.title}`} className="check" checked={isDone} onChange={(e) => complete(task, e.target.checked)} />
      <RowBody strike={isDone} title={task.title} sub={sub} />
      {task.tags.map((tag) => (
        <span key={tag} className="text-[12px] text-wine">
          #{tag}
        </span>
      ))}
      {waiting.length > 0 && <Chip>Bloqueada</Chip>}
      <Chip>{task.priority}</Chip>
      <Chip>{task.status}</Chip>
      {steps.total > 0 && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 rounded-full border border-line-strong px-2.5 py-0.5 text-xs text-muted hover:text-wine"
        >
          {steps.done}/{steps.total} pasos
          <ChevronDown size={14} aria-hidden className={open ? 'rotate-180' : ''} />
        </button>
      )}
      <RowActions collection="tasks" id={task.id} />
      {open && (
        <ul className="basis-full pb-1 pl-7" aria-label={`Subtareas de ${task.title}`}>
          {task.subtasks.map((s) => (
            <li key={s.id}>
              <label className="flex items-center gap-2 py-1 text-sm">
                <input type="checkbox" className="check" checked={s.done} onChange={() => attempt(() => getStore().toggleSubtask(task.id, s.id))} />
                <span className={s.done ? 'text-muted line-through' : ''}>{s.title}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Row>
  );
}

export default function Tasks() {
  const data = useData();
  const { openForm } = useUI();
  const [view, setView] = useState<SmartView>('Todas');
  const [status, setStatus] = useState('');
  const [area, setArea] = useState('');
  const [priority, setPriority] = useState('');
  const [tag, setTag] = useState('');
  const today = todayISO(data.settings.timezone);
  const tags = allTags(data.tasks);
  const passesFilters = (t: Task) => (!status || t.status === status) && (!area || t.area === area) && (!priority || t.priority === priority) && (!tag || t.tags.includes(tag));
  const filtered = data.tasks.filter((t) => passesFilters(t) && inSmartView(t, view, today));
  const listing = useListing(filtered, searchText, sorts);
  const done = data.tasks.filter(isTaskDone).length;
  const count = (v: SmartView) => data.tasks.filter((t) => passesFilters(t) && inSmartView(t, v, today)).length;
  const projectName = (id: string) => data.projects.find((p) => p.id === id)?.name;

  return (
    <>
      <PageHeader
        eyebrow="Productividad"
        title="Mis tareas"
        subtitle="Que tus ideas dejen de ser pendientes eternos."
        action={
          <Button variant="primary" onClick={() => openForm('tasks', undefined, view === 'Hoy' ? { due: today } : undefined)}>
            <Plus size={16} aria-hidden /> Nueva tarea
          </Button>
        }
      />
      <Metrics
        items={[
          { label: 'Total', value: data.tasks.length, foot: 'Todas las tareas' },
          { label: 'Completadas', value: done, foot: `${data.tasks.length ? Math.round((done / data.tasks.length) * 100) : 0}% del total` },
          { label: 'Para hoy', value: data.tasks.filter((t) => inSmartView(t, 'Hoy', today)).length, foot: 'En tu agenda' },
          { label: 'Vencidas', value: data.tasks.filter((t) => inSmartView(t, 'Vencidas', today)).length, foot: 'Para reprogramar o cerrar' },
        ]}
      />
      {data.tasks.some((t) => t.remindAt && !isTaskDone(t)) && (
        <div className="mb-4">
          <EnableNotifications />
        </div>
      )}
      <ViewTabs view={view} onChange={setView} count={count} />
      <ListControls listing={listing} placeholder="Buscar tarea">
        <SelectFilter label="Filtrar por estado" value={status} onChange={setStatus} options={all('Todos los estados', ['Pendiente', 'En progreso', 'Hecho'])} />
        <SelectFilter label="Filtrar por área" value={area} onChange={setArea} options={all('Todas las áreas', AREAS)} />
        <SelectFilter label="Filtrar por prioridad" value={priority} onChange={setPriority} options={all('Toda prioridad', ['Alta', 'Media', 'Baja'])} />
        {tags.length > 0 && <SelectFilter label="Filtrar por etiqueta" value={tag} onChange={setTag} options={all('Todas las etiquetas', tags)} />}
      </ListControls>
      {listing.visible.length ? (
        <ul>
          {listing.visible.map((t) => (
            <TaskRow key={t.id} task={t} tasks={data.tasks} today={today} projectName={projectName(t.projectId)} />
          ))}
        </ul>
      ) : (
        <EmptyState title={view === 'Todas' ? 'No hay tareas con esos filtros' : `Nada en «${view}»`} hint={view === 'Todas' ? 'Crea una tarea o cambia los filtros.' : 'Cambia de vista o crea una tarea.'} />
      )}
    </>
  );
}
