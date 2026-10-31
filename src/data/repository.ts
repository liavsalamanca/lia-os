import type { Collection, HabitLogs, RecordOf, Settings, Snapshot } from './schema';

export type BackupEntry = { id: string; reason: string; createdAt: string; snapshot: Snapshot };

/**
 * Contrato de persistencia. Es asíncrono para que un adaptador de Supabase
 * (Fase 3) pueda sustituir a IndexedDB sin cambiar los módulos.
 */
export interface Repository {
  load(): Promise<Snapshot>;
  putRecord<C extends Collection>(collection: C, record: RecordOf<C>): Promise<void>;
  deleteRecord(collection: Collection, id: string): Promise<void>;
  putSettings(settings: Settings): Promise<void>;
  putHabitLogs(logs: HabitLogs): Promise<void>;
  replaceAll(snapshot: Snapshot): Promise<void>;
  /** Añade solo los registros cuyo id no existe; nunca pisa los actuales. */
  mergeMissing(snapshot: Snapshot, options: { includeSettings: boolean }): Promise<number>;
  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta(key: string, value: unknown): Promise<void>;
  addBackup(reason: string, snapshot: Snapshot): Promise<void>;
  listBackups(): Promise<BackupEntry[]>;
  clearBackups(): Promise<void>;
}
