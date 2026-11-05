import { Check, Plus } from 'lucide-react';
import { getStore, useData } from '../app/store';
import { useUI } from '../app/ui';
import { Button, EmptyState, Metrics, PageHeader } from '../design';
import { formatDate, shiftDays, todayISO, weekdayIndex } from '../domain/dates';
import { isDone, streak } from '../domain/habits';
import { RowActions } from './shared';

const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function Habits() {
  const data = useData();
  const { openForm, attempt } = useUI();
  const today = todayISO(data.settings.timezone);
  const logs = data.habitLogs;
  const done = data.habits.filter((h) => isDone(logs, h.id, today)).length;
  const week = Array.from({ length: 7 }, (_, i) => shiftDays(today, i - 6));

  return (
    <>
      <PageHeader
        eyebrow="Rituales diarios"
        title="Mis hábitos"
        subtitle="La constancia cuenta más que la perfección."
        action={
          <Button variant="primary" onClick={() => openForm('habits')}>
            <Plus size={16} aria-hidden /> Crear hábito
          </Button>
        }
      />
      <Metrics
        items={[
          { label: 'Hábitos activos', value: data.habits.length, foot: 'Tu selección personal' },
          { label: 'Completados hoy', value: done, foot: `${data.habits.length ? Math.round((done / data.habits.length) * 100) : 0}% del día` },
          { label: 'Mejor racha', value: Math.max(0, ...data.habits.map((h) => streak(logs, h.id, today))), foot: 'Días seguidos' },
        ]}
      />
      {data.habits.length ? (
        <ul className="grid gap-x-10 md:grid-cols-2">
          {data.habits.map((h) => {
            const checked = isDone(logs, h.id, today);
            return (
              <li key={h.id} className="border-t border-line py-4">
                <div className="flex items-center gap-3">
                  <button
                    aria-pressed={checked}
                    aria-label={`${checked ? 'Desmarcar' : 'Completar'} ${h.name}`}
                    onClick={() => attempt(() => getStore().toggleHabit(h.id))}
                    className={`grid size-10 shrink-0 place-items-center rounded-full border transition-colors ${checked ? 'border-wine bg-wine text-wine-ink' : 'border-line-strong text-transparent hover:border-wine'}`}
                  >
                    <Check size={18} aria-hidden />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium [overflow-wrap:anywhere]">{h.name}</p>
                    <p className="text-[13px] text-muted">
                      {h.area || 'Personal'} · {streak(logs, h.id, today) === 1 ? '1 día' : `${streak(logs, h.id, today)} días`} de racha
                    </p>
                  </div>
                  <RowActions collection="habits" id={h.id} />
                </div>
                <ol className="mt-3 flex gap-1.5" aria-label={`Últimos siete días de ${h.name}`}>
                  {week.map((d) => {
                    const on = isDone(logs, h.id, d);
                    return (
                      <li key={d} title={`${formatDate(d)}: ${on ? 'hecho' : 'sin marcar'}`} className={`grid size-7 place-items-center rounded text-[11px] ${on ? 'bg-wine text-wine-ink' : 'bg-sunken text-muted'}`}>
                        {DAY_LETTERS[weekdayIndex(d)]}
                      </li>
                    );
                  })}
                </ol>
                {h.notes && <p className="mt-2 text-[13px] text-muted">{h.notes}</p>}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="Construye tu ritual" hint="Por ejemplo: entrenar, diario, skincare, leer o dormir temprano." />
      )}
    </>
  );
}
