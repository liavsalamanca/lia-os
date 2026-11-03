import type { Task } from '../data/schema';
import { shiftDays, weekdayIndex } from './dates';

export const DONE = 'Hecho';
export const RECURRENCES = ['Diaria', 'Semanal', 'Mensual', 'Anual'];
export const SMART_VIEWS = ['Hoy', 'Mañana', 'Esta semana', 'Próximas', 'Vencidas', 'Algún día', 'Todas'] as const;
export type SmartView = (typeof SMART_VIEWS)[number];

export const isTaskDone = (t: Pick<Task, 'status'>) => t.status === DONE;

/** Domingo de la semana de `today`; la semana empieza en lunes. */
export function endOfWeek(today: string): string {
  return shiftDays(today, (7 - weekdayIndex(today)) % 7);
}

/** Las vistas inteligentes muestran solo pendientes; «Todas» incluye las hechas. */
export function inSmartView(task: Task, view: SmartView, today: string): boolean {
  if (view === 'Todas') return true;
  if (isTaskDone(task)) return false;
  const due = task.due;
  switch (view) {
    case 'Hoy':
      return due === today;
    case 'Mañana':
      return due === shiftDays(today, 1);
    case 'Esta semana':
      return Boolean(due) && due >= today && due <= endOfWeek(today);
    case 'Próximas':
      return Boolean(due) && due > today;
    case 'Vencidas':
      return Boolean(due) && due < today;
    case 'Algún día':
      return !due;
  }
}

function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + months, 1, 12));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

function step(iso: string, recurrence: string, times: number): string {
  if (recurrence === 'Diaria') return shiftDays(iso, times);
  if (recurrence === 'Semanal') return shiftDays(iso, 7 * times);
  if (recurrence === 'Mensual') return addMonths(iso, times);
  return addMonths(iso, 12 * times);
}

/**
 * Siguiente fecha de una tarea recurrente, siempre posterior a hoy: si se
 * completa tarde, salta los periodos ya pasados. Sin fecha, cuenta desde hoy.
 */
export function nextOccurrence(due: string, recurrence: string, today: string): string | null {
  if (!RECURRENCES.includes(recurrence)) return null;
  const base = due || today;
  for (let n = 1; n < 10_000; n++) {
    const next = step(base, recurrence, n);
    if (next > today) return next;
  }
  return null;
}

/** Cambios al completar: una recurrente vuelve a quedar pendiente en su próxima fecha. */
export function completionPatch(task: Task, today: string): Partial<Task> {
  const next = nextOccurrence(task.due, task.recurrence, today);
  if (!next) return { status: DONE, lastDoneAt: today };
  return { status: 'Pendiente', due: next, lastDoneAt: today, subtasks: task.subtasks.map((s) => ({ ...s, done: false })) };
}

/** Tareas pendientes de las que depende esta. Las borradas no bloquean. */
export function blockers(task: Task, tasks: Task[]): Task[] {
  return task.blockedBy.flatMap((id) => {
    const other = tasks.find((t) => t.id === id);
    return other && !isTaskDone(other) ? [other] : [];
  });
}

/** Tareas que pueden ser requisito de `id` sin crear un ciclo. */
export function dependencyCandidates(id: string | undefined, tasks: Task[]): Task[] {
  if (!id) return tasks;
  const dependents = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const t of tasks) {
      if (!dependents.has(t.id) && t.blockedBy.some((b) => dependents.has(b))) {
        dependents.add(t.id);
        grew = true;
      }
    }
  }
  return tasks.filter((t) => !dependents.has(t.id));
}

export function subtaskProgress(task: Task): { done: number; total: number } {
  return { done: task.subtasks.filter((s) => s.done).length, total: task.subtasks.length };
}

export function allTags(tasks: Task[]): string[] {
  return [...new Set(tasks.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b, 'es'));
}

/** Hora local HH:MM en la zona horaria indicada. */
export function nowTime(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}

export const reminderKey = (t: Task) => `${t.id}:${t.due}:${t.remindAt}`;

/** Recordatorios de hoy cuya hora ya llegó y que aún no se avisaron. */
export function dueReminders(tasks: Task[], today: string, time: string, notified: ReadonlySet<string>): Task[] {
  return tasks.filter((t) => !isTaskDone(t) && t.remindAt && t.due === today && t.remindAt <= time && !notified.has(reminderKey(t)));
}
