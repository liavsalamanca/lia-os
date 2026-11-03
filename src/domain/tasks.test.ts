import { describe, expect, it } from 'vitest';
import { normalizeSnapshot } from '../data/normalize';
import type { Task } from '../data/schema';
import { searchAll } from './search';
import { allTags, blockers, completionPatch, dependencyCandidates, dueReminders, endOfWeek, inSmartView, nextOccurrence, nowTime, reminderKey, type SmartView } from './tasks';

const task = (fields: Record<string, unknown>): Task => normalizeSnapshot({ tasks: [{ id: 'x', title: 'x', status: 'Pendiente', ...fields }] }).snapshot.tasks[0]!;

// Miércoles 4 de noviembre de 2026.
const TODAY = '2026-11-04';

describe('esquema de tareas', () => {
  it('las tareas de v1 reciben listas vacías', () => {
    expect(task({})).toMatchObject({ tags: [], subtasks: [], blockedBy: [], recurrence: '', remindAt: '' });
  });

  it('acepta etiquetas escritas a mano y quita duplicados', () => {
    expect(task({ tags: ' moda, Taikinsa ,moda,, ' }).tags).toEqual(['moda', 'Taikinsa']);
  });

  it('repara subtareas incompletas sin perder las válidas', () => {
    expect(task({ subtasks: ['Guion', { title: 'Grabar', done: true, id: 'a' }, { done: true }, 3, ''] }).subtasks).toEqual([
      { id: 's0', title: 'Guion', done: false },
      { id: 'a', title: 'Grabar', done: true },
    ]);
  });

  it('la búsqueda global encuentra subtareas y etiquetas', () => {
    const { snapshot } = normalizeSnapshot({ tasks: [{ id: 't', title: 'Reel', tags: ['postres'], subtasks: [{ id: 'a', title: 'Comprar fresas' }] }] });
    expect(searchAll(snapshot, 'fresas')).toHaveLength(1);
    expect(searchAll(snapshot, 'postres')).toHaveLength(1);
    expect(searchAll(snapshot, 'object')).toHaveLength(0);
  });
});

describe('vistas inteligentes', () => {
  const cases: [SmartView, string, boolean][] = [
    ['Hoy', TODAY, true],
    ['Hoy', '2026-11-05', false],
    ['Mañana', '2026-11-05', true],
    ['Esta semana', '2026-11-08', true],
    ['Esta semana', '2026-11-09', false],
    ['Esta semana', '2026-11-03', false],
    ['Próximas', '2026-12-01', true],
    ['Próximas', TODAY, false],
    ['Vencidas', '2026-11-03', true],
    ['Vencidas', TODAY, false],
    ['Algún día', '', true],
    ['Algún día', TODAY, false],
  ];
  it.each(cases)('%s con fecha %s → %s', (view, due, expected) => {
    expect(inSmartView(task({ due }), view, TODAY)).toBe(expected);
  });

  it('las hechas solo salen en «Todas»', () => {
    const done = task({ due: '2026-11-01', status: 'Hecho' });
    expect(inSmartView(done, 'Vencidas', TODAY)).toBe(false);
    expect(inSmartView(done, 'Todas', TODAY)).toBe(true);
  });

  it('la semana termina el domingo, también si hoy es domingo', () => {
    expect(endOfWeek(TODAY)).toBe('2026-11-08');
    expect(endOfWeek('2026-11-08')).toBe('2026-11-08');
    expect(endOfWeek('2026-11-09')).toBe('2026-11-15');
  });
});

