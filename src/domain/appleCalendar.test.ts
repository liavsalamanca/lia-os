import { describe, expect, it } from 'vitest';
import { parseCalendar } from './appleCalendar';

/** Forma de un calendario publicado por iCloud, con zona horaria incluida. */
const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Apple Inc.//iCloud//EN',
  'BEGIN:VTIMEZONE',
  'TZID:America/Bogota',
  'BEGIN:STANDARD',
  'DTSTART:19930403T230000',
  'TZOFFSETFROM:-0400',
  'TZOFFSETTO:-0500',
  'TZNAME:GMT-5',
  'END:STANDARD',
  'END:VTIMEZONE',
  // Clase semanal los lunes y miércoles; el 11 no hay y el 18 se movió a las 14:00.
  'BEGIN:VEVENT',
  'UID:clase@icloud',
  'SUMMARY:Clase de patronaje',
  'LOCATION:Bloque 3',
  'DTSTART;TZID=America/Bogota:20261102T090000',
  'DTEND;TZID=America/Bogota:20261102T110000',
  'RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261130T235959Z',
  'EXDATE;TZID=America/Bogota:20261111T090000',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:clase@icloud',
  'RECURRENCE-ID;TZID=America/Bogota:20261118T090000',
  'SUMMARY:Clase de patronaje (cambio de hora)',
  'DTSTART;TZID=America/Bogota:20261118T140000',
  'DTEND;TZID=America/Bogota:20261118T160000',
  'END:VEVENT',
  // Viaje de tres días.
  'BEGIN:VEVENT',
  'UID:viaje@icloud',
  'SUMMARY:Viaje a Medellín',
  'DTSTART;VALUE=DATE:20261120',
  'DTEND;VALUE=DATE:20261123',
  'END:VEVENT',
  // En UTC: 03:00 UTC del 6 son las 22:00 del 5 en Bogotá.
  'BEGIN:VEVENT',
  'UID:utc@icloud',
  'SUMMARY:Llamada con USA',
  'DTSTART:20261106T030000Z',
  'DTEND:20261106T040000Z',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:cancelada@icloud',
  'SUMMARY:Cancelada',
  'STATUS:CANCELLED',
  'DTSTART;VALUE=DATE:20261110',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:vieja@icloud',
  'SUMMARY:Fuera de rango',
  'DTSTART;VALUE=DATE:20250101',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const parse = (timezone = 'America/Bogota') => parseCalendar(ICS, { from: '2026-11-01', to: '2026-12-01', timezone });

describe('lectura de Apple Calendar', () => {
  it('expande la repetición, quita la fecha excluida y aplica el cambio', () => {
    const clases = parse().filter((e) => e.title.startsWith('Clase'));
    expect(clases.map((e) => `${e.date} ${e.time}`)).toEqual([
      '2026-11-02 09:00',
      '2026-11-04 09:00',
      '2026-11-09 09:00',
      '2026-11-16 09:00',
      '2026-11-18 14:00',
      '2026-11-23 09:00',
      '2026-11-25 09:00',
      '2026-11-30 09:00',
    ]);
    expect(clases.find((e) => e.date === '2026-11-18')?.title).toBe('Clase de patronaje (cambio de hora)');
    expect(clases[0]?.location).toBe('Bloque 3');
  });

  it('un evento de varios días aparece en cada uno', () => {
    expect(parse().filter((e) => e.title === 'Viaje a Medellín').map((e) => e.date)).toEqual(['2026-11-20', '2026-11-21', '2026-11-22']);
  });

  it('convierte a la zona horaria de la persona', () => {
    expect(parse().find((e) => e.title === 'Llamada con USA')).toMatchObject({ date: '2026-11-05', time: '22:00' });
    expect(parse('Europe/Madrid').find((e) => e.title === 'Llamada con USA')).toMatchObject({ date: '2026-11-06', time: '04:00' });
  });

  it('omite cancelados y lo que queda fuera del rango', () => {
    const titles = parse().map((e) => e.title);
    expect(titles).not.toContain('Cancelada');
    expect(titles).not.toContain('Fuera de rango');
  });

  it('las claves no se repiten', () => {
    const keys = parse().map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('una zona sin VTIMEZONE se interpreta con su nombre', () => {
    const ics = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:x', 'SUMMARY:Desfile NY', 'DTSTART;TZID=America/New_York:20261104T180000', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    expect(parseCalendar(ics, { from: '2026-11-01', to: '2026-12-01', timezone: 'America/Bogota' })[0]).toMatchObject({ date: '2026-11-04', time: '18:00' });
  });

  it('un archivo inválido lanza un error en lugar de devolver datos a medias', () => {
    expect(() => parseCalendar('no es un calendario', { from: '2026-11-01', to: '2026-12-01', timezone: 'America/Bogota' })).toThrow();
  });
});
