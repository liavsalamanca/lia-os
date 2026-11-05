import { Plus } from 'lucide-react';
import { useData } from '../app/store';
import { useUI } from '../app/ui';
import type { Project } from '../data/schema';
import { Button, Chip, EmptyState, PageHeader, Progress } from '../design';
import { formatDate } from '../domain/dates';
import { projectProgress } from '../domain/projects';
import { byText, ListControls, RowActions, useListing } from './shared';

const sorts = [
  { label: 'Por fecha límite', compare: byText<Project>((p) => p.deadline) },
  { label: 'Por nombre', compare: byText<Project>((p) => p.name) },
];

export default function Projects() {
  const data = useData();
  const { openForm } = useUI();
  const listing = useListing(data.projects, (p) => `${p.name} ${p.area} ${p.notes}`, sorts);
  return (
    <>
      <PageHeader
        eyebrow="Metas y ejecución"
        title="Proyectos"
        subtitle="De una idea bonita a un resultado concreto."
        action={
          <Button variant="primary" onClick={() => openForm('projects')}>
            <Plus size={16} aria-hidden /> Nuevo proyecto
          </Button>
        }
      />
      {data.projects.length > 0 && <ListControls listing={listing} placeholder="Buscar proyecto" />}
      {listing.visible.length ? (
        <ul className="grid gap-x-10 md:grid-cols-2 xl:grid-cols-3">
          {listing.visible.map((p) => {
            const progress = projectProgress(p, data.tasks);
            const count = data.tasks.filter((t) => t.projectId === p.id).length;
            return (
              <li key={p.id} className="flex flex-col gap-2 border-t border-line py-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow">{p.area}</span>
                  <Chip>{p.status}</Chip>
                </div>
                <h2 className="font-serif text-2xl font-normal [overflow-wrap:anywhere]">{p.name}</h2>
                <p className="flex-1 text-[13px] text-muted">{p.notes || 'Tu próximo gran proyecto.'}</p>
                <div className="flex justify-between text-[13px]">
                  <span>Progreso</span>
                  <strong>{progress}%</strong>
                </div>
                <Progress value={progress} label={`Progreso de ${p.name}`} />
                <div className="flex items-center justify-between gap-2 text-[13px] text-muted">
                  <span>
                    {p.deadline ? formatDate(p.deadline) : 'Sin fecha'} · {count} tareas
                  </span>
                  <RowActions collection="projects" id={p.id} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="Todo empieza con un proyecto" hint="Portfolio, lanzamiento, campaña o colección." />
      )}
    </>
  );
}
