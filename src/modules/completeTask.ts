import { getStore, useData } from '../app/store';
import { useUI } from '../app/ui';
import type { Task } from '../data/schema';
import { formatDate } from '../domain/dates';
import { blockers } from '../domain/tasks';

/** Completar o reabrir una tarea, con aviso si espera a otra y la fecha siguiente si se repite. */
export function useCompleteTask() {
  const { tasks } = useData();
  const { attempt, confirm, toast } = useUI();
  return async (task: Task, done: boolean) => {
    const waiting = done ? blockers(task, tasks) : [];
    if (waiting.length && !(await confirm(`Esta tarea espera a: ${waiting.map((t) => t.title).join(', ')}. ¿Completarla igual?`, 'Completar'))) return;
    await attempt(async () => {
      const next = await getStore().setTaskDone(task.id, done);
      if (next) toast(`Hecha. Se repite el ${formatDate(next)}`);
    });
  };
}
