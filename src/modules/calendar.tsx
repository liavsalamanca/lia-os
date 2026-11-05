import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { calendarSource } from '../../supabase/functions/_shared/icloud.ts';
import { apple, useApple } from '../app/apple';
import { useData } from '../app/store';
import { useUI } from '../app/ui';
import type { Snapshot } from '../data/schema';
import type { ExternalEvent } from '../domain/appleCalendar';
import { Button, EmptyState, IconButton, PageHeader, Row, RowBody, Section } from '../design';
import { formatDate, formatMonth, monthGrid, todayISO } from '../domain/dates';
import { byTextDesc, RowActions } from './shared';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

type Entry = { key: string; title: string; kind: 'event' | 'task' | 'apple' };

const KIND_STYLE: Record<Entry['kind'], string> = {
  event: 'border-wine text-wine',
  task: 'border-rose text-rose',
  apple: 'border-ink/50 text-ink',
};

function entriesFor(data: Snapshot, appleEvents: ExternalEvent[], date: string): Entry[] {
  return [
    ...appleEvents.filter((e) => e.date === date).map((e) => ({ key: e.key, title: e.time ? `${e.time} ${e.title}` : e.title, kind: 'apple' as const })),
    ...data.events.filter((e) => e.date === date).map((e) => ({ key: e.id, title: e.title, kind: 'event' as const })),
    ...data.tasks.filter((t) => t.due === date && t.status !== 'Hecho').map((t) => ({ key: t.id, title: t.title, kind: 'task' as const })),
    ...data.content.filter((c) => c.publishDate === date).map((c) => ({ key: c.id, title: c.title, kind: 'event' as const })),
    ...data.castings.filter((c) => c.date === date).map((c) => ({ key: c.id, title: c.brand, kind: 'event' as const })),
  ];
}

export default function Calendar() {
  const data = useData();
  const { openForm } = useUI();
  const appleState = useApple();
  const source = calendarSource(data.settings.appleCalendarUrl);
  useEffect(() => void apple.refresh(), []);
  const today = todayISO(data.settings.timezone);
  const [offset, setOffset] = useState(0);
  const monthIndex = Number(today.slice(5, 7)) - 1 + offset;
  const year = Number(today.slice(0, 4)) + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;

  return (
    <>
      <PageHeader
        eyebrow="Plan your days"
        title="Calendario"
        subtitle="Eventos, fechas de tareas, castings y publicaciones."
        action={
          <Button variant="primary" onClick={() => openForm('events')}>
            <Plus size={16} aria-hidden /> Nuevo evento
          </Button>
        }
      />
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-2xl font-normal first-letter:uppercase">{formatMonth(year, month)}</h2>
        <div className="flex items-center gap-1">
          <IconButton icon={ChevronLeft} label="Mes anterior" onClick={() => setOffset(offset - 1)} />
          <Button size="sm" onClick={() => setOffset(0)}>
            Hoy
          </Button>
          <IconButton icon={ChevronRight} label="Mes siguiente" onClick={() => setOffset(offset + 1)} />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-line bg-line">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="bg-sunken py-1.5 text-center text-xs text-muted">
            {d}
          </div>
        ))}
        {monthGrid(year, month).map(({ date, inMonth }) => {
          const entries = entriesFor(data, appleState.events, date);
          return (
            <button
              key={date}
              aria-label={`Nuevo evento el ${formatDate(date)}${entries.length ? `, ${entries.length} registros` : ''}`}
              onClick={() => openForm('events', undefined, { date })}
              className={`min-h-16 min-w-0 p-1 text-left align-top transition-colors hover:bg-wine-soft sm:min-h-28 sm:p-2 ${inMonth ? 'bg-surface' : 'bg-canvas text-muted'}`}
            >
              <span className={`text-xs ${date === today ? 'rounded-full bg-wine px-1.5 py-0.5 font-bold text-wine-ink' : ''}`}>{Number(date.slice(8))}</span>
              {entries.slice(0, 3).map((e) => (
                <span key={e.key} className={`mt-1 block truncate border-l-2 pl-1 text-[11px] ${KIND_STYLE[e.kind]}`}>
                  {e.title}
                </span>
              ))}
              {entries.length > 3 && <span className="mt-1 block text-[11px] text-muted">+ {entries.length - 3} más</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 text-[13px] text-muted">
        <span className="border-l-2 border-wine pl-1.5">Eventos, castings y publicaciones</span>
        <span className="border-l-2 border-rose pl-1.5">Tareas</span>
        {appleState.status !== 'off' && <span className="border-l-2 border-ink/50 pl-1.5">{source} (se edita allí)</span>}
        <span>Toca una fecha para crear un evento.</span>
      </p>

      {appleState.status !== 'off' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-muted" role="status">
          <span>
            {appleState.status === 'loading'
              ? `Leyendo ${source}…`
              : appleState.fetchedAt
                ? `${source} leído a las ${new Date(appleState.fetchedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: data.settings.timezone })}`
                : `${source} aún no se ha leído.`}
          </span>
          {appleState.error && <span className="text-danger">{appleState.error}</span>}
          <Button size="sm" onClick={() => apple.refresh({ force: true })} disabled={appleState.status === 'loading'}>
            <RefreshCw size={14} aria-hidden /> Actualizar {source}
          </Button>
        </div>
      )}

      <Section title="Eventos registrados" className="mt-10">
        {data.events.length ? (
          <ul>
            {[...data.events].sort(byTextDesc((e) => e.date)).map((e) => (
              <Row key={e.id}>
                <RowBody title={e.title} sub={`${formatDate(e.date)}${e.time ? ` · ${e.time}` : ''}${e.area ? ` · ${e.area}` : ''}`} />
                <RowActions collection="events" id={e.id} />
              </Row>
            ))}
          </ul>
        ) : (
          <EmptyState title="Todavía no hay eventos" hint="Añade grabaciones, reuniones y citas." />
        )}
      </Section>
    </>
  );
}
