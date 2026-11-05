import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_BACKUP_BYTES, parseBackup, serializeBackup } from './backup';
import { IndexedDbRepository } from './idb';
import { LEGACY_KEY, migrateLegacy, readLegacy, reimportLegacy } from './legacy';
import { isValidTimezone, normalizeSnapshot, stableId } from './normalize';
import { emptySnapshot } from './schema';

const v1 = {
  version: 1,
  settings: { name: 'Prueba', theme: 'dark', portfolio: '', focusMinutes: 25, shippingRate: 6, fx: 4100 },
  tasks: [
    { id: 't1', title: 'Editar reel', area: 'Taikinsa', priority: 'Alta', status: 'Pendiente', due: '2026-01-10', projectId: 'p1', notes: '', campoFuturo: 'se conserva' },
    { title: 'Tarea sin id', status: 'Hecho' },
    'basura',
  ],
  projects: [{ id: 'p1', name: 'Colección', area: 'Personal', status: 'En progreso', progress: '40', deadline: '', notes: '' }],
  habits: [{ id: 'h1', name: 'Leer', area: 'Bienestar', notes: '' }],
  habitLogs: { h1: ['2026-01-01', '2026-01-02'] },
  orders: [{ id: 'o1', client: 'Ana', item: 'Tenis', priceUSD: 100, weightLb: 2, marginPercent: 15 }],
  transactions: [],
  goals: [],
  products: [],
  content: [],
  ideas: [],
  castings: [],
  sources: [],
  journal: [],
  events: [],
};

const storageWith = (value: string | null) => ({ getItem: () => value });
let dbCounter = 0;
const openRepo = () => IndexedDbRepository.open(`test-${++dbCounter}`);

describe('normalizeSnapshot', () => {
  it('conserva campos desconocidos y convierte tipos', () => {
    const { snapshot, skipped } = normalizeSnapshot(v1);
    expect(snapshot.tasks[0]).toMatchObject({ id: 't1', campoFuturo: 'se conserva' });
    expect(snapshot.projects[0]?.progress).toBe(40);
    expect(snapshot.settings.timezone).toBe('America/Bogota');
    expect(skipped).toBe(1);
  });

  it('da el mismo id a un registro sin id en cada ejecución', () => {
    expect(stableId('tasks', { title: 'a' })).toBe(stableId('tasks', { title: 'a' }));
    expect(stableId('tasks', { title: 'a' })).not.toBe(stableId('tasks', { title: 'b' }));
    expect(normalizeSnapshot(v1).snapshot.tasks[1]?.id).toBe(normalizeSnapshot(v1).snapshot.tasks[1]?.id);
  });

  it('no convierte un casillero ausente en 0', () => {
    const order = normalizeSnapshot(v1).snapshot.orders[0];
    expect(order?.shippingRate).toBeUndefined();
    expect(order?.fx).toBeUndefined();
  });

  it('elimina ids duplicados dentro de una colección', () => {
    const { snapshot } = normalizeSnapshot({ tasks: [{ id: 'x', title: 'a' }, { id: 'x', title: 'b' }] });
    expect(snapshot.tasks).toHaveLength(1);
  });
});

describe('IndexedDbRepository', () => {
  it('guarda, recupera y elimina registros', async () => {
    const repo = await openRepo();
    const { snapshot } = normalizeSnapshot(v1);
    await repo.putRecord('tasks', snapshot.tasks[0]!);
    expect((await repo.load()).tasks.map((t) => t.id)).toEqual(['t1']);
    await repo.deleteRecord('tasks', 't1');
    expect((await repo.load()).tasks).toEqual([]);
  });

  it('los datos sobreviven al reabrir la base', async () => {
    const name = `reopen-${++dbCounter}`;
    const first = await IndexedDbRepository.open(name);
    await first.replaceAll(normalizeSnapshot(v1).snapshot);
    first.close();
    const second = await IndexedDbRepository.open(name);
    const loaded = await second.load();
    expect(loaded.tasks).toHaveLength(2);
    expect(loaded.settings.name).toBe('Prueba');
    expect(loaded.habitLogs.h1).toHaveLength(2);
  });

  it('mergeMissing no pisa registros existentes', async () => {
    const repo = await openRepo();
    const { snapshot } = normalizeSnapshot(v1);
    const edited = { ...snapshot.tasks[0]!, title: 'Editada en v2' };
    await repo.putRecord('tasks', edited);
    const added = await repo.mergeMissing(snapshot, { includeSettings: false });
    const tasks = (await repo.load()).tasks;
    expect(tasks.find((t) => t.id === 't1')?.title).toBe('Editada en v2');
    expect(added).toBe(4);
  });

  it('conserva solo los últimos cinco respaldos', async () => {
    const repo = await openRepo();
    for (let i = 0; i < 7; i++) await repo.addBackup(`r${i}`, emptySnapshot());
    expect(await repo.listBackups()).toHaveLength(5);
  });
});

