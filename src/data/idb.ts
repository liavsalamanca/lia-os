import { COLLECTIONS, emptySnapshot, SCHEMA_VERSION, type Collection, type HabitLogs, type RecordOf, type Settings, type Snapshot } from './schema';
import type { BackupEntry, Repository } from './repository';
import type { SyncLocal } from './sync/engine';
import { HABIT_LOGS_COLLECTION, SETTINGS_COLLECTION, SETTINGS_ID, timeOf, type SyncItem } from './sync/plan';

export const DB_NAME = 'lia-os';
const MAX_BACKUPS = 5;
const TOMB_PREFIX = 'tomb:';
const SETTINGS_TIME = 'time:settings';
const HABIT_TIMES = 'time:habitLogs';

type Row = { collection: Collection; id: string; data: unknown };
type Tomb = { collection: string; id: string; at: number };
type Times = Record<string, number>;

const tombKey = (collection: string, id: string) => `${TOMB_PREFIX}${collection}:${id}`;
const recordTime = (record: { updatedAt?: string; createdAt?: string }) => timeOf(record.updatedAt) || timeOf(record.createdAt);

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transacción cancelada'));
  });
}

function openDb(name: string): Promise<IDBDatabase> {
  const req = indexedDB.open(name, 1);
  req.onupgradeneeded = () => {
    const db = req.result;
    // Un único almacén de registros: añadir módulos no exige subir la versión.
    db.createObjectStore('records', { keyPath: ['collection', 'id'] }).createIndex('collection', 'collection');
    db.createObjectStore('kv');
    db.createObjectStore('backups', { keyPath: 'id' });
  };
  return request(req);
}

export class IndexedDbRepository implements Repository, SyncLocal {
  private constructor(private db: IDBDatabase) {
    db.onversionchange = () => db.close();
  }

  static async open(name = DB_NAME): Promise<IndexedDbRepository> {
    return new IndexedDbRepository(await openDb(name));
  }

  close() {
    this.db.close();
  }

  async load(): Promise<Snapshot> {
    const tx = this.db.transaction(['records', 'kv']);
    const [rows, settings, habitLogs] = await Promise.all([
      request(tx.objectStore('records').getAll() as IDBRequest<Row[]>),
      request(tx.objectStore('kv').get('settings') as IDBRequest<Settings | undefined>),
      request(tx.objectStore('kv').get('habitLogs') as IDBRequest<HabitLogs | undefined>),
    ]);
    const snapshot = emptySnapshot();
    for (const row of rows) (snapshot[row.collection] as unknown[]).push(row.data);
    if (settings) snapshot.settings = { ...snapshot.settings, ...settings };
    if (habitLogs) snapshot.habitLogs = habitLogs;
    return snapshot;
  }

  async putRecord<C extends Collection>(collection: C, record: RecordOf<C>) {
    const tx = this.db.transaction(['records', 'kv'], 'readwrite');
    tx.objectStore('records').put({ collection, id: record.id, data: record } satisfies Row);
    tx.objectStore('kv').delete(tombKey(collection, record.id));
    await done(tx);
  }

  async deleteRecord(collection: Collection, id: string) {
    const tx = this.db.transaction(['records', 'kv'], 'readwrite');
    const records = tx.objectStore('records');
    const existing = records.get([collection, id]) as IDBRequest<Row | undefined>;
    existing.onsuccess = () => {
      // Con un reloj atrasado, el borrado debe seguir siendo posterior a lo que borra.
      const at = Math.max(Date.now(), existing.result ? recordTime(existing.result.data as object) + 1 : 0);
      records.delete([collection, id]);
      tx.objectStore('kv').put({ collection, id, at } satisfies Tomb, tombKey(collection, id));
    };
    await done(tx);
  }

  private async putKv(key: string, value: unknown) {
    const tx = this.db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    await done(tx);
  }

  async putSettings(settings: Settings) {
    const tx = this.db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(settings, 'settings');
    tx.objectStore('kv').put(Date.now(), SETTINGS_TIME);
    await done(tx);
  }

