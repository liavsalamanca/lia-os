import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useData } from '../app/store';
import { useUI } from '../app/ui';
import { Button, EmptyState, Metrics, Note, PageHeader, Progress, Row, RowBody, Section, TextLink } from '../design';
import { formatDate, todayISO } from '../domain/dates';
import { formatCOP, goalPercent, monthSummary } from '../domain/finance';
import { byTextDesc, RowActions } from './shared';

export default function Finance() {
  const data = useData();
  const { openForm } = useUI();
  const [month, setMonth] = useState(todayISO(data.settings.timezone).slice(0, 7));
  const { items, income, expenses, balance } = monthSummary(data.transactions, month);
  return (
    <>
      <PageHeader
        eyebrow="Money map"
        title="Finanzas"
        subtitle="Haz que tus metas tengan números reales."
        action={
          <Button variant="primary" onClick={() => openForm('transactions')}>
            <Plus size={16} aria-hidden /> Nuevo movimiento
          </Button>
        }
      />
      <label className="mb-6 block max-w-48">
        <span className="mb-1 block text-[13px] text-muted">Mes</span>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="control" />
      </label>
      <Metrics
        items={[
          { label: 'Ingresos', value: formatCOP(income), foot: 'Movimientos registrados' },
          { label: 'Gastos', value: formatCOP(expenses), foot: 'Movimientos registrados' },
          { label: 'Balance', value: formatCOP(balance), foot: 'Ingresos menos gastos' },
        ]}
      />
      <div className="grid gap-10 lg:grid-cols-[3fr_2fr]">
        <Section title="Movimientos" action={<TextLink onClick={() => openForm('transactions')}>Añadir</TextLink>}>
          {items.length ? (
            <ul>
              {[...items].sort(byTextDesc((t) => t.date)).map((t) => {
                const incoming = t.kind === 'Ingreso';
                return (
                  <Row key={t.id}>
                    <RowBody title={t.description || t.category} sub={`${formatDate(t.date)} · ${t.category} · ${t.area || 'Personal'}`} />
                    <strong className={incoming ? 'text-ok' : 'text-danger'}>
                      {incoming ? '+' : '−'}
                      {formatCOP(t.amount)}
                    </strong>
                    <RowActions collection="transactions" id={t.id} />
                  </Row>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="Tu historial está listo" hint="Añade ingresos y gastos para ver el balance." />
          )}
        </Section>
        <Section title="Metas de ahorro" action={<TextLink onClick={() => openForm('goals')}>Nueva meta</TextLink>}>
          {data.goals.length ? (
            <ul>
              {data.goals.map((g) => {
                const percent = goalPercent(g.current, g.target);
                return (
                  <li key={g.id} className="border-b border-line py-3 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <RowBody title={g.name} sub={`${formatCOP(g.current)} de ${formatCOP(g.target)} · ${g.deadline ? formatDate(g.deadline) : 'Sin fecha objetivo'}`} />
                      <strong>{percent}%</strong>
                      <RowActions collection="goals" id={g.id} />
                    </div>
                    <div className="mt-2">
                      <Progress value={percent} label={`Avance de ${g.name}`} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="Sueños con presupuesto" hint="Crea una meta de ahorro para ver tu avance." />
          )}
        </Section>
      </div>
      <Note>Los movimientos se registran manualmente. No hay conexión con bancos.</Note>
    </>
  );
}
