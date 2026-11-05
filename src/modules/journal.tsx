import { Plus } from 'lucide-react';
import type { z } from 'zod';
import { useData } from '../app/store';
import { useUI } from '../app/ui';
import type { schemas } from '../data/schema';
import { Button, Chip, EmptyState, Note, PageHeader } from '../design';
import { formatDate } from '../domain/dates';
import { byTextDesc, ListControls, RowActions, useListing } from './shared';

type Entry = z.output<typeof schemas.journal>;
const sorts = [{ label: 'Más recientes', compare: byTextDesc<Entry>((j) => j.date) }];

export default function Journal() {
  const data = useData();
  const { openForm } = useUI();
  const listing = useListing(data.journal, (j) => `${j.title} ${j.mood} ${j.entry} ${j.date}`, sorts);
  return (
    <>
      <PageHeader
        eyebrow="Vida pausada"
        title="Mi diario"
        subtitle="Un espacio de reflexión sin ruido."
        action={
          <Button variant="primary" onClick={() => openForm('journal')}>
            <Plus size={16} aria-hidden /> Nueva entrada
          </Button>
        }
      />
      <Note>Tu diario se guarda en este navegador y no tiene cifrado propio. No escribas contraseñas ni información especialmente sensible.</Note>
      {data.journal.length > 0 && <ListControls listing={listing} placeholder="Buscar en el diario" />}
      {listing.visible.length ? (
        <ul className="mx-auto max-w-2xl">
          {listing.visible.map((j) => (
            <li key={j.id} className="border-t border-line py-6">
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow">{formatDate(j.date)}</span>
                <Chip>{j.mood || 'Reflexión'}</Chip>
              </div>
              <h2 className="mt-3 font-serif text-2xl font-normal">{j.title || 'Un momento para mí'}</h2>
              <p className="mt-2 leading-relaxed whitespace-pre-wrap text-muted">{j.entry}</p>
              <div className="mt-2 flex justify-end">
                <RowActions collection="journal" id={j.id} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Cada día tiene su historia" hint="Escribe lo que quieras recordar, agradecer o dejar ir." />
      )}
    </>
  );
}
