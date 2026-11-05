import { COLLECTIONS, defaultSettings, emptySnapshot, schemas, SCHEMA_VERSION, type HabitLogs, type Settings, type Snapshot } from './schema';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Id estable a partir del contenido: repetir la migración no crea duplicados. */
export function stableId(collection: string, value: unknown): string {
  const input = `${collection}:${JSON.stringify(value)}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `legacy-${(hash >>> 0).toString(36)}-${input.length.toString(36)}`;
}

/** Una zona que el navegador no reconoce haría fallar todas las fechas. */
export function isValidTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || !value) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function normalizeSettings(raw: unknown): Settings {
  const s = isObject(raw) ? raw : {};
  const positive = (v: unknown, fallback: number) => (Number.isFinite(Number(v)) && Number(v) >= 0 && v !== '' && v != null ? Number(v) : fallback);
  return {
    name: typeof s.name === 'string' && s.name.trim() ? s.name : defaultSettings.name,
    theme: s.theme === 'dark' ? 'dark' : 'light',
    portfolio: typeof s.portfolio === 'string' ? s.portfolio : '',
    focusMinutes: positive(s.focusMinutes, defaultSettings.focusMinutes),
    shippingRate: positive(s.shippingRate, defaultSettings.shippingRate),
    fx: positive(s.fx, defaultSettings.fx) || defaultSettings.fx,
    timezone: isValidTimezone(s.timezone) ? s.timezone : defaultSettings.timezone,
    appleCalendarUrl: typeof s.appleCalendarUrl === 'string' ? s.appleCalendarUrl : '',
  };
}

function normalizeHabitLogs(raw: unknown): HabitLogs {
  if (!isObject(raw)) return {};
  const out: HabitLogs = {};
  for (const [id, dates] of Object.entries(raw)) {
    if (Array.isArray(dates)) out[id] = dates.filter((d): d is string => typeof d === 'string');
  }
  return out;
}

export type NormalizeReport = { snapshot: Snapshot; skipped: number };

/** Convierte cualquier forma guardada (v1 o v2) en un Snapshot válido. */
export function normalizeSnapshot(raw: Record<string, unknown>): NormalizeReport {
  const snapshot = emptySnapshot();
  let skipped = 0;
  for (const collection of COLLECTIONS) {
    const list = raw[collection];
    if (!Array.isArray(list)) continue;
    const seen = new Set<string>();
    const out: unknown[] = [];
    for (const item of list) {
      if (!isObject(item)) {
        skipped++;
        continue;
      }
      const id = typeof item.id === 'string' && item.id ? item.id : stableId(collection, item);
      if (seen.has(id)) continue;
      seen.add(id);
      const parsed = schemas[collection].safeParse({ ...item, id });
      if (parsed.success) out.push(parsed.data);
      else skipped++;
    }
    (snapshot[collection] as unknown[]) = out;
  }
  snapshot.settings = normalizeSettings(raw.settings);
  snapshot.habitLogs = normalizeHabitLogs(raw.habitLogs);
  snapshot.schemaVersion = SCHEMA_VERSION;
  return { snapshot, skipped };
}
