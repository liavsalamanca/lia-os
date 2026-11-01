import { z } from 'zod';
import type { Collection, Settings } from '../data/schema';
import { safeUrl } from '../domain/url';

export const AREAS = ['Personal', 'Taikinsa', 'Encargos USA', 'Mariè', 'Dans Lia Vie', 'Modelaje', 'Diseño de moda', 'Universidad', 'Finanzas', 'Bienestar', 'Creatividad'];

export type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'date' | 'time' | 'number' | 'url' | 'project';
  options?: string[];
  required?: boolean;
  wide?: boolean;
  /** Número que puede quedar vacío para heredar un valor de Configuración. */
  optional?: boolean;
  max?: number;
  default?: string | number | ((ctx: { today: string; settings: Settings }) => string | number);
};

export type CollectionDef = {
  label: string;
  feminine: boolean;
  route: string;
  fields: FieldDef[];
};

const area: FieldDef = { name: 'area', label: 'Área', type: 'select', options: AREAS, default: 'Personal' };
const notes: FieldDef = { name: 'notes', label: 'Notas', type: 'textarea', wide: true };
const today = ({ today }: { today: string }) => today;

export const collections: Record<Collection, CollectionDef> = {
  tasks: {
    label: 'tarea',
    feminine: true,
    route: '/tasks',
    fields: [
      { name: 'title', label: '¿Qué necesitas hacer?', required: true, wide: true },
      area,
      { name: 'priority', label: 'Prioridad', type: 'select', options: ['Alta', 'Media', 'Baja'], default: 'Media' },
      { name: 'status', label: 'Estado', type: 'select', options: ['Pendiente', 'En progreso', 'Hecho'], default: 'Pendiente' },
      { name: 'due', label: 'Fecha límite', type: 'date' },
      { name: 'projectId', label: 'Vincular a un proyecto', type: 'project', wide: true },
      { ...notes, label: 'Detalles / notas' },
    ],
  },
  projects: {
    label: 'proyecto',
    feminine: false,
    route: '/projects',
    fields: [
      { name: 'name', label: 'Nombre del proyecto', required: true, wide: true },
      area,
      { name: 'status', label: 'Estado', type: 'select', options: ['Planeado', 'En progreso', 'En pausa', 'Completado'], default: 'Planeado' },
      { name: 'progress', label: 'Progreso manual (%)', type: 'number', default: 0, max: 100 },
      { name: 'deadline', label: 'Fecha límite', type: 'date' },
      { ...notes, label: 'Descripción / siguiente objetivo' },
    ],
  },
  events: {
    label: 'evento',
    feminine: false,
    route: '/calendar',
    fields: [
      { name: 'title', label: 'Nombre del evento', required: true, wide: true },
      { name: 'date', label: 'Fecha', type: 'date', required: true, default: today },
      { name: 'time', label: 'Hora', type: 'time' },
      area,
      { ...notes, label: 'Lugar / notas' },
    ],
  },
  habits: {
    label: 'hábito',
    feminine: false,
    route: '/habits',
    fields: [
      { name: 'name', label: 'Hábito', required: true, wide: true },
      { ...area, default: 'Bienestar' },
      { name: 'notes', label: 'Motivación / nota', wide: true },
    ],
  },
  transactions: {
    label: 'movimiento',
    feminine: false,
    route: '/finance',
    fields: [
      { name: 'kind', label: 'Tipo', type: 'select', options: ['Ingreso', 'Gasto'], default: 'Gasto' },
      { name: 'amount', label: 'Valor (COP)', type: 'number', required: true },
      { name: 'description', label: 'Concepto', required: true, wide: true },
      { name: 'date', label: 'Fecha', type: 'date', required: true, default: today },
      area,
      { name: 'category', label: 'Categoría', type: 'select', options: ['Trabajo', 'Ventas', 'Alimentación', 'Transporte', 'Hogar', 'Compras', 'Servicios', 'Salud', 'Educación', 'Ahorro', 'Otros'], default: 'Otros' },
      notes,
    ],
  },
  goals: {
    label: 'meta',
    feminine: true,
    route: '/finance',
    fields: [
      { name: 'name', label: 'Meta de ahorro', required: true, wide: true },
      { name: 'target', label: 'Objetivo (COP)', type: 'number', required: true },
      { name: 'current', label: 'Ahorrado (COP)', type: 'number', default: 0 },
      { name: 'deadline', label: 'Fecha deseada', type: 'date' },
    ],
  },
  orders: {
    label: 'pedido',
    feminine: false,
    route: '/orders',
    fields: [
      { name: 'client', label: 'Cliente', required: true },
      { name: 'item', label: 'Producto', required: true },
      { name: 'store', label: 'Tienda USA', default: 'Shoebacca' },
      { name: 'status', label: 'Estado', type: 'select', options: ['Cotización', 'Pendiente', 'Comprado', 'En tránsito', 'Entregado', 'Cancelado'], default: 'Cotización' },
      { name: 'priceUSD', label: 'Producto (USD)', type: 'number', required: true, default: 0 },
      { name: 'shippingUSD', label: 'Envío en USA (USD)', type: 'number', default: 0 },
      { name: 'weightLb', label: 'Peso (libras)', type: 'number', default: 0 },
      { name: 'shippingRate', label: 'Casillero USD / libra', type: 'number', optional: true, default: ({ settings }) => settings.shippingRate },
      { name: 'extraUSD', label: 'Otros costos (USD)', type: 'number', default: 0 },
      { name: 'fx', label: 'Tasa de cambio USD/COP', type: 'number', optional: true, default: ({ settings }) => settings.fx },
      { name: 'marginPercent', label: 'Margen sobre costo (%)', type: 'number', default: 15 },
      { ...notes, label: 'Notas / referencia' },
    ],
  },
  products: {
    label: 'producto',
    feminine: false,
    route: '/brands',
    fields: [
      { name: 'name', label: 'Producto / referencia', required: true, wide: true },
      { name: 'brand', label: 'Marca', type: 'select', options: ['Mariè', 'Dans Lia Vie'], default: 'Mariè' },
      { name: 'stock', label: 'Cantidad disponible', type: 'number', default: 0 },
      { name: 'costCOP', label: 'Costo unitario COP', type: 'number', default: 0 },
      { name: 'priceCOP', label: 'Venta unitaria COP', type: 'number', default: 0 },
      { ...notes, label: 'Material / proveedor / descripción' },
    ],
  },
  content: {
    label: 'publicación',
    feminine: true,
    route: '/content',
    fields: [
      { name: 'title', label: 'Idea / título de la publicación', required: true, wide: true },
      { name: 'format', label: 'Formato', type: 'select', options: ['Reel', 'Carrusel', 'Fotografía', 'Historia', 'Google Maps', 'Campaña'], default: 'Reel' },
      { name: 'platform', label: 'Canal', type: 'select', options: ['Instagram', 'Facebook', 'TikTok', 'Google Maps', 'Multicanal'], default: 'Instagram' },
      { name: 'status', label: 'Estado', type: 'select', options: ['Idea', 'Guion', 'En producción', 'Programado', 'Publicado'], default: 'Idea' },
      { name: 'publishDate', label: 'Fecha de publicación', type: 'date' },
      { ...notes, label: 'Idea, copy, CTA, hashtags y notas' },
    ],
  },
  ideas: {
    label: 'idea',
    feminine: true,
    route: '/creative',
    fields: [
      { name: 'title', label: 'Nombre de la idea', required: true, wide: true },
      { ...area, default: 'Creatividad' },
      { name: 'type', label: 'Tipo', type: 'select', options: ['Concepto', 'Campaña', 'Moodboard', 'Foto', 'Diseño', 'Negocio', 'Proyecto', 'Otro'], default: 'Concepto' },
      { name: 'status', label: 'Estado', type: 'select', options: ['Idea', 'En progreso', 'Completado'], default: 'Idea' },
      { name: 'link', label: 'URL de referencia', type: 'url', wide: true },
      { name: 'description', label: 'Escribe todo lo que imaginas', type: 'textarea', wide: true },
    ],
  },
  castings: {
    label: 'casting',
    feminine: false,
    route: '/model',
    fields: [
      { name: 'brand', label: 'Agencia / marca / cliente', required: true, wide: true },
      { name: 'type', label: 'Tipo de trabajo', type: 'select', options: ['Casting', 'Editorial', 'Pasarela', 'Campaña', 'Contenido UGC', 'Sesión', 'Colaboración'], default: 'Casting' },
      { name: 'date', label: 'Fecha', type: 'date' },
      { name: 'status', label: 'Estado', type: 'select', options: ['Pendiente', 'Aplicado', 'En conversación', 'Confirmado', 'Finalizado', 'Descartado'], default: 'Pendiente' },
      { name: 'feeCOP', label: 'Honorarios (COP)', type: 'number', default: 0 },
      { ...notes, label: 'Contacto / dirección / notas' },
    ],
  },
  sources: {
    label: 'fuente',
    feminine: true,
    route: '/study',
    fields: [
      { name: 'title', label: 'Título de la fuente', required: true, wide: true },
      { name: 'author', label: 'Autor / referencia' },
      { name: 'status', label: 'Estado', type: 'select', options: ['Por leer', 'Leyendo', 'Analizada', 'Citada'], default: 'Por leer' },
      { name: 'link', label: 'URL de la fuente', type: 'url', wide: true },
      { name: 'insight', label: 'Ideas clave y citas bibliográficas', type: 'textarea', wide: true },
    ],
  },
  journal: {
    label: 'entrada',
    feminine: true,
    route: '/journal',
    fields: [
      { name: 'title', label: 'Título de la entrada', wide: true },
      { name: 'date', label: 'Fecha', type: 'date', required: true, default: today },
      { name: 'mood', label: '¿Cómo te sentiste?', type: 'select', options: ['Feliz', 'Agradecida', 'Motivada', 'En calma', 'Cansada', 'Ansiosa', 'Triste', 'Reflexiva'], default: 'Reflexiva' },
      { name: 'entry', label: 'Lo que quieras escribir…', type: 'textarea', required: true, wide: true },
    ],
  },
};

