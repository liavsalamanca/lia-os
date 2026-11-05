import { Plus } from 'lucide-react';
import { useData } from '../app/store';
import { useUI } from '../app/ui';
import { Button, Chip, EmptyState, PageHeader, Row, RowBody, Section } from '../design';
import { ExternalLink, ListControls, RowActions, useListing } from './shared';

const TOPICS = ['Enfoque mixto', 'Población 18–25 años', 'Bucaramanga', 'Fashion film'];

export default function Study() {
  const data = useData();
  const { openForm } = useUI();
  const listing = useListing(data.sources, (s) => `${s.title} ${s.author} ${s.status} ${s.insight}`, []);
  return (
    <>
      <PageHeader
        eyebrow="Moda · Academia"
        title="Investigación"
        subtitle="Bibliografía, conceptos y hallazgos organizados."
        action={
          <Button variant="primary" onClick={() => openForm('sources')}>
            <Plus size={16} aria-hidden /> Añadir fuente
          </Button>
        }
      />
      <div className="mb-9">
        <p className="eyebrow">Proyecto de grado</p>
        <h2 className="mt-1 font-serif text-2xl font-normal">Instagram e identidad estética</h2>
        <p className="mt-1 max-w-2xl text-muted">Fuentes y aprendizajes sobre identidad visual, influencers y homogenización estética, con miras a desarrollar tu fashion film.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </div>
      </div>
      <Section title={`Biblioteca de fuentes (${data.sources.length})`}>
        {data.sources.length > 0 && (
          <div className="mt-3">
            <ListControls listing={listing} placeholder="Buscar fuente" />
          </div>
        )}
        {listing.visible.length ? (
          <ul>
            {listing.visible.map((s) => (
              <Row key={s.id}>
                <RowBody
                  title={s.title}
                  sub={
                    <>
                      {s.author || 'Autor no registrado'}
                      {s.insight ? ` · ${s.insight}` : ''} <ExternalLink href={s.link}>Abrir fuente</ExternalLink>
                    </>
                  }
                />
                <Chip>{s.status}</Chip>
                <RowActions collection="sources" id={s.id} />
              </Row>
            ))}
          </ul>
        ) : (
          <EmptyState title="Cada fuente suma" hint="Registra artículos, documentos, entrevistas y hallazgos." />
        )}
      </Section>
    </>
  );
}
