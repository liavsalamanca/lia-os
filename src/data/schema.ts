import { z } from 'zod';

/**
 * Esquemas de almacenamiento. Son tolerantes a propósito: nunca rechazan un
 * registro y conservan los campos desconocidos, para que migrar o importar no
 * pierda información. La validación estricta vive en los formularios.
 */
export const SCHEMA_VERSION = 2;

const text = z.unknown().optional().transform((v) => (typeof v === 'string' ? v : v == null ? '' : String(v)));
const amount = z.unknown().optional().transform((v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
});
const optionalAmount = z.unknown().optional().transform((v) => {
  if (v === '' || v == null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
});

/** Lista de textos; acepta también "a, b" escrito a mano. */
const textList = z.unknown().optional().transform((v): string[] => {
  const items = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  return [...new Set(items.filter((s): s is string => typeof s === 'string').map((s) => s.trim()).filter(Boolean))];
});
const subtaskList = z.unknown().optional().transform((v) =>
  (Array.isArray(v) ? v : []).flatMap((s, i) => {
    if (typeof s === 'string') return s.trim() ? [{ id: `s${i}`, title: s.trim(), done: false }] : [];
    if (typeof s !== 'object' || s === null) return [];
    const { id, title, done } = s as Record<string, unknown>;
    if (typeof title !== 'string' || !title.trim()) return [];
    return [{ id: typeof id === 'string' && id ? id : `s${i}`, title, done: done === true }];
  }),
);

const base = { id: z.string().min(1), createdAt: text, updatedAt: text };
const record = <T extends z.ZodRawShape>(shape: T) => z.looseObject({ ...base, ...shape });

export const schemas = {
  tasks: record({
    title: text,
    area: text,
    priority: text,
    status: text,
    due: text,
    projectId: text,
    notes: text,
    tags: textList,
    subtasks: subtaskList,
    recurrence: text,
    blockedBy: textList,
    remindAt: text,
    lastDoneAt: text,
  }),
  projects: record({ name: text, area: text, status: text, progress: amount, deadline: text, notes: text }),
  events: record({ title: text, date: text, time: text, area: text, notes: text }),
  habits: record({ name: text, area: text, notes: text }),
  transactions: record({ kind: text, amount, description: text, date: text, area: text, category: text, notes: text }),
  goals: record({ name: text, target: amount, current: amount, deadline: text }),
  orders: record({
    client: text,
    item: text,
    store: text,
    status: text,
    priceUSD: amount,
    shippingUSD: amount,
    weightLb: amount,
    shippingRate: optionalAmount,
    extraUSD: amount,
    fx: optionalAmount,
    marginPercent: amount,
    notes: text,
  }),
  products: record({ name: text, brand: text, stock: amount, costCOP: amount, priceCOP: amount, notes: text }),
  content: record({ title: text, format: text, platform: text, status: text, publishDate: text, notes: text }),
  ideas: record({ title: text, area: text, type: text, status: text, link: text, description: text }),
  castings: record({ brand: text, type: text, date: text, status: text, feeCOP: amount, notes: text }),
  sources: record({ title: text, author: text, status: text, link: text, insight: text }),
  journal: record({ title: text, date: text, mood: text, entry: text }),
};

export type Collection = keyof typeof schemas;
export type RecordOf<C extends Collection> = z.output<(typeof schemas)[C]>;
export type Task = RecordOf<'tasks'>;
export type Subtask = Task['subtasks'][number];
export type Project = RecordOf<'projects'>;
export type Habit = RecordOf<'habits'>;
export type Transaction = RecordOf<'transactions'>;
export type Order = RecordOf<'orders'>;

export const COLLECTIONS = Object.keys(schemas) as Collection[];

export const defaultSettings = {
  name: 'Lia',
  theme: 'light' as 'light' | 'dark',
  portfolio: '',
  focusMinutes: 25,
  shippingRate: 5,
  fx: 4000,
  timezone: 'America/Bogota',
  /** Calendario público de iCloud que se muestra en LIA OS. */
  appleCalendarUrl: '',
};
export type Settings = typeof defaultSettings;

export type HabitLogs = Record<string, string[]>;

export type Snapshot = {
  schemaVersion: number;
  settings: Settings;
  habitLogs: HabitLogs;
} & { [C in Collection]: RecordOf<C>[] };

export function emptySnapshot(): Snapshot {
  const collections = Object.fromEntries(COLLECTIONS.map((c) => [c, []]));
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { ...defaultSettings },
    habitLogs: {},
    ...collections,
  } as unknown as Snapshot;
}