const REQUIRED = 'Este campo es obligatorio.';

function fieldSchema(field: FieldDef): z.ZodType {
  if (field.type === 'number') {
    let number = z.number({ error: field.required ? REQUIRED : 'Escribe un número válido.' }).min(0, 'Debe ser cero o mayor.');
    if (field.max !== undefined) number = number.max(field.max, `El máximo es ${field.max}.`);
    const toNumber = (v: unknown) => (v === '' || v == null ? undefined : Number(v));
    if (field.required) return z.preprocess(toNumber, number);
    if (field.optional) return z.preprocess(toNumber, number.optional());
    return z.preprocess((v) => toNumber(v) ?? 0, number);
  }
  const text = z.string().trim();
  const base = field.required ? text.min(1, REQUIRED) : text;
  if (field.type === 'url') return base.refine((v) => !v || safeUrl(v) !== null, 'Escribe una URL completa que empiece por https://');
  return base;
}

export function formSchema(fields: FieldDef[]) {
  return z.object(Object.fromEntries(fields.map((f) => [f.name, fieldSchema(f)])));
}

export function newRecordTitle(def: CollectionDef) {
  return `${def.feminine ? 'Nueva' : 'Nuevo'} ${def.label}`;
}

export function savedMessage(def: CollectionDef) {
  const label = def.label[0]!.toUpperCase() + def.label.slice(1);
  return `${label} ${def.feminine ? 'guardada' : 'guardado'}`;
}
