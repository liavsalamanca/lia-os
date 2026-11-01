import { describe, expect, it } from 'vitest';
import { IndexedDbRepository } from '../idb';
import { normalizeSnapshot } from '../normalize';
import { emptySnapshot } from '../schema';
import { sanitizeRemote, SyncEngine, type RemoteRow, type RemoteStore } from './engine';
import { itemKey, planSync, timeOf, type SyncItem } from './plan';

const item = (id: string, modifiedAt: number, deleted = false): SyncItem => ({ collection: 'tasks', id, deleted, modifiedAt, data: deleted ? null : { id, title: id } });
const key = (id: string) => itemKey({ collection: 'tasks', id });

describe('planSync', () => {
  it('sube lo nuevo y baja lo ajeno', () => {
    const plan = planSync([item('mio', 1)], [item('ajeno', 2)], {});
    expect(plan.push.map((i) => i.id)).toEqual(['mio']);
    expect(plan.apply.map((i) => i.id)).toEqual(['ajeno']);
  });

  it('gana la versión más reciente en ambos sentidos', () => {
    expect(planSync([item('a', 5)], [item('a', 9)], {})).toMatchObject({ apply: [{ modifiedAt: 9 }], push: [] });
    expect(planSync([item('a', 9)], [item('a', 5)], {})).toMatchObject({ apply: [], push: [{ modifiedAt: 9 }] });
  });

  it('no repite lo ya sincronizado', () => {
    const plan = planSync([item('a', 5)], [item('a', 5)], {});
    expect(plan.apply).toEqual([]);
    expect(plan.push).toEqual([]);
    expect(planSync([item('a', 5)], [], plan.synced).push).toEqual([]);
  });

  it('un borrado más reciente gana a una edición antigua', () => {
    expect(planSync([item('a', 5)], [item('a', 9, true)], {}).apply).toHaveLength(1);
  });

  it('una edición más reciente gana a un borrado antiguo', () => {
    expect(planSync([item('a', 9)], [item('a', 5, true)], {}).push).toHaveLength(1);
  });

  it('no aplica borrados de lo que no existe aquí', () => {
    const plan = planSync([], [item('a', 5, true)], {});
    expect(plan.apply).toEqual([]);
    expect(plan.synced[key('a')]).toBe(5);
  });

  it('las fechas inválidas valen 0, no rompen', () => {
    expect(timeOf('')).toBe(0);
    expect(timeOf(undefined)).toBe(0);
  });
});

describe('sanitizeRemote', () => {
  it('descarta colecciones desconocidas y datos con forma equivocada', () => {
    expect(sanitizeRemote({ collection: 'futuro', id: 'x', deleted: false, modifiedAt: 1, data: {} })).toBeNull();
    expect(sanitizeRemote({ collection: '_habitLogs', id: 'x', deleted: false, modifiedAt: 1, data: 'no' })).toBeNull();
  });

  it('normaliza la configuración recibida', () => {
    const out = sanitizeRemote({ collection: '_settings', id: 'settings', deleted: false, modifiedAt: 1, data: { theme: 'raro', fx: 'x' } });
    expect(out?.data).toMatchObject({ theme: 'light', fx: 4000 });
  });
});

/** Nube en memoria con la misma regla que el trigger SQL. */
class FakeCloud implements RemoteStore {
  rows = new Map<string, RemoteRow>();
  private clock = 0;
  failPush = false;

  async pull(since: string | null) {
    return [...this.rows.values()].filter((r) => !since || r.updatedAt >= since);
  }

  async push(items: SyncItem[]) {
    if (this.failPush) throw new Error('Sin conexión');
    for (const item of items) {
      const current = this.rows.get(itemKey(item));
      if (current && item.modifiedAt < current.modifiedAt) continue;
      this.rows.set(itemKey(item), { ...item, data: item.deleted ? {} : item.data, updatedAt: new Date(Date.UTC(2026, 0, 1) + ++this.clock * 1000).toISOString() });
    }
  }
}

let n = 0;
async function device(cloud: FakeCloud) {
  const repo = await IndexedDbRepository.open(`device-${++n}`);
  return { repo, engine: new SyncEngine(repo, cloud), sync: () => new SyncEngine(repo, cloud).run() };
}

const task = (id: string, title: string, updatedAt = new Date().toISOString()) => normalizeSnapshot({ tasks: [{ id, title, updatedAt }] }).snapshot.tasks[0]!;
const titles = async (repo: IndexedDbRepository) => (await repo.load()).tasks.map((t) => t.title).sort();

