import { expect, test as base, type Page } from '@playwright/test';

/** Datos ficticios con la forma exacta que guardaba la versión 1. */
export const v1Data = {
  version: 1,
  settings: { name: 'Prueba', theme: 'light', portfolio: '', focusMinutes: 25, shippingRate: 5, fx: 4000 },
  tasks: [
    { id: 'task-1', title: 'Tarea heredada', area: 'Personal', priority: 'Alta', status: 'Pendiente', due: '2030-01-10', projectId: 'project-1', notes: '' },
    { id: 'task-2', title: 'Tarea terminada', area: 'Taikinsa', priority: 'Baja', status: 'Hecho', due: '', projectId: '', notes: '' },
  ],
  projects: [{ id: 'project-1', name: 'Proyecto heredado', area: 'Personal', status: 'En progreso', progress: 0, deadline: '', notes: '' }],
  events: [{ id: 'event-1', title: 'Evento heredado', date: '2030-02-01', time: '10:00', area: 'Personal', notes: '' }],
  habits: [{ id: 'habit-1', name: 'Hábito heredado', area: 'Bienestar', notes: '' }],
  habitLogs: { 'habit-1': ['2026-01-01'] },
  transactions: [],
  goals: [{ id: 'goal-1', name: 'Meta heredada', target: 1000, current: 250, deadline: '' }],
  orders: [{ id: 'order-1', client: 'Clienta heredada', item: 'Tenis', store: 'Tienda', status: 'Pendiente', priceUSD: 100, shippingUSD: 10, weightLb: 2, shippingRate: 5, extraUSD: 5, fx: 4000, marginPercent: 15, notes: '' }],
  products: [{ id: 'product-1', name: 'Aretes heredados', brand: 'Mariè', stock: 3, costCOP: 1000, priceCOP: 3000, notes: '' }],
  content: [{ id: 'content-1', title: 'Reel heredado', format: 'Reel', platform: 'Instagram', status: 'Idea', publishDate: '', notes: '' }],
  ideas: [{ id: 'idea-1', title: 'Idea heredada', area: 'Creatividad', type: 'Concepto', status: 'Idea', link: '', description: '' }],
  castings: [{ id: 'casting-1', brand: 'Agencia heredada', type: 'Casting', date: '', status: 'Pendiente', feeCOP: 0, notes: '' }],
  sources: [{ id: 'source-1', title: 'Fuente heredada', author: 'Autora', status: 'Por leer', link: '', insight: '' }],
  journal: [{ id: 'journal-1', title: 'Entrada heredada', date: '2026-01-01', mood: 'Feliz', entry: 'Texto' }],
};

export const seedLegacy = (page: Page, raw: string) =>
  page.addInitScript(
    ([key, value]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(key!, value!);
        sessionStorage.setItem('seeded', '1');
      }
    },
    ['lia-os-v1', raw],
  );

export const legacyRaw = (page: Page) => page.evaluate(() => localStorage.getItem('lia-os-v1'));

/** Una lectura en IndexedDB espera a que terminen las escrituras en curso. */
export const flushWrites = (page: Page) =>
  page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('lia-os');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const get = open.result.transaction(['records', 'kv']).objectStore('kv').get('habitLogs');
          get.onsuccess = () => {
            open.result.close();
            resolve(null);
          };
        };
      }),
  );

export const test = base.extend<{ errors: string[] }>({
  /** Cualquier error de consola o excepción hace fallar la prueba. */
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
