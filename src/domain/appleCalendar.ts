import ICAL from 'ical.js';
import { zonedToUtc } from '../../supabase/functions/_shared/ics.ts';
import { shiftDays, todayISO } from './dates';

/** Evento leído de Apple Calendar: se muestra, pero se edita en Apple. */
export type ExternalEvent = { key: string; title: string; date: string; time: string; location: string };

const MAX_OCCURRENCES = 2000;
/** Una serie diaria de 30 años; evita bucles con reglas extrañas. */
const MAX_STEPS = 12_000;
const MAX_SPAN_DAYS = 31;

const wallTime = (t: ICAL.Time) => `${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`;
const isoDate = (t: ICAL.Time) => `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;

const validZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

function localTime(instant: Date, timezone: string) {
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instant);
  return { date: todayISO(timezone, instant), time };
}

/** Fecha y hora en la zona de la persona. Sin zona conocida, la hora se toma tal cual. */
function placeInZone(t: ICAL.Time, tzid: string | null, timezone: string): { date: string; time: string } {
  if (t.isDate) return { date: isoDate(t), time: '' };
  const zone = t.zone?.tzid;
  if (zone === 'UTC' || (zone && zone !== 'floating')) return localTime(t.toJSDate(), timezone);
  if (tzid && validZone(tzid)) return localTime(zonedToUtc(isoDate(t), wallTime(t), tzid), timezone);
  return { date: isoDate(t), time: wallTime(t) };
}

/**
 * Convierte un .ics en eventos por día dentro de [from, to). Expande las
 * repeticiones, respeta excepciones y fechas excluidas y omite los cancelados.
 */
export function parseCalendar(text: string, { from, to, timezone }: { from: string; to: string; timezone: string }): ExternalEvent[] {
  const root = new ICAL.Component(ICAL.parse(text));
  for (const vtz of root.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(vtz);

  const byUid = new Map<string, { master?: ICAL.Event; exceptions: ICAL.Event[] }>();
  for (const vevent of root.getAllSubcomponents('vevent')) {
    const event = new ICAL.Event(vevent);
    const uid = event.uid || `sin-uid-${byUid.size}`;
    const group = byUid.get(uid) ?? { exceptions: [] };
    if (event.isRecurrenceException()) group.exceptions.push(event);
    else group.master = event;
    byUid.set(uid, group);
  }

  const out: ExternalEvent[] = [];
  const push = (key: string, event: ICAL.Event, start: ICAL.Time, end: ICAL.Time | null) => {
    if (event.component.getFirstPropertyValue('status')?.toString().toUpperCase() === 'CANCELLED') return;
    const tzid = event.component.getFirstProperty('dtstart')?.getParameter('tzid');
    const placed = placeInZone(start, typeof tzid === 'string' ? tzid : null, timezone);
    // Un evento de todo el día que dura varios días aparece en cada uno.
    const days = start.isDate && end?.isDate ? Math.min(MAX_SPAN_DAYS, Math.max(1, end.subtractDate(start).toSeconds() / 86_400)) : 1;
    for (let i = 0; i < days; i++) {
      const date = shiftDays(placed.date, i);
      if (date >= from && date < to) out.push({ key: `${key}:${i}`, title: event.summary || 'Sin título', date, time: placed.time, location: event.location || '' });
    }
  };

  // Un margen de un día cubre los eventos que cambian de fecha al pasar a otra zona horaria.
  const rangeStart = ICAL.Time.fromDateString(shiftDays(from, -MAX_SPAN_DAYS));
  const rangeEnd = ICAL.Time.fromDateString(shiftDays(to, 1));
  for (const [uid, { master, exceptions }] of byUid) {
    if (!master) {
      // Excepción sin la serie original: se muestra como evento suelto.
      for (const e of exceptions) push(`${uid}:${e.startDate.toString()}`, e, e.startDate, e.endDate);
      continue;
    }
    if (!master.isRecurring()) {
      push(uid, master, master.startDate, master.endDate);
      continue;
    }
    for (const e of exceptions) master.relateException(e);
    const iterator = master.iterator();
    let shown = 0;
    for (let steps = 0, next = iterator.next(); next && steps < MAX_STEPS && shown < MAX_OCCURRENCES && next.compare(rangeEnd) < 0; steps++, next = iterator.next()) {
      if (next.compare(rangeStart) < 0) continue;
      shown++;
      const details = master.getOccurrenceDetails(next);
      push(`${uid}:${next.toString()}`, details.item, details.startDate, details.endDate);
    }
  }
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
