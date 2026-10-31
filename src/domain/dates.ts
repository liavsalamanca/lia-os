export const DEFAULT_TIMEZONE = 'America/Bogota';
const LOCALE = 'es-CO';

/** Fecha ISO (YYYY-MM-DD) en la zona horaria indicada. */
export function todayISO(timezone = DEFAULT_TIMEZONE, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

const atNoon = (iso: string) => new Date(`${iso}T12:00:00Z`);
const toISO = (d: Date) => d.toISOString().slice(0, 10);

export function shiftDays(iso: string, days: number): string {
  const d = atNoon(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

export function formatDate(iso: string): string {
  if (!iso) return 'Sin fecha';
  const d = atNoon(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function formatLongDate(iso: string): string {
  return atNoon(iso).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}

export function formatMonth(year: number, monthIndex: number): string {
  return new Date(Date.UTC(year, monthIndex, 15)).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function weekdayIndex(iso: string): number {
  return atNoon(iso).getUTCDay();
}

/** Celdas de una cuadrícula mensual que empieza en lunes. */
export function monthGrid(year: number, monthIndex: number): { date: string; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, monthIndex, 1, 12));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthIndex + 1, 0, 12)).getUTCDate();
  const total = Math.ceil((lead + days) / 7) * 7;
  return Array.from({ length: total }, (_, i) => {
    const d = new Date(Date.UTC(year, monthIndex, i - lead + 1, 12));
    return { date: toISO(d), inMonth: d.getUTCMonth() === ((monthIndex % 12) + 12) % 12 };
  });
}
