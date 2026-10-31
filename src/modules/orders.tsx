import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useData } from '../app/store';
import { useUI } from '../app/ui';
import type { Order } from '../data/schema';
import { Button, Chip, EmptyState, Metrics, Note, PageHeader, Row, RowBody, SelectFilter } from '../design';
import { formatCOP } from '../domain/finance';
import { calculateQuote, USD_THRESHOLD } from '../domain/quote';
import { collections } from './collections';
import { byText, ListControls, RowActions, useListing } from './shared';

const STATUSES = collections.orders.fields.find((f) => f.name === 'status')?.options ?? [];
const sorts = [
  { label: 'Más recientes', compare: () => 0 },
  { label: 'Por cliente', compare: byText<Order>((o) => o.client) },
];

export default function Orders() {
  const data = useData();
  const { openForm } = useUI();
  const [status, setStatus] = useState('');
  const quoteOf = (o: Order) => calculateQuote(o, data.settings);
  const listing = useListing(
    data.orders.filter((o) => !status || o.status === status),
    (o) => `${o.client} ${o.item} ${o.store} ${o.notes}`,
    sorts,
  );
  return (
    <>
      <PageHeader
        eyebrow="USA → Colombia"
        title="Encargos USA"
        subtitle="Cotiza, controla pedidos y conoce tus márgenes."
        action={
          <Button variant="primary" onClick={() => openForm('orders')}>
            <Plus size={16} aria-hidden /> Nuevo pedido
          </Button>
        }
      />
      <Note>
        Producto + envío USA + casillero por libra + costos extra, convertido a COP y con margen sobre costo. La tasa inicial es solo un ejemplo: actualízala antes de vender. Verifica impuestos y condiciones aduaneras; esto no sustituye una liquidación real.
      </Note>
      <Metrics
        items={[
          { label: 'Pedidos registrados', value: data.orders.length, foot: 'En tu historial' },
          { label: 'Venta potencial', value: formatCOP(data.orders.reduce((total, o) => total + quoteOf(o).sellCOP, 0)), foot: 'Con los valores registrados' },
          { label: 'Ganancia estimada', value: formatCOP(data.orders.reduce((total, o) => total + quoteOf(o).profitCOP, 0)), foot: 'Antes de otros gastos y tributos' },
        ]}
      />
      <ListControls listing={listing} placeholder="Buscar cliente o producto">
        <SelectFilter label="Filtrar por estado" value={status} onChange={setStatus} options={[{ value: '', label: 'Todos los estados' }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
      </ListControls>
      {listing.visible.length ? (
        <ul>
          {listing.visible.map((o) => {
            const quote = quoteOf(o);
            return (
              <Row key={o.id}>
                <RowBody
                  title={o.client || 'Cliente sin nombre'}
                  sub={
                    <>
                      {o.item} · {o.store || 'Tienda'} · {o.weightLb.toFixed(2)} lb · Costo {formatCOP(quote.costCOP)} · Ganancia {formatCOP(quote.profitCOP)}
                    </>
                  }
                />
                {quote.overThreshold && <Chip>{`Revisar USD ${USD_THRESHOLD}`}</Chip>}
                <Chip>{o.status}</Chip>
                <strong>{formatCOP(quote.sellCOP)}</strong>
                <RowActions collection="orders" id={o.id} />
              </Row>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="Tu primera cotización está a un clic" hint="Registra cliente, precio en USD, libras, envío y margen." />
      )}
    </>
  );
}
