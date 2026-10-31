import type { Project, Task } from '../data/schema';
import { clampPercent } from './finance';

/** Con tareas vinculadas el avance se calcula; sin ellas se usa el valor manual. */
export function projectProgress(project: Project, tasks: Task[]): number {
  const related = tasks.filter((t) => t.projectId === project.id);
  if (!related.length) return clampPercent(project.progress);
  return Math.round((related.filter((t) => t.status === 'Hecho').length / related.length) * 100);
}
