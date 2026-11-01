import { normalizeSnapshot } from '../normalize';
import { COLLECTIONS, schemas, type Collection } from '../schema';
import { HABIT_LOGS_COLLECTION, itemKey, planSync, SETTINGS_COLLECTION, type SyncedVersions, type SyncItem } from './plan';

export type RemoteRow = SyncItem & { updatedAt: string };

/** Lo que el motor necesita de la nube. Permite probarlo sin red. */
export interface RemoteStore {
  /** Filas que llegaron al servidor desde `since`, o todas si es null. */
  pull(since: string | null): Promise<RemoteRow[]>;
  push(items: SyncItem[]): Promise<void>;
}

export interface SyncLocal {
  listSyncItems(): Promise<SyncItem[]>;
  applySyncItems(items: SyncItem[]): Promise<void>;
  getMeta<T>(key: string): Promise<T | undefined>;
  setMeta(key: string, value: unknown): Promise<void>;
}

export const SYNC_STATE_KEY = 'syncState';
const PUSH_BATCH = 200;
/** Margen ante transacciones que terminan fuera de orden: repetir una fila es inofensivo. */
const CURSOR_OVERLAP_MS = 60_000;

type SyncState = { cursor: string | null; synced: SyncedVersions };

/** La nube se trata como entrada externa: lo que no se reconoce no entra a la base local. */
export function sanitizeRemote(row: SyncItem): SyncItem | null {
  if (row.deleted) return { ...row, data: null };
  if (row.collection === SETTINGS_COLLECTION) {
    return { ...row, data: normalizeSnapshot({ settings: row.data }).snapshot.settings };
  }
  if (row.collection === HABIT_LOGS_COLLECTION) {
    return Array.isArray(row.data) ? { ...row, data: row.data.filter((d) => typeof d === 'string') } : null;
  }
  if (!COLLECTIONS.includes(row.collection as Collection)) return null;
  const parsed = schemas[row.collection as Collection].safeParse({ ...(row.data as object), id: row.id });
  return parsed.success ? { ...row, data: parsed.data } : null;
}

export class SyncEngine {
  private running: Promise<{ applied: number; pushed: number }> | null = null;
  private again = false;

  constructor(
    private local: SyncLocal,
    private remote: RemoteStore,
  ) {}

  /** Nunca corren dos a la vez; un pedido durante una pasada provoca otra al terminar. */
  run() {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = this.pass().finally(() => {
      this.running = null;
      if (this.again) {
        this.again = false;
        void this.run().catch(() => undefined);
      }
    });
    return this.running;
  }

  private async pass() {
    const state = (await this.local.getMeta<SyncState>(SYNC_STATE_KEY)) ?? { cursor: null, synced: {} };
    const since = state.cursor ? new Date(Date.parse(state.cursor) - CURSOR_OVERLAP_MS).toISOString() : null;
    const rows = await this.remote.pull(since);
    const remote = rows.map(sanitizeRemote).filter((item): item is SyncItem => item !== null);

    const plan = planSync(await this.local.listSyncItems(), remote, state.synced);
    if (plan.apply.length) await this.local.applySyncItems(plan.apply);

    const cursor = rows.reduce<string | null>((latest, r) => (!latest || r.updatedAt > latest ? r.updatedAt : latest), state.cursor);
    // Se guarda antes de subir: si la subida falla no se repite lo ya aplicado.
    await this.local.setMeta(SYNC_STATE_KEY, { cursor, synced: plan.synced } satisfies SyncState);

    for (let i = 0; i < plan.push.length; i += PUSH_BATCH) {
      const batch = plan.push.slice(i, i + PUSH_BATCH);
      await this.remote.push(batch);
      for (const item of batch) plan.synced[itemKey(item)] = item.modifiedAt;
      await this.local.setMeta(SYNC_STATE_KEY, { cursor, synced: plan.synced } satisfies SyncState);
    }
    return { applied: plan.apply.length, pushed: plan.push.length };
  }
}
