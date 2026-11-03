import { COLLECTIONS, type Collection, type Snapshot } from '../data/schema';

export type SearchHit = { collection: Collection; id: string; title: string };

const fold = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function matches(text: string, query: string): boolean {
  return fold(text).includes(fold(query.trim()));
}

export function recordTitle(record: Record<string, unknown>): string {
  for (const key of ['title', 'name', 'item', 'description', 'brand']) {
    const value = record[key];
    if (typeof value === 'string' && value) return value;
  }
  return 'Registro';
}

const IGNORED = ['id', 'createdAt', 'updatedAt', 'blockedBy'];

/** Texto de un valor; en listas, el de sus elementos o su título (subtareas). */
const valueText = (value: unknown): string => {
  if (Array.isArray(value)) return value.map(valueText).join(' ');
  if (typeof value === 'object' && value !== null) return 'title' in value ? valueText(value.title) : '';
  return value == null ? '' : String(value);
};

const searchableText = (record: object) =>
  Object.entries(record)
    .filter(([key]) => !IGNORED.includes(key))
    .map(([, value]) => valueText(value))
    .join(' ');

export function searchAll(snapshot: Snapshot, query: string, limit = 20): SearchHit[] {
  if (!query.trim()) return [];
  const hits: SearchHit[] = [];
  for (const collection of COLLECTIONS) {
    for (const record of snapshot[collection]) {
      if (matches(searchableText(record), query)) hits.push({ collection, id: record.id, title: recordTitle(record) });
      if (hits.length >= limit) return hits;
    }
  }
  return hits;
}
