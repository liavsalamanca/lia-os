import type { HabitLogs } from '../data/schema';
import { shiftDays } from './dates';

export function isDone(logs: HabitLogs, habitId: string, date: string): boolean {
  return logs[habitId]?.includes(date) ?? false;
}

/** Días seguidos. Hoy sin marcar no rompe la racha: cuenta desde ayer. */
export function streak(logs: HabitLogs, habitId: string, today: string): number {
  let date = isDone(logs, habitId, today) ? today : shiftDays(today, -1);
  let count = 0;
  while (isDone(logs, habitId, date)) {
    count++;
    date = shiftDays(date, -1);
  }
  return count;
}

export function toggleHabitDate(logs: HabitLogs, habitId: string, date: string): HabitLogs {
  const dates = logs[habitId] ?? [];
  return { ...logs, [habitId]: dates.includes(date) ? dates.filter((d) => d !== date) : [...dates, date] };
}
