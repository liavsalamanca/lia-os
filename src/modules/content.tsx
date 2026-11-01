import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useData } from '../app/store';
import { useUI } from '../app/ui';
import { schemas } from '../data/schema';
import type { z } from 'zod';
import { Button, Chip, EmptyState, Metrics, Note, PageHeader, Row, RowBody, SelectFilter } from '../design';
import { formatDate } from '../domain/dates';
import { collections } from './collections';
import { byText, ListControls, RowActions, useListing } from './shared';

type Content = z.output<typeof schemas.content>;
const STATUSES = collections.content.fields.find((f) => f.name === 'status')?.options ?? [];
const sorts = [
  { label: 'Por fecha', compare: byText<Content>((c) => c.publishDate) },
  { label: 'Por título', compare: byText<Content>((c) => c.title) },
];

export default function ContentStudio() {
  const data = useData();
  const { openForm } = useUI();
  const [status, setStatus] = useState('');
  const listing = useListing(
    data.content.filter((c) => !status || c.status === status),
    (c) => `${c.title} ${c.format} ${c.platform} ${c.notes}`,
    sorts,
  );
  return (
    <>
      <PageHeader
        eyebrow="Social media · Content"
        title="Taikinsa Studio"
        subtitle="Las ideas, la producción y el calendario del restaurante."
        action={
          <Button variant="primary" onClick={() => openForm('content')}>
            <Plus size={16} aria-hidden /> Nueva publicación
          </Button>
        }
      />
      <Metrics
        items={[
          { label: 'Piezas de contenido', value: data.content.length, foot: 'Planeadas y publicadas' },
          { label: 'En producción', value: data.content.filter((c) => c.status === 'En producción').length, foot: 'Ideas en proceso' },
          { label: 'Publicadas', value: data.content.filter((c) => c.status === 'Publicado').length, foot: 'Contenido finalizado' },
        ]}
      />
      <ListControls listing={listing} placeholder="Buscar publicación">
        <SelectFilter label="Filtrar por estado" value={status} onChange={setStatus} options={[{ value: '', label: 'Todos los estados' }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
      </ListControls>
      {listing.visible.length ? (
        <ul>
          {listing.visible.map((c) => (
            <Row key={c.id}>
              <RowBody title={c.title} sub={`${c.format} · ${c.platform} · ${formatDate(c.publishDate)}${c.notes ? ` · ${c.notes}` : ''}`} />
              <Chip>{c.status}</Chip>
              <RowActions collection="content" id={c.id} />
            </Row>
          ))}
        </ul>
      ) : (
        <EmptyState title="Que no se escape ninguna idea" hint="Guarda reels, campañas, historias y publicaciones." />
      )}
      <Note>LIA OS no publica en Instagram ni lee sus métricas. Aquí organizas y registras el trabajo manualmente.</Note>
    </>
  );
}