describe('dos dispositivos', () => {
  it('un registro creado en uno llega al otro', async () => {
    const cloud = new FakeCloud();
    const [a, b] = [await device(cloud), await device(cloud)];
    await a.repo.putRecord('tasks', task('1', 'Desde el iPhone'));
    await a.sync();
    await b.sync();
    expect(await titles(b.repo)).toEqual(['Desde el iPhone']);
  });

  it('unir dos dispositivos con datos combina ambos sin perder nada', async () => {
    const cloud = new FakeCloud();
    const [a, b] = [await device(cloud), await device(cloud)];
    await a.repo.putRecord('tasks', task('1', 'A'));
    await b.repo.putRecord('tasks', task('2', 'B'));
    await a.sync();
    await b.sync();
    await a.sync();
    expect(await titles(a.repo)).toEqual(['A', 'B']);
    expect(await titles(b.repo)).toEqual(['A', 'B']);
  });

  it('un borrado se propaga y no reaparece', async () => {
    const cloud = new FakeCloud();
    const [a, b] = [await device(cloud), await device(cloud)];
    await a.repo.putRecord('tasks', task('1', 'x'));
    await a.sync();
    await b.sync();
    await a.repo.deleteRecord('tasks', '1');
    await a.sync();
    await b.sync();
    await a.sync();
    expect(await titles(b.repo)).toEqual([]);
    expect(await titles(a.repo)).toEqual([]);
  });

  it('el borrado no deja el contenido en la nube', async () => {
    const cloud = new FakeCloud();
    const a = await device(cloud);
    await a.repo.putRecord('tasks', task('1', 'secreto'));
    await a.sync();
    await a.repo.deleteRecord('tasks', '1');
    await a.sync();
    expect(JSON.stringify([...cloud.rows.values()])).not.toContain('secreto');
  });

  it('con ediciones cruzadas sin conexión gana la última', async () => {
    const cloud = new FakeCloud();
    const [a, b] = [await device(cloud), await device(cloud)];
    await a.repo.putRecord('tasks', task('1', 'base', '2026-01-01T00:00:00Z'));
    await a.sync();
    await b.sync();
    await a.repo.putRecord('tasks', task('1', 'tarde', '2026-01-03T00:00:00Z'));
    await b.repo.putRecord('tasks', task('1', 'temprano', '2026-01-02T00:00:00Z'));
    await a.sync();
    await b.sync();
    await a.sync();
    expect(await titles(a.repo)).toEqual(['tarde']);
    expect(await titles(b.repo)).toEqual(['tarde']);
  });

  it('sincroniza configuración e historial de hábitos', async () => {
    const cloud = new FakeCloud();
    const [a, b] = [await device(cloud), await device(cloud)];
    const settings = (await a.repo.load()).settings;
    await a.repo.putSettings({ ...settings, name: 'Nueva', fx: 4321 });
    await a.repo.putHabitLogs({ h1: ['2026-01-01'] });
    await a.sync();
    await b.sync();
    const loaded = await b.repo.load();
    expect(loaded.settings).toMatchObject({ name: 'Nueva', fx: 4321 });
    expect(loaded.habitLogs.h1).toEqual(['2026-01-01']);
  });

  it('un fallo de red no pierde nada y reintenta después', async () => {
    const cloud = new FakeCloud();
    const a = await device(cloud);
    await a.repo.putRecord('tasks', task('1', 'x'));
    cloud.failPush = true;
    await expect(a.sync()).rejects.toThrow('Sin conexión');
    cloud.failPush = false;
    await a.sync();
    expect(cloud.rows.size).toBeGreaterThan(0);
    expect([...cloud.rows.keys()]).toContain(key('1'));
  });

  it('una segunda pasada no sube ni baja nada', async () => {
    const cloud = new FakeCloud();
    const a = await device(cloud);
    await a.repo.putRecord('tasks', task('1', 'x'));
    await a.sync();
    expect(await a.sync()).toEqual({ applied: 0, pushed: 0 });
  });

  it('importar un respaldo antiguo se impone en todos los dispositivos', async () => {
    const cloud = new FakeCloud();
    const [a, b] = [await device(cloud), await device(cloud)];
    await a.repo.putRecord('tasks', task('1', 'actual'));
    await a.repo.putRecord('tasks', task('2', 'sobra'));
    await a.sync();
    await b.sync();
    await a.repo.replaceAll(normalizeSnapshot({ tasks: [task('1', 'restaurada', '2020-01-01T00:00:00Z')] }).snapshot);
    await a.sync();
    await b.sync();
    expect(await titles(b.repo)).toEqual(['restaurada']);
  });

  it('un cambio local hecho mientras llega la nube no se pisa', async () => {
    const cloud = new FakeCloud();
    const a = await device(cloud);
    await a.repo.putRecord('tasks', task('1', 'reciente', '2026-06-01T00:00:00Z'));
    await a.repo.applySyncItems([{ collection: 'tasks', id: '1', deleted: false, modifiedAt: Date.parse('2026-01-01T00:00:00Z'), data: task('1', 'vieja', '2026-01-01T00:00:00Z') }]);
    expect(await titles(a.repo)).toEqual(['reciente']);
  });

  it('borrar solo este dispositivo no genera borrados para la nube', async () => {
    const cloud = new FakeCloud();
    const a = await device(cloud);
    await a.repo.putRecord('tasks', task('1', 'x'));
    await a.sync();
    await a.repo.wipeDevice();
    expect(await a.repo.listSyncItems()).toEqual(expect.not.arrayContaining([expect.objectContaining({ deleted: true })]));
    await a.sync();
    expect(await titles(a.repo)).toEqual(['x']);
    expect(emptySnapshot().tasks).toEqual([]);
  });
});