describe('migración desde v1', () => {
  let raw: string;
  beforeEach(() => {
    raw = JSON.stringify(v1);
  });

  it('copia todos los datos', async () => {
    const repo = await openRepo();
    const result = await migrateLegacy(repo, storageWith(raw));
    expect(result).toEqual({ status: 'imported', added: 5, skipped: 1 });
    const loaded = await repo.load();
    expect(loaded.tasks).toHaveLength(2);
    expect(loaded.settings.fx).toBe(4100);
    expect(loaded.habitLogs.h1).toEqual(['2026-01-01', '2026-01-02']);
  });

  it('es idempotente', async () => {
    const repo = await openRepo();
    await migrateLegacy(repo, storageWith(raw));
    expect(await migrateLegacy(repo, storageWith(raw))).toEqual({ status: 'already-imported' });
    expect(await reimportLegacy(repo, storageWith(raw))).toBe(0);
    expect((await repo.load()).tasks).toHaveLength(2);
  });

  it('no vuelve a importar lo que se borró después de migrar', async () => {
    const repo = await openRepo();
    await migrateLegacy(repo, storageWith(raw));
    await repo.deleteRecord('tasks', 't1');
    await migrateLegacy(repo, storageWith(raw));
    expect((await repo.load()).tasks).toHaveLength(1);
  });

  it('nunca escribe en la clave v1', async () => {
    localStorage.setItem(LEGACY_KEY, raw);
    const repo = await openRepo();
    await migrateLegacy(repo);
    expect(localStorage.getItem(LEGACY_KEY)).toBe(raw);
    localStorage.removeItem(LEGACY_KEY);
  });

  it('con datos dañados no marca la migración ni pierde el original', async () => {
    const repo = await openRepo();
    const result = await migrateLegacy(repo, storageWith('{dañado'));
    expect(result).toEqual({ status: 'corrupt' });
    expect(readLegacy(storageWith('{dañado'))).toEqual({ status: 'corrupt', raw: '{dañado' });
    expect(await migrateLegacy(repo, storageWith(raw))).toMatchObject({ status: 'imported' });
  });

  it('sin datos v1 no hace nada', async () => {
    expect(await migrateLegacy(await openRepo(), storageWith(null))).toEqual({ status: 'none' });
  });
});

describe('respaldos', () => {
  it('ida y vuelta conserva los datos', () => {
    const { snapshot } = normalizeSnapshot(v1);
    expect(parseBackup(serializeBackup(snapshot)).snapshot).toEqual(snapshot);
  });

  it('acepta un respaldo de v1', () => {
    expect(parseBackup(JSON.stringify(v1)).snapshot.tasks).toHaveLength(2);
  });

  it.each([
    ['no JSON', 'hola'],
    ['un arreglo', '[]'],
    ['un objeto ajeno', '{"foo":1}'],
    ['tareas que no son lista', '{"tasks":1,"projects":[],"settings":{}}'],
  ])('rechaza %s', (_name, text) => {
    expect(() => parseBackup(text)).toThrow();
  });

  it('rechaza archivos demasiado grandes', () => {
    expect(() => parseBackup(' '.repeat(MAX_BACKUP_BYTES + 1))).toThrow('demasiado grande');
  });
});

describe('zona horaria', () => {
  it('una zona inválida, venga de un respaldo o de la nube, vuelve a la de Bogotá', () => {
    expect(normalizeSnapshot({ settings: { timezone: 'Marte/Olympus' } }).snapshot.settings.timezone).toBe('America/Bogota');
    expect(normalizeSnapshot({ settings: { timezone: 'Europe/Madrid' } }).snapshot.settings.timezone).toBe('Europe/Madrid');
    expect(isValidTimezone('')).toBe(false);
  });
});
