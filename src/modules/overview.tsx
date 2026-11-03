import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getStore, useData } from '../app/store';
import { useUI } from '../app/ui';
import { Button, Chip, EmptyState, Metrics, Progress, Row, RowBody, Section, TextLink } from '../design';
import { formatDate, formatLongDate, todayISO } from '../domain/dates';
import { formatCOP, monthSummary } from '../domain/finance';
import { isDone } from '../domain/habits';
import { projectProgress } from '../domain/projects';
import { useCompleteTask } from './completeTask';
import { byText } from './shared';

const SPACES = [
  ['/content', 'Taikinsa Studio', 'Ideas y publicaciones'],
  ['/orders', 'Encargos USA', 'Costos y pedidos'],
  ['/creative', 'Idea Vault', 'Inspírate y crea'],
  ['/finance', 'Money Map', 'Dinero bajo control'],
] as const;

export default function Overview() {
  const data = useData();
  const { openForm, attempt } = useUI();
  const navigate = useNavigate();
  const complete = useCompleteTask();
  const today = todayISO(data.settings.timezone);
  const open = data.tasks.filter((t) => t.status !== 'Hecho');
  const next = [...open].sort(byText((t) => t.due)).slice(0, 5);
  const habitsDone = data.habits.filter((h) => isDone(data.habitLogs, h.id, today)).length;
  const upcoming = [
    ...data.events.filter((e) => e.date >= today).map((e) => ({ id: e.id, date: e.date, title: e.title, area: e.area })),
    ...data.content.filter((c) => c.publishDate >= today).map((c) => ({ id: c.id, date: c.publishDate, title: c.title, area: 'Taikinsa' })),
  ]
    .sort(byText((e) => e.date))
    .slice(0, 4);
  const { income } = monthSummary(data.transactions, today.slice(0, 7));

  return (
    <>
      <header className="mb-10 border-b border-line pb-8">
        <p className="eyebrow">{formatLongDate(today)}</p>
        <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight font-normal sm:text-6xl">Tu vida, a tu manera, {data.settings.name}.</h1>
        <p className="mt-3 text-muted">Un día a la vez. Todo lo importante, en un solo lugar.</p>
        <Button variant="primary" className="mt-6" onClick={() => openForm('tasks')}>
          <Plus size={16} aria-hidden /> Capturar una tarea
        </Button>
      </header>

      <Metrics
        items={[
          { label: 'Tareas pendientes', value: open.length, foot: 'Lo que queda por hacer' },
          { label: 'Proyectos activos', value: data.projects.filter((p) => p.status === 'En progreso').length, foot: 'Construyendo tu futuro' },
          { label: 'Hábitos de hoy', value: `${habitsDone}/${data.habits.length}`, foot: 'Pequeñas victorias' },
          { label: 'Ingresos del mes', value: formatCOP(income), foot: 'Registrados en finanzas' },
        ]}
      />

      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <Section title="Tus espacios" className="lg:col-span-2">
          <ul className="grid grid-cols-2 gap-x-6 lg:grid-cols-4">
            {SPACES.map(([path, title, hint]) => (
              <li key={path} className="border-b border-line lg:border-b-0">
                <button onClick={() => navigate(path)} className="group w-full py-3 text-left">
                  <span className="font-serif text-lg group-hover:text-wine">{title}</span>
                  <span className="block text-[13px] text-muted">{hint}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Tu siguiente paso" action={<TextLink onClick={() => navigate('/tasks')}>Todas las tareas</TextLink>}>
          {next.length ? (
            <ul>
              {next.map((t) => (
                <Row key={t.id}>
                  <input type="checkbox" aria-label={`Completar ${t.title}`} className="size-4 accent-wine" checked={false} onChange={(e) => complete(t, e.target.checked)} />
                  <RowBody title={t.title} sub={`${t.area} · ${formatDate(t.due)}${t.due && t.due < today ? ' · Vencida' : ''}`} />
                  <Chip>{t.priority}</Chip>
                </Row>
              ))}
            </ul>
          ) : (
            <EmptyState title="Tu lista está despejada" hint="Añade tus primeras tareas para comenzar." />
          )}
        </Section>

        <Section title="Próximamente" action={<TextLink onClick={() => navigate('/calendar')}>Ver calendario</TextLink>}>
          {upcoming.length ? (
            <ul>
              {upcoming.map((e) => (
                <Row key={e.id}>
                  <RowBody title={e.title} sub={`${formatDate(e.date)} · ${e.area || 'General'}`} />
                </Row>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nada pendiente en tu agenda" hint="Añade eventos, grabaciones y reuniones." />
          )}
        </Section>

        <Section title="Proyectos en movimiento" action={<TextLink onClick={() => navigate('/projects')}>Ver todos</TextLink>}>
          {data.projects.length ? (
            <ul>
              {data.projects.slice(0, 3).map((p) => (
                <li key={p.id} className="border-b border-line py-3 last:border-b-0">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <RowBody title={p.name} sub={`${p.area || 'Personal'} · ${p.deadline ? formatDate(p.deadline) : 'Sin fecha límite'}`} />
                    <Chip>{p.status}</Chip>
                  </div>
                  <Progress value={projectProgress(p, data.tasks)} label={`Progreso de ${p.name}`} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Tu siguiente gran proyecto" hint="Crea proyectos para visualizar su avance." />
          )}
        </Section>

        <Section title="Constancia de hoy" action={<TextLink onClick={() => navigate('/habits')}>Ver hábitos</TextLink>}>
          {data.habits.length ? (
            <ul>
              {data.habits.slice(0, 6).map((h) => (
                <Row key={h.id}>
                  <input type="checkbox" aria-label={`Marcar ${h.name}`} className="size-4 accent-wine" checked={isDone(data.habitLogs, h.id, today)} onChange={() => attempt(() => getStore().toggleHabit(h.id))} />
                  <RowBody title={h.name} sub={h.area || 'Personal'} />
                </Row>
              ))}
            </ul>
          ) : (
            <EmptyState title="Pequeños hábitos, grandes cambios" hint="Comienza creando uno o dos hábitos." />
          )}
        </Section>
      </div>
    </>
  );
}
