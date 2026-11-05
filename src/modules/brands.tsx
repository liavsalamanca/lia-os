import { Plus } from 'lucide-react';
import { useState } from 'react';
import type { z } from 'zod';
import { useData } from '../app/store';
import { useUI } from '../app/ui';
import type { schemas } from '../data/schema';
import { Button, EmptyState, Metrics, PageHeader, Row, RowBody, Section, SelectFilter } from '../design';
import { formatCOP } from '../domain/finance';
import { byNumberDesc, byText, ListControls, RowActions, useListing } from './shared';

type Product = z.output<typeof schemas.products>;
const BRANDS = ['Mariè', 'Dans Lia Vie'];
const stockValue = (items: Product[]) => items.reduce((total, p) => total + p.costCOP * p.stock, 0);
const units = (items: Product[]) => items.reduce((total, p) => total + p.stock, 0);
const sorts = [
  { label: 'Por nombre', compare: byText<Product>((p) => p.name) },
  { label: 'Mayor stock', compare: byNumberDesc<Product>((p) => p.stock) },
  { label: 'Mayor ganancia', compare: byNumberDesc<Product>((p) => p.priceCOP - p.costCOP) },
];

export default function Brands() {
  const data = useData();
  const { openForm } = useUI();
  const [brand, setBrand] = useState('');
  const listing = useListing(
    data.products.filter((p) => !brand || p.brand === brand),
    (p) => `${p.name} ${p.brand} ${p.notes}`,
    sorts,
  );
  return (
    <>
      <PageHeader
        eyebrow="Joyería · Emprendimiento"
        title="Mis marcas"
        subtitle="El inventario y los números de tus dos marcas."
        action={
          <Button variant="primary" onClick={() => openForm('products')}>
            <Plus size={16} aria-hidden /> Nuevo producto
          </Button>
        }
      />
      <Metrics
        items={[
          { label: 'Referencias', value: data.products.length, foot: 'Productos creados' },
          { label: 'Unidades', value: units(data.products), foot: 'Inventario total' },
          { label: 'Costo del inventario', value: formatCOP(stockValue(data.products)), foot: 'Valor registrado' },
        ]}
      />
      <div className="mb-9 grid gap-8 md:grid-cols-2">
        {BRANDS.map((name) => {
          const items = data.products.filter((p) => p.brand === name);
          return (
            <Section key={name} title={name}>
              <dl className="text-sm">
                {[
                  ['Referencias', items.length],
                  ['Unidades disponibles', units(items)],
                  ['Valor de costo', formatCOP(stockValue(items))],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1">
                    <dt className="text-muted">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          );
        })}
      </div>
      <ListControls listing={listing} placeholder="Buscar producto">
        <SelectFilter label="Filtrar por marca" value={brand} onChange={setBrand} options={[{ value: '', label: 'Todas las marcas' }, ...BRANDS.map((b) => ({ value: b, label: b }))]} />
      </ListControls>
      {listing.visible.length ? (
        <ul>
          {listing.visible.map((p) => (
            <Row key={p.id}>
              <RowBody title={p.name} sub={`${p.brand} · Costo ${formatCOP(p.costCOP)} · Venta ${formatCOP(p.priceCOP)}${p.notes ? ` · ${p.notes}` : ''}`} />
              <span className="text-[13px] text-muted">{p.stock} en stock</span>
              <strong className="text-ok">{formatCOP(p.priceCOP - p.costCOP)}</strong>
              <RowActions collection="products" id={p.id} />
            </Row>
          ))}
        </ul>
      ) : (
        <EmptyState title="Tu inventario empieza aquí" hint="Crea referencias para Mariè o Dans Lia Vie." />
      )}
    </>
  );
}
