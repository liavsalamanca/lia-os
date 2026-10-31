import { normalizeSnapshot } from './normalize';
import type { Repository } from './repository';

/** Clave de la versión 1. Este módulo solo la lee; borrarla exige una acción explícita. */
export const LEGACY_KEY = 'lia-os-v1';
const IMPORTED_FLAG = 'legacyImported';

export type LegacyState =
  | { status: 'none' }
  | { status: 'corrupt'; raw: string }
  | { status: 'ok'; raw: string; data: Record<string, unknown> };

export function readLegacy(storage: Pick<Storage, 'getItem'> = localStorage): LegacyState {
  let raw: string | null;
  try {
    raw = storage.getItem(LEGACY_KEY);
  } catch {
    return { status: 'none' };
  }
  if (raw === null) return { status: 'none' };
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return { status: 'corrupt', raw };
    return { status: 'ok', raw, data: data as Record<string, unknown> };
  } catch {
    return { status: 'corrupt', raw };
  }
}

export type MigrationResult =
  | { status: 'none' | 'already-imported' }
  | { status: 'corrupt' }
  | { status: 'imported'; added: number; skipped: number };

/**
 * Copia los datos de v1 a v2 una sola vez. Si los datos están dañados no marca
 * nada, de modo que siguen disponibles para recuperarlos.
 */
export async function migrateLegacy(repo: Repository, storage?: Pick<Storage, 'getItem'>): Promise<MigrationResult> {
  if (await repo.getMeta<boolean>(IMPORTED_FLAG)) return { status: 'already-imported' };
  const legacy = readLegacy(storage);
  if (legacy.status === 'none') return { status: 'none' };
  if (legacy.status === 'corrupt') return { status: 'corrupt' };
  const { snapshot, skipped } = normalizeSnapshot(legacy.data);
  const added = await repo.mergeMissing(snapshot, { includeSettings: true });
  await repo.setMeta(IMPORTED_FLAG, true);
  return { status: 'imported', added, skipped };
}

/** Reimporta a petición de la usuaria: añade lo que falte, sin pisar lo actual. */
export async function reimportLegacy(repo: Repository, storage?: Pick<Storage, 'getItem'>): Promise<number | null> {
  const legacy = readLegacy(storage);
  if (legacy.status !== 'ok') return null;
  return repo.mergeMissing(normalizeSnapshot(legacy.data).snapshot, { includeSettings: false });
}
