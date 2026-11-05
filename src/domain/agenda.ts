import type { Snapshot } from '../data/schema';
import type { ExternalEvent } from './appleCalendar';
import { isTaskDone } from './tasks';

export type AgendaKind = 'event' | 'task' | 'casting' | 'content' | 'external';

export type AgendaItem = {
  key: string;
  kind: AgendaKind;
  title: string;
  date: string;
  /** HH:MM, o vacío si es de todo el día. */
  time: string;
  detail: string;
  /** Registro de LIA OS que se puede editar; los externos no tienen. */
  record?: { collection: 'events' | 'tasks' | 'castings' | 'content'; id: string };
};

/** Primero lo de todo el día, después por hora; a igual hora, por título. */
export const byTime = (a: AgendaItem, b: AgendaItem) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.title.localeCompare(b.title, 'es');

function items(data: Snapshot, external: ExternalEvent[]): AgendaItem[] {
  return [
    ...external.map((e) => ({ key: `x:${e.key}`, kind: 'external' as const, title: e.title, date: e.date, time: e.time, detail: e.location })),
    ...data.events.map((e) => ({ key: `e:${e.id}`, kind: 'event' as const, title: e.title, date: e.date, time: e.time, detail: [e.area, e.notes].filter(Boolean).join(' · '), record: { collection: 'events' as const, id: e.id } })),
    ...data.tasks
      .filter((t) => t.due && !isTaskDone(t))
      .map((t) => ({ key: `t:${t.id}`, kind: 'task' as const, title: t.title, date: t.due, time: '', detail: [t.area, t.priority && `Prioridad ${t.priority.toLowerCase()}`].filter(Boolean).join(' · '), record: { collection: 'tasks' as const, id: t.id } })),
    ...data.castings.map((c) => ({ key: `c:${c.id}`, kind: 'casting' as const, title: [c.brand, c.type].filter(Boolean).join(' · '), date: c.date, time: '', detail: c.status, record: { collection: 'castings' as const, id: c.id } })),
    ...data.content.map((c) => ({ key: `p:${c.id}`, kind: 'content' as const, title: c.title, date: c.publishDate, time: '', detail: [c.format, c.platform].filter(Boolean).join(' · '), record: { collection: 'content' as const, id: c.id } })),
  ].filter((i) => i.date);
}

export function agendaFor(data: Snapshot, external: ExternalEvent[], date: string): AgendaItem[] {
  return items(data, external)
    .filter((i) => i.date === date)
    .sort(byTime);
}

/** Lo siguiente en la agenda, sin tareas: Inicio ya tiene su lista de pendientes. */
export function upcoming(data: Snapshot, external: ExternalEvent[], today: string, limit: number): AgendaItem[] {
  return items(data, external)
    .filter((i) => i.kind !== 'task' && i.date >= today)
    .sort(byTime)
    .slice(0, limit);
}
