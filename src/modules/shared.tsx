import { Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getStore } from '../app/store';
import { useUI } from '../app/ui';
import type { Collection } from '../data/schema';
import { IconButton, SearchInput, SelectFilter, Toolbar } from '../design';
import { matches } from '../domain/search';
import { safeUrl } from '../domain/url';
import { collections } from './collections';

export function RowActions({ collection, id }: { collection: Collection; id: string }) {
  const { openForm, confirm, attempt } = useUI();
  const label = collections[collection].label;
  const remove = async () => {
    if (await confirm(`¿Eliminar este registro de ${label}? Esta acción no se puede deshacer.`)) {
      await attempt(() => getStore().deleteRecord(collection, id), 'Registro eliminado');
    }
  };
  return (
    <span className="flex">
      <IconButton icon={Pencil} label={`Editar ${label}`} onClick={() => openForm(collection, id)} />
      <IconButton icon={Trash2} label={`Eliminar ${label}`} onClick={remove} className="hover:text-danger" />
    </span>
  );
}

export function ExternalLink({ href, children }: { href: string; children: string }) {
  const url = safeUrl(href);
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-wine underline underline-offset-2">
      {children}
    </a>
  );
}

type Sort<T> = { label: string; compare: (a: T, b: T) => number };

/** Búsqueda y orden comunes a todas las listas de registros. */
export function useListing<T>(items: T[], text: (item: T) => string, sorts: Sort<T>[]) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(0);
  const visible = useMemo(() => {
    const filtered = query.trim() ? items.filter((item) => matches(text(item), query)) : items;
    const compare = sorts[sort]?.compare;
    return compare ? [...filtered].sort(compare) : filtered;
    // `text` y `sorts` son definiciones estáticas de cada página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, sort]);
  return { query, setQuery, sort, setSort, visible, sorts };
}

export function ListControls<T>({ listing, placeholder, children }: { listing: ReturnType<typeof useListing<T>>; placeholder: string; children?: React.ReactNode }) {
  return (
    <Toolbar>
      <SearchInput value={listing.query} onChange={listing.setQuery} placeholder={placeholder} />
      {children}
      {listing.sorts.length > 1 && (
        <SelectFilter label="Ordenar" value={String(listing.sort)} onChange={(v) => listing.setSort(Number(v))} options={listing.sorts.map((s, i) => ({ value: String(i), label: s.label }))} />
      )}
    </Toolbar>
  );
}

export const byText =
  <T,>(get: (item: T) => string, fallback = '9999') =>
  (a: T, b: T) =>
    (get(a) || fallback).localeCompare(get(b) || fallback);

export const byTextDesc =
  <T,>(get: (item: T) => string) =>
  (a: T, b: T) =>
    get(b).localeCompare(get(a));

export const byNumberDesc =
  <T,>(get: (item: T) => number) =>
  (a: T, b: T) =>
    get(b) - get(a);