  async putHabitLogs(logs: HabitLogs) {
    const tx = this.db.transaction('kv', 'readwrite');
    const kv = tx.objectStore('kv');
    const previous = kv.get('habitLogs') as IDBRequest<HabitLogs | undefined>;
    const times = kv.get(HABIT_TIMES) as IDBRequest<Times | undefined>;
    times.onsuccess = () => {
      const before = previous.result ?? {};
      const stamped: Times = { ...times.result };
      const now = Date.now();
      for (const id of Object.keys(logs)) {
        if (JSON.stringify(before[id]) !== JSON.stringify(logs[id])) {
          stamped[id] = now;
          kv.delete(tombKey(HABIT_LOGS_COLLECTION, id));
        }
      }
      for (const id of Object.keys(before)) {
        if (!(id in logs)) {
          delete stamped[id];
          kv.put({ collection: HABIT_LOGS_COLLECTION, id, at: now } satisfies Tomb, tombKey(HABIT_LOGS_COLLECTION, id));
        }
      }
      kv.put(logs, 'habitLogs');
      kv.put(stamped, HABIT_TIMES);
    };
    await done(tx);
  }

  /** Lo reemplazado cuenta como cambio de ahora: un respaldo antiguo debe imponerse en todos lados. */
  async replaceAll(snapshot: Snapshot) {
    const current = await this.load();
    const now = Date.now();
    const stamp = new Date(now).toISOString();
    const tx = this.db.transaction(['records', 'kv'], 'readwrite');
    const records = tx.objectStore('records');
    const kv = tx.objectStore('kv');
    records.clear();
    for (const collection of COLLECTIONS) {
      const keep = new Set(snapshot[collection].map((r) => r.id));
      for (const old of current[collection]) {
        if (!keep.has(old.id)) kv.put({ collection, id: old.id, at: now } satisfies Tomb, tombKey(collection, old.id));
      }
      for (const record of snapshot[collection]) {
        records.put({ collection, id: record.id, data: { ...record, updatedAt: stamp } } satisfies Row);
        kv.delete(tombKey(collection, record.id));
      }
    }
    for (const id of Object.keys(current.habitLogs)) {
      if (!(id in snapshot.habitLogs)) kv.put({ collection: HABIT_LOGS_COLLECTION, id, at: now } satisfies Tomb, tombKey(HABIT_LOGS_COLLECTION, id));
    }
    kv.put(Object.fromEntries(Object.keys(snapshot.habitLogs).map((id) => [id, now])), HABIT_TIMES);
    kv.put(snapshot.settings, 'settings');
    kv.put(now, SETTINGS_TIME);
    kv.put(snapshot.habitLogs, 'habitLogs');
    kv.put(SCHEMA_VERSION, 'schemaVersion');
    await done(tx);
  }

  async mergeMissing(snapshot: Snapshot, options: { includeSettings: boolean }) {
    const current = await this.load();
    const tx = this.db.transaction(['records', 'kv'], 'readwrite');
    const records = tx.objectStore('records');
    const kv = tx.objectStore('kv');
    let added = 0;
    for (const collection of COLLECTIONS) {
      const existing = new Set(current[collection].map((r) => r.id));
      for (const record of snapshot[collection]) {
        if (existing.has(record.id)) continue;
        records.put({ collection, id: record.id, data: record } satisfies Row);
        kv.delete(tombKey(collection, record.id));
        added++;
      }
    }
    const logs: HabitLogs = { ...current.habitLogs };
    for (const [id, dates] of Object.entries(snapshot.habitLogs)) {
      logs[id] = [...new Set([...(logs[id] ?? []), ...dates])];
    }
    kv.put(logs, 'habitLogs');
    if (options.includeSettings) {
      kv.put(snapshot.settings, 'settings');
      kv.put(Date.now(), SETTINGS_TIME);
    }
    await done(tx);
    return added;
  }

  async listSyncItems(): Promise<SyncItem[]> {
    const snapshot = await this.load();
    const tx = this.db.transaction('kv');
    const kv = tx.objectStore('kv');
    const [tombs, settingsAt, habitTimes] = await Promise.all([
      request(kv.getAll(IDBKeyRange.bound(TOMB_PREFIX, `${TOMB_PREFIX}￿`)) as IDBRequest<Tomb[]>),
      request(kv.get(SETTINGS_TIME) as IDBRequest<number | undefined>),
      request(kv.get(HABIT_TIMES) as IDBRequest<Times | undefined>),
    ]);
    const items: SyncItem[] = [{ collection: SETTINGS_COLLECTION, id: SETTINGS_ID, deleted: false, modifiedAt: settingsAt ?? 0, data: snapshot.settings }];
    for (const collection of COLLECTIONS) {
      for (const record of snapshot[collection]) items.push({ collection, id: record.id, deleted: false, modifiedAt: recordTime(record), data: record });
    }
    for (const [id, dates] of Object.entries(snapshot.habitLogs)) {
      items.push({ collection: HABIT_LOGS_COLLECTION, id, deleted: false, modifiedAt: habitTimes?.[id] ?? 0, data: dates });
    }
    for (const tomb of tombs) items.push({ collection: tomb.collection, id: tomb.id, deleted: true, modifiedAt: tomb.at, data: null });
    return items;
  }

