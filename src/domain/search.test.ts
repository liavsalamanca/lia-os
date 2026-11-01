import { describe, expect, it } from 'vitest';
import { normalizeSnapshot } from '../data/normalize';
import { matches, recordTitle, searchAll } from './search';

const { snapshot } = normalizeSnapshot({
  tasks: [{ id: 't', title: 'Reunión con Mariè' }],
  orders: [{ id: 'o', client: 'Ana', item: 'Tenis' }],
  ideas: [{ id: 'secreto', title: 'Otra' }],
});

describe('búsqueda global', () => {
  it('ignora mayúsculas y acentos', () => {
    expect(matches('Reunión', 'REUNION')).toBe(true);
    expect(searchAll(snapshot, 'marie').map((h) => h.id)).toEqual(['t']);
  });

  it('busca en todas las colecciones y devuelve el título legible', () => {
    expect(searchAll(snapshot, 'ana')).toEqual([{ collection: 'orders', id: 'o', title: 'Tenis' }]);
  });

  it('no busca en el id', () => {
    expect(searchAll(snapshot, 'secreto')).toEqual([]);
  });

  it('una búsqueda vacía no devuelve nada', () => {
    expect(searchAll(snapshot, '   ')).toEqual([]);
  });

  it('el título cae en un texto genérico si no hay campos conocidos', () => {
    expect(recordTitle({ foo: 1 })).toBe('Registro');
  });
});
