export const SETTINGS_COLLECTION = '_settings';
export const HABIT_LOGS_COLLECTION = '_habitLogs';
export const SETTINGS_ID = 'settings';

/** Unidad que se sincroniza: un registro, un borrado, la configuración o el historial de un hábito. */
export type SyncItem = {
  collection: string;
  id: string;
  deleted: boolean;
  /** Milisegundos del último cambio en el dispositivo que lo hizo. */
  modifiedAt: number;
  data: unknown;
};

export type SyncedVersions = Record<string, number>;

export const itemKey = (item: Pick<SyncItem, 'collection' | 'id'>) => `${item.collection}\u0000${item.id}`;

export function timeOf(iso: unknown): number {
  const time = typeof iso === 'string' ? Date.parse(iso) : NaN;
  return Number.isNaN(time) ? 0 : time;
}

export type SyncPlan = { apply: SyncItem[]; push: SyncItem[]; synced: SyncedVersions };

/**
 * Última escritura gana, por elemento. Es una función pura: se decide qué bajar
 * y qué subir sin tocar ni la base local ni la nube.
 */
export function planSync(local: SyncItem[], remote: SyncItem[], previous: SyncedVersions): SyncPlan {
  const localByKey = new Map(local.map((item) => [itemKey(item), item]));
  const synced = { ...previous };
  const apply: SyncItem[] = [];
  const superseded = new Set<string>();

  for (const item of remote) {
    const key = itemKey(item);
    const mine = localByKey.get(key);
    if (mine && item.modifiedAt < mine.modifiedAt) continue;
    if (mine && mine.modifiedAt === item.modifiedAt) {
      synced[key] = item.modifiedAt;
      continue;
    }
    if (mine || !item.deleted) apply.push(item);
    synced[key] = item.modifiedAt;
    superseded.add(key);
  }

  const push = local.filter((item) => {
    const key = itemKey(item);
    return !superseded.has(key) && synced[key] !== item.modifiedAt;
  });
  return { apply, push, synced };
}
