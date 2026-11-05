import { Plus } from 'lucide-react';
import { useData } from '../app/store';
import { useUI } from '../app/ui';
import { Button, Chip, EmptyState, PageHeader } from '../design';
import { ExternalLink, ListControls, RowActions, useListing } from './shared';

export default function Ideas() {
  const data = useData();
  const { openForm } = useUI();
  const listing = useListing(data.ideas, (i) => `${i.title} ${i.area} ${i.type} ${i.description}`, []);
  return (
    <>
      <PageHeader
        eyebrow="Mente creativa"
        title="Idea Vault"
        subtitle="Un lugar para todo lo que tu imaginación produce."
        action={
          <Button variant="primary" onClick={() => openForm('ideas')}>
            <Plus size={16} aria-hidden /> Capturar idea
          </Button>
        }
      />
      {data.ideas.length > 0 && <ListControls listing={listing} placeholder="Buscar idea" />}
      {listing.visible.length ? (
        <ul className="grid gap-x-10 md:grid-cols-2 xl:grid-cols-3">
          {listing.visible.map((i) => (
            <li key={i.id} className="flex flex-col gap-2 border-t border-line py-5">
              <div className="flex items-center justify-between gap-2">
                <span className="eyebrow">
                  {i.area} · {i.type || 'Idea'}
                </span>
                <Chip>{i.status}</Chip>
              </div>
              <h2 className="font-serif text-2xl font-normal [overflow-wrap:anywhere]">{i.title}</h2>
              <p className="flex-1 text-[13px] whitespace-pre-wrap text-muted">{i.description}</p>
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <ExternalLink href={i.link}>Ver referencia</ExternalLink>
                <span className="ml-auto">
                  <RowActions collection="ideas" id={i.id} />
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Que ninguna idea se pierda" hint="Campañas, looks, negocios, moodboards, fotos o futuros proyectos." />
      )}
    </>
  );
}