  /** Aplica lo recibido, sin pisar lo que haya cambiado aquí mientras llegaba. */
  async applySyncItems(items: SyncItem[]) {
    const tx = this.db.transaction(['records', 'kv'], 'readwrite');
    const records = tx.objectStore('records');
    const kv = tx.objectStore('kv');
    const logsReq = kv.get('habitLogs') as IDBRequest<HabitLogs | undefined>;
    const timesReq = kv.get(HABIT_TIMES) as IDBRequest<Times | undefined>;

    timesReq.onsuccess = () => {
      const logs: HabitLogs = { ...logsReq.result };
      const times: Times = { ...timesReq.result };
      for (const item of items) {
        if (item.collection === SETTINGS_COLLECTION) {
          kv.put(item.data, 'settings');
          kv.put(item.modifiedAt, SETTINGS_TIME);
        } else if (item.collection === HABIT_LOGS_COLLECTION) {
          if (item.modifiedAt < (times[item.id] ?? 0)) continue;
          if (item.deleted) {
            delete logs[item.id];
            delete times[item.id];
            kv.put({ collection: item.collection, id: item.id, at: item.modifiedAt } satisfies Tomb, tombKey(item.collection, item.id));
          } else {
            logs[item.id] = item.data as string[];
            times[item.id] = item.modifiedAt;
            kv.delete(tombKey(item.collection, item.id));
          }
        } else {
          const existing = records.get([item.collection, item.id]) as IDBRequest<Row | undefined>;
          existing.onsuccess = () => {
            const row = existing.result;
            if (row && recordTime(row.data as object) > item.modifiedAt) return;
            if (item.deleted) {
              records.delete([item.collection, item.id]);
              kv.put({ collection: item.collection, id: item.id, at: item.modifiedAt } satisfies Tomb, tombKey(item.collection, item.id));
            } else {
              records.put({ collection: item.collection as Collection, id: item.id, data: item.data });
              kv.delete(tombKey(item.collection, item.id));
            }
          };
        }
      }
      kv.put(logs, 'habitLogs');
      kv.put(times, HABIT_TIMES);
    };
    await done(tx);
  }

  async wipeDevice() {
    const tx = this.db.transaction(['records', 'kv', 'backups'], 'readwrite');
    const kv = tx.objectStore('kv');
    tx.objectStore('records').clear();
    tx.objectStore('backups').clear();
    const imported = kv.get('meta:legacyImported');
    imported.onsuccess = () => {
      kv.clear();
      // Sin esta marca, la copia de v1 volvería a importarse al recargar.
      if (imported.result) kv.put(imported.result, 'meta:legacyImported');
    };
    await done(tx);
  }

  async getMeta<T>(key: string) {
    return request(this.db.transaction('kv').objectStore('kv').get(`meta:${key}`) as IDBRequest<T | undefined>);
  }

  setMeta(key: string, value: unknown) {
    return this.putKv(`meta:${key}`, value);
  }

  async addBackup(reason: string, snapshot: Snapshot) {
    const entry: BackupEntry = { id: crypto.randomUUID(), reason, createdAt: new Date().toISOString(), snapshot };
    const existing = await this.listBackups();
    const tx = this.db.transaction('backups', 'readwrite');
    const store = tx.objectStore('backups');
    store.put(entry);
    for (const old of existing.slice(MAX_BACKUPS - 1)) store.delete(old.id);
    await done(tx);
  }

  async clearBackups() {
    const tx = this.db.transaction('backups', 'readwrite');
    tx.objectStore('backups').clear();
    await done(tx);
  }

  async listBackups() {
    const entries = await request(this.db.transaction('backups').objectStore('backups').getAll() as IDBRequest<BackupEntry[]>);
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
