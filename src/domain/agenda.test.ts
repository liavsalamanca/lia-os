import { describe, expect, it } from 'vitest';
import { normalizeSnapshot } from '../data/normalize';
import { agendaFor, upcoming } from './agenda';
import type { ExternalEvent } from './appleCalendar';

const DAY = '2026-11-04';
const data = normalizeSnapshot({
  events: [
    { id: 'e1', title: 'Sesión de fotos', date: DAY, time: '15:00', area: 'Modelaje', notes: 'Estudio 2' },
    { id: 'e2', title: 'Feria', date: DAY, time: '' },
    { id: 'e3', title: 'Otro día', date: '2026-11-05', time: '08:00' },
  ],
  tasks: [
    { id: 't1', title: 'Entregar moodboard', due: DAY, status: 'Pendiente', priority: 'Alta', area: 'Universidad' },
    { id: 't2', title: 'Ya hecha', due: DAY, status: 'Hecho' },
  ],
  castings: [{ id: 'c1', brand: 'Agencia Norte', type: 'Casting', date: DAY, status: 'Confirmado' }],
  content: [{ id: 'p1', title: 'Reel brunch', publishDate: '2026-11-06', format: 'Reel', platform: 'Instagram' }],
}).snapshot;
const external: ExternalEvent[] = [
  { key: 'g1', title: 'Clase de patronaje', date: DAY, time: '09:00', location: 'Bloque 3' },
  { key: 'g2', title: 'Cumpleaños de Ana', date: '2026-11-03', time: '', location: '' },
];

describe('agenda del día', () => {
  const day = agendaFor(data, external, DAY);

  it('reúne todo lo del día, con lo de todo el día primero y luego por hora', () => {
    expect(day.map((i) => `${i.time || '—'} ${i.title}`)).toEqual(['— Agencia Norte · Casting', '— Entregar moodboard', '— Feria', '09:00 Clase de patronaje', '15:00 Sesión de fotos']);
  });

  it('no incluye tareas hechas ni otros días', () => {
    const titles = day.map((i) => i.title);
    expect(titles).not.toContain('Ya hecha');
    expect(titles).not.toContain('Otro día');
  });

  it('los externos no se pueden editar y muestran el lugar', () => {
    const clase = day.find((i) => i.kind === 'external');
    expect(clase).toMatchObject({ detail: 'Bloque 3' });
    expect(clase?.record).toBeUndefined();
    expect(day.find((i) => i.title === 'Sesión de fotos')).toMatchObject({ detail: 'Modelaje · Estudio 2', record: { collection: 'events', id: 'e1' } });
    expect(day.find((i) => i.kind === 'task')?.detail).toBe('Universidad · Prioridad alta');
  });
});

describe('próximamente', () => {
  it('ordena lo que viene, sin tareas ni días pasados', () => {
    expect(upcoming(data, external, DAY, 10).map((i) => i.title)).toEqual(['Agencia Norte · Casting', 'Feria', 'Clase de patronaje', 'Sesión de fotos', 'Otro día', 'Reel brunch']);
  });

  it('respeta el límite', () => {
    expect(upcoming(data, external, DAY, 2)).toHaveLength(2);
  });
});
