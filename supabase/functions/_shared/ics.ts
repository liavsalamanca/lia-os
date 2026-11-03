/**
 * Calendario .ics de LIA OS para suscribirse desde Apple Calendar.
 * Sin dependencias: lo usan la función de Supabase (Deno) y las pruebas (Node).
 */

export type FeedRow = { collection: string; id: string; data: Record<string, unknown> };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DONE = 'Hecho';
const EVENT_MINUTES = 60;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Desfase en ms de una zona horaria en un instante dado. */
function zoneOffset(instant: number, timezone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(new Date(instant))
      .map((p) => [p.type, p.value]),
  );
  const wall = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return wall - instant;
}

/** Hora de reloj en una zona horaria → instante UTC, también en cambios de horario. */
export function zonedToUtc(date: string, time: string, timezone: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [h, min] = time.split(':').map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, h, min);
  const first = guess - zoneOffset(guess, timezone);
  return new Date(guess - zoneOffset(first, timezone));
}

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const dateValue = (iso: string) => iso.replace(/-/g, '');
const nextDay = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Corta las líneas a 75 bytes como pide RFC 5545, sin partir caracteres. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = '';
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = out.length ? 74 : 75; // la continuación empieza con un espacio
    if (size + bytes > limit) {
      out.push(current);
      current = '';
      size = 0;
    }
    current += char;
    size += bytes;
  }
  out.push(current);
  return out.join('\r\n ');
}

type Entry = { uid: string; title: string; date: string; time?: string; description?: string; category?: string; stamp: string };

function entryFor(row: FeedRow): Entry | null {
  const d = row.data;
  const stamp = str(d.updatedAt);
  const base = { uid: `${row.collection}-${row.id}@lia-os`, stamp };
  switch (row.collection) {
    case 'events':
      return { ...base, title: str(d.title) || 'Evento', date: str(d.date), time: str(d.time), description: str(d.notes), category: str(d.area) };
    case 'tasks':
      if (str(d.status) === DONE) return null;
      return { ...base, title: `Tarea: ${str(d.title) || 'Sin título'}`, date: str(d.due), description: str(d.notes), category: str(d.area) };
    case 'castings':
      return { ...base, title: `Modelaje: ${[str(d.brand), str(d.type)].filter(Boolean).join(' · ')}`, date: str(d.date), description: str(d.notes), category: 'Modelaje' };
    case 'content':
      return { ...base, title: `Publicación: ${str(d.title)}`, date: str(d.publishDate), description: str(d.notes), category: 'Taikinsa' };
    default:
      return null;
  }
}

export function buildCalendar(rows: FeedRow[], timezone: string, now = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LIA OS//Calendario//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:LIA OS',
    `X-WR-TIMEZONE:${timezone}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
  ];
  for (const row of rows) {
    const entry = entryFor(row);
    if (!entry || !DATE.test(entry.date)) continue;
    const stamp = Number.isNaN(Date.parse(entry.stamp)) ? now : new Date(entry.stamp);
    lines.push('BEGIN:VEVENT', `UID:${entry.uid}`, `DTSTAMP:${utcStamp(stamp)}`, `SUMMARY:${escapeText(entry.title)}`);
    if (entry.time && TIME.test(entry.time)) {
      const start = zonedToUtc(entry.date, entry.time, timezone);
      lines.push(`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(new Date(start.getTime() + EVENT_MINUTES * 60_000))}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${dateValue(entry.date)}`, `DTEND;VALUE=DATE:${dateValue(nextDay(entry.date))}`);
    }
    if (entry.description) lines.push(`DESCRIPTION:${escapeText(entry.description)}`);
    if (entry.category) lines.push(`CATEGORIES:${escapeText(entry.category)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
