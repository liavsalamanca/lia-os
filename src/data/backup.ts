import { normalizeSnapshot, type NormalizeReport } from './normalize';
import type { Snapshot } from './schema';

export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

export function serializeBackup(snapshot: Snapshot, exportedAt = new Date().toISOString()): string {
  return JSON.stringify({ ...snapshot, app: 'lia-os', exportedAt }, null, 2);
}

/** Acepta respaldos de v1 y v2. Lanza un error legible si el archivo no es válido. */
export function parseBackup(text: string): NormalizeReport {
  if (text.length > MAX_BACKUP_BYTES) throw new Error('El archivo es demasiado grande.');
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('El formato no corresponde a LIA OS.');
  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.tasks) || !Array.isArray(data.projects) || typeof data.settings !== 'object' || data.settings === null) {
    throw new Error('El formato no corresponde a LIA OS.');
  }
  return normalizeSnapshot(data);
}
