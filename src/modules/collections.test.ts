import { describe, expect, it } from 'vitest';
import { COLLECTIONS, schemas } from '../data/schema';
import { collections, formSchema } from './collections';

describe('validación de formularios', () => {
  const task = formSchema(collections.tasks.fields);
  const order = formSchema(collections.orders.fields);
  const validOrder = { client: 'Ana', item: 'Tenis', store: '', status: 'Pendiente', priceUSD: '10', shippingUSD: '', weightLb: '0.3', shippingRate: '', extraUSD: '', fx: '', marginPercent: '15', notes: '' };

  it('exige los campos obligatorios', () => {
    const result = task.safeParse({ title: '   ', area: '', priority: '', status: '', due: '', projectId: '', notes: '' });
    expect(result.success).toBe(false);
  });

  it('recorta espacios', () => {
    const data = task.parse({ title: ' hola ', area: '', priority: '', status: '', due: '', projectId: '', notes: '' });
    expect(data.title).toBe('hola');
  });

  it('convierte números y deja vacíos los que heredan configuración', () => {
    const data = order.parse(validOrder) as Record<string, unknown>;
    expect(data).toMatchObject({ priceUSD: 10, shippingUSD: 0, weightLb: 0.3 });
    expect(data.shippingRate).toBeUndefined();
  });

  it('respeta un casillero de 0', () => {
    expect((order.parse({ ...validOrder, shippingRate: '0' }) as Record<string, unknown>).shippingRate).toBe(0);
  });

  it('rechaza números negativos o inválidos', () => {
    expect(order.safeParse({ ...validOrder, priceUSD: '-1' }).success).toBe(false);
    expect(order.safeParse({ ...validOrder, weightLb: 'abc' }).success).toBe(false);
    expect(order.safeParse({ ...validOrder, priceUSD: '' }).success).toBe(false);
  });

  it('rechaza URL con esquemas peligrosos', () => {
    const idea = formSchema(collections.ideas.fields);
    const values = { title: 'x', area: '', type: '', status: '', description: '' };
    expect(idea.safeParse({ ...values, link: 'javascript:alert(1)' }).success).toBe(false);
    expect(idea.safeParse({ ...values, link: 'https://a.co' }).success).toBe(true);
    expect(idea.safeParse({ ...values, link: '' }).success).toBe(true);
  });

  it('limita el progreso a 100', () => {
    const project = formSchema(collections.projects.fields);
    expect(project.safeParse({ name: 'x', area: '', status: '', progress: '101', deadline: '', notes: '' }).success).toBe(false);
  });
});

describe('definición de colecciones', () => {
  it('cada campo del formulario existe en el esquema de almacenamiento', () => {
    for (const collection of COLLECTIONS) {
      const shape = schemas[collection].shape as Record<string, unknown>;
      for (const field of collections[collection].fields) expect(shape, `${collection}.${field.name}`).toHaveProperty(field.name);
    }
  });
});