describe('recurrencia', () => {
  it('avanza según la frecuencia', () => {
    expect(nextOccurrence(TODAY, 'Diaria', TODAY)).toBe('2026-11-05');
    expect(nextOccurrence(TODAY, 'Semanal', TODAY)).toBe('2026-11-11');
    expect(nextOccurrence(TODAY, 'Mensual', TODAY)).toBe('2026-12-04');
    expect(nextOccurrence(TODAY, 'Anual', TODAY)).toBe('2027-11-04');
  });

  it('el día 31 pasa al último día de un mes corto', () => {
    expect(nextOccurrence('2027-01-31', 'Mensual', '2027-01-31')).toBe('2027-02-28');
    expect(nextOccurrence('2028-02-29', 'Anual', '2028-02-29')).toBe('2029-02-28');
  });

  it('completada tarde, salta a la siguiente fecha futura', () => {
    expect(nextOccurrence('2026-10-01', 'Semanal', TODAY)).toBe('2026-11-05');
    expect(nextOccurrence('2026-09-05', 'Mensual', TODAY)).toBe('2026-11-05');
  });

  it('sin fecha cuenta desde hoy, y sin frecuencia no se repite', () => {
    expect(nextOccurrence('', 'Diaria', TODAY)).toBe('2026-11-05');
    expect(nextOccurrence(TODAY, '', TODAY)).toBeNull();
    expect(nextOccurrence(TODAY, 'Cada luna', TODAY)).toBeNull();
  });

  it('al completar una recurrente queda pendiente y reinicia sus subtareas', () => {
    const t = task({ due: TODAY, recurrence: 'Semanal', subtasks: [{ id: 'a', title: 'a', done: true }] });
    expect(completionPatch(t, TODAY)).toEqual({ status: 'Pendiente', due: '2026-11-11', lastDoneAt: TODAY, subtasks: [{ id: 'a', title: 'a', done: false }] });
    expect(completionPatch(task({ due: TODAY }), TODAY)).toEqual({ status: 'Hecho', lastDoneAt: TODAY });
  });
});

describe('dependencias', () => {
  const a = task({ id: 'a' });
  const b = task({ id: 'b', blockedBy: ['a'] });
  const c = task({ id: 'c', blockedBy: ['b'] });
  const all = [a, b, c];

  it('una tarea queda bloqueada mientras su requisito siga pendiente', () => {
    expect(blockers(b, all).map((t) => t.id)).toEqual(['a']);
    expect(blockers(b, [{ ...a, status: 'Hecho' }, b])).toEqual([]);
    expect(blockers(b, [b])).toEqual([]);
  });

  it('no ofrece requisitos que crearían un ciclo', () => {
    expect(dependencyCandidates('a', all)).toEqual([]);
    expect(dependencyCandidates('c', all).map((t) => t.id)).toEqual(['a', 'b']);
    expect(dependencyCandidates(undefined, all)).toHaveLength(3);
  });
});

describe('recordatorios', () => {
  const t = task({ due: TODAY, remindAt: '09:30' });

  it('avisa cuando llega la hora, una sola vez', () => {
    expect(dueReminders([t], TODAY, '09:29', new Set())).toEqual([]);
    expect(dueReminders([t], TODAY, '09:30', new Set())).toEqual([t]);
    expect(dueReminders([t], TODAY, '10:00', new Set([reminderKey(t)]))).toEqual([]);
  });

  it('no avisa de tareas hechas, de otro día o sin hora', () => {
    expect(dueReminders([{ ...t, status: 'Hecho' }, { ...t, due: '2026-11-05' }, { ...t, remindAt: '' }], TODAY, '23:59', new Set())).toEqual([]);
  });

  it('cambiar la hora vuelve a programar el aviso', () => {
    expect(reminderKey(t)).not.toBe(reminderKey({ ...t, remindAt: '11:00' }));
  });

  it('la hora se calcula en la zona horaria configurada', () => {
    expect(nowTime('America/Bogota', new Date('2026-11-04T14:05:00Z'))).toBe('09:05');
  });
});

it('lista las etiquetas sin repetir y en orden', () => {
  expect(allTags([task({ tags: ['b', 'a'] }), task({ tags: ['a'] })])).toEqual(['a', 'b']);
});
