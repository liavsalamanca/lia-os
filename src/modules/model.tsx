import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { z } from 'zod';
import { useData } from '../app/store';
import { useUI } from '../app/ui';
import type { schemas } from '../data/schema';
import { Button, Chip, EmptyState, PageHeader, Row, RowBody, Section } from '../design';
import { formatDate } from '../domain/dates';
import { formatCOP } from '../domain/finance';
import { byTextDesc, ExternalLink, ListControls, RowActions, useListing } from './shared';

type Casting = z.output<typeof schemas.castings>;
const sorts = [{ label: 'Más recientes', compare: byTextDesc<Casting>((c) => c.date) }];

export default function Model() {
  const data = useData();
  const { openForm } = useUI();
  const navigate = useNavigate();
  const listing = useListing(data.castings, (c) => `${c.brand} ${c.type} ${c.status} ${c.notes}`, sorts);
  return (
    <>
      <PageHeader
        eyebrow="Career · Portfolio"
        title="Modelaje"
        subtitle="Castings, sesiones y contactos profesionales."
        action={
          <Button variant="primary" onClick={() => openForm('castings')}>
            <Plus size={16} aria-hidden /> Nuevo casting
          </Button>
        }
      />
      <div className="mb-9 grid gap-8 md:grid-cols-2">
        <Section title="Tu book digital">
          <p className="my-2 text-[13px] text-muted">La URL de tu portafolio de modelo.</p>
          {data.settings.portfolio ? <ExternalLink href={data.settings.portfolio}>Abrir mi book</ExternalLink> : <Button onClick={() => navigate('/settings')}>Añadir enlace</Button>}
        </Section>
        <Section title="Tu pipeline">
          <dl className="text-sm">
            {[
              ['Postulaciones', data.castings.length],
              ['Confirmadas', data.castings.filter((c) => c.status === 'Confirmado').length],
              ['Pendientes', data.castings.filter((c) => c.status === 'Pendiente').length],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1">
                <dt className="text-muted">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>
      <ListControls listing={listing} placeholder="Buscar casting" />
      {listing.visible.length ? (
        <ul>
          {listing.visible.map((c) => (
            <Row key={c.id}>
              <RowBody title={c.brand} sub={`${c.type} · ${formatDate(c.date)} · ${formatCOP(c.feeCOP)}`} />
              <Chip>{c.status}</Chip>
              <RowActions collection="castings" id={c.id} />
            </Row>
          ))}
        </ul>
      ) : (
        <EmptyState title="Todavía no hay castings" hint="Registra castings, sesiones y colaboraciones." />
      )}
    </>
  );
}
