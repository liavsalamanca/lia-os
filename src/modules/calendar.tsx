import { ChevronLeft, ChevronRight, Pencil, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { calendarSource } from '../../supabase/functions/_shared/icloud.ts';
import { apple, useApple } from '../app/apple';
import { useData } from '../app/store';
import { useUI } from '../app/ui';
import { Button, Dialog, EmptyState, IconButton, PageHeader, Row, RowBody, Section } from '../design';
import { agendaFor, type AgendaItem, type AgendaKind } from '../domain/agenda';
import { formatDate, formatLongDate, formatMonth, monthGrid, todayISO } from '../domain/dates';
import { useCompleteTask } from './completeTask';
import { byTextDesc, RowActions } from './shared';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const KIND_STYLE: Record<AgendaKind, { border: string; text: string; dot: string; label: string }> = {
  event: { border: 'border-wine', text: 'text-wine', dot: 'bg-wine', label: 'Evento' },
  casting: { border: 'border-wine', text: 'text-wine', dot: 'bg-wine', label: 'Modelaje' },
  content: { border: 'border-wine', text: 'text-wine', dot: 'bg-wine', label: 'Publicación' },
  task: { border: 'border-rose', text: 'text-rose', dot: 'bg-rose', label: 'Tarea' },
  external: { border: 'border-ink/50', text: 'text-ink', dot: 'bg-ink/50', label: '' },
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function DayItem({ item, source, onEdit }: { item: AgendaItem; source: string; onEdit: (item: AgendaItem) => void }) {
  const { tasks } = useData();
  const complete = useCompleteTask();
  const task = item.kind === 'task' ? tasks.find((t) => t.id === item.record?.id) : undefined;
  const style = KIND_STYLE[item.kind];
  return (
    <li className={`flex items-start gap-3 border-l-2 py-2.5 pl-3 ${style.border}`}>
      <span className="w-10 shrink-0 pt-0.5 text-[13px] text-muted tabular-nums">{item.time || 'Día'}</span>
      {task && <input type="checkbox" aria-label={`Completar ${task.title}`} className="check mt-0.5" checked={false} onChange={(e) => complete(task, e.target.checked)} />}
      <div className="min-w-0 flex-1">
        <p className="font-medium [overflow-wrap:anywhere]">{item.title}</p>
        <p className="text-[13px] text-muted [overflow-wrap:anywhere]">{[style.label || source, item.detail].filter(Boolean).join(' · ')}</p>
      </div>
      {item.record && <IconButton icon={Pencil} label={`Editar ${item.title}`} onClick={() => onEdit(item)} />}
    </li>
  );
}

/** Todo lo de un día, legible también en el celular. */
function DayDialog({ date, items, source, onClose }: { date: string; items: AgendaItem[]; source: string; onClose: () => void }) {
  const { openForm } = useUI();
  const edit = (item: AgendaItem) => {
    onClose();
    openForm(item.record!.collection, item.record!.id);
  };
  return (
    <Dialog title={capitalize(formatLongDate(date))} onClose={onClose}>
      <div className="px-5 py-3">
        {items.length ? (
          <ul aria-label="Agenda del día" className="grid gap-1">
            {items.map((item) => (
              <DayItem key={item.key} item={item} source={source} onEdit={edit} />
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-muted">Nada agendado este día.</p>
        )}
      </div>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-surface px-5 py-3">
        <Button
          variant="primary"
          onClick={() => {
            onClose();
            openForm('events', undefined, { date });
          }}
        >
          <Plus size={16} aria-hidden /> Nuevo evento este día
        </Button>
      </div>
    </Dialog>
  );
}

export default function Calendar() {
  const data = useData();
  const { openForm } = useUI();
  const appleState = useApple();
  const source = calendarSource(data.settings.appleCalendarUrl);
  useEffect(() => void apple.refresh(), []);
  const today = todayISO(data.settings.timezone);
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const monthIndex = Number(today.slice(5, 7)) - 1 + offset;
  const year = Number(today.slice(0, 4)) + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;

  return (
    <>
      <PageHeader
        eyebrow="Planea tus días"
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
          const entries = agendaFor(data, appleState.events, date);
          return (
            <button
              key={date}
              aria-label={`${capitalize(formatLongDate(date))}${entries.length ? `, ${entries.length} en la agenda` : ', sin nada agendado'}`}
              aria-current={date === today ? 'date' : undefined}
              onClick={() => setSelected(date)}
              className={`min-h-16 min-w-0 p-1 text-left align-top transition-colors hover:bg-wine-soft sm:min-h-28 sm:p-2 ${inMonth ? 'bg-surface' : 'bg-canvas text-muted'}`}
            >
              <span className={`text-xs ${date === today ? 'rounded-full bg-wine px-1.5 py-0.5 font-bold text-wine-ink' : ''}`}>{Number(date.slice(8))}</span>
              {/* En el celular no caben los títulos: un punto por registro y el detalle al tocar. */}
              {entries.length > 0 && (
                <span className="mt-1.5 flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
                  {entries.slice(0, 6).map((e) => (
                    <span key={e.key} className={`size-1.5 rounded-full ${KIND_STYLE[e.kind].dot}`} />
                  ))}
                </span>
              )}
              {entries.slice(0, 3).map((e) => (
                <span key={e.key} className={`mt-1 hidden truncate border-l-2 pl-1 text-[11px] sm:block ${KIND_STYLE[e.kind].border} ${KIND_STYLE[e.kind].text}`}>
                  {e.time ? `${e.time} ${e.title}` : e.title}
                </span>
              ))}
              {entries.length > 3 && <span className="mt-1 hidden text-[11px] text-muted sm:block">+ {entries.length - 3} más</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-4 text-[13px] text-muted">
        <span className="border-l-2 border-wine pl-1.5">Eventos, castings y publicaciones</span>
        <span className="border-l-2 border-rose pl-1.5">Tareas</span>
        {appleState.status !== 'off' && <span className="border-l-2 border-ink/50 pl-1.5">{source} (se edita allí)</span>}
        <span>Toca un día para ver todo lo que tiene.</span>
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

      {selected && <DayDialog date={selected} items={agendaFor(data, appleState.events, selected)} source={source} onClose={() => setSelected(null)} />}

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
