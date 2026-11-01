import { COLLECTIONS, emptySnapshot, SCHEMA_VERSION, type Collection, type HabitLogs, type RecordOf, type Settings, type Snapshot } from './schema';
import type { BackupEntry, Repository } from './repository';

export const DB_NAME = 'lia-os';
const MAX_BACKUPS = 5;

type Row = { collection: Collection; id: string; data: unknown };

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

export class IndexedDbRepository implements Repository {
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
    const tx = this.db.transaction('records', 'readwrite');
    tx.objectStore('records').put({ collection, id: record.id, data: record } satisfies Row);
    await done(tx);
  }

  async deleteRecord(collection: Collection, id: string) {
    const tx = this.db.transaction('records', 'readwrite');
    tx.objectStore('records').delete([collection, id]);
    await done(tx);
  }

  private async putKv(key: string, value: unknown) {
    const tx = this.db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    await done(tx);
  }

  putSettings(settings: Settings) {
    return this.putKv('settings', settings);
  }

  putHabitLogs(logs: HabitLogs) {
    return this.putKv('habitLogs', logs);
  }

  async replaceAll(snapshot: Snapshot) {
    const tx = this.db.transaction(['records', 'kv'], 'readwrite');
    const records = tx.objectStore('records');
    records.clear();
    for (const collection of COLLECTIONS) {
      for (const record of snapshot[collection]) records.put({ collection, id: record.id, data: record } satisfies Row);
    }
    tx.objectStore('kv').put(snapshot.settings, 'settings');
    tx.objectStore('kv').put(snapshot.habitLogs, 'habitLogs');
    tx.objectStore('kv').put(SCHEMA_VERSION, 'schemaVersion');
    await done(tx);
  }

  async mergeMissing(snapshot: Snapshot, options: { includeSettings: boolean }) {
    const current = await this.load();
    const tx = this.db.transaction(['records', 'kv'], 'readwrite');
    const records = tx.objectStore('records');
    let added = 0;
    for (const collection of COLLECTIONS) {
      const existing = new Set(current[collection].map((r) => r.id));
      for (const record of snapshot[collection]) {
        if (existing.has(record.id)) continue;
        records.put({ collection, id: record.id, data: record } satisfies Row);
        added++;
      }
    }
    const logs: HabitLogs = { ...current.habitLogs };
    for (const [id, dates] of Object.entries(snapshot.habitLogs)) {
      logs[id] = [...new Set([...(logs[id] ?? []), ...dates])];
    }
    tx.objectStore('kv').put(logs, 'habitLogs');
    if (options.includeSettings) tx.objectStore('kv').put(snapshot.settings, 'settings');
    await done(tx);
    return added;
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
