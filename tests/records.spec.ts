import type { Page } from '@playwright/test';
import { expect, flushWrites, test } from './fixtures';

const dialog = (page: Page) => page.getByRole('dialog');
const field = (page: Page, label: string) => dialog(page).getByLabel(new RegExp(`^${label.replace(/[()?¿]/g, '\\$&')}( \\*)?$`));

test.describe('tareas', () => {
  test('crear, validar, editar, completar, recuperar y eliminar', async ({ page }) => {
    await page.goto('#/tasks');
    await page.getByRole('main').getByRole('button', { name: 'Nueva tarea' }).click();

    await page.getByRole('button', { name: 'Guardar tarea' }).click();
    await expect(page.getByText('Este campo es obligatorio.')).toBeVisible();

    await field(page, '¿Qué necesitas hacer?').fill('Grabar reel');
    await field(page, 'Prioridad').selectOption('Alta');
    await page.getByRole('button', { name: 'Guardar tarea' }).click();
    await expect(page.getByRole('main').getByText('Grabar reel')).toBeVisible();

    await page.getByRole('button', { name: 'Editar tarea' }).click();
    await field(page, '¿Qué necesitas hacer?').fill('Grabar reel de postres');
    await page.getByRole('button', { name: 'Guardar tarea' }).click();
    await expect(page.getByRole('main').getByText('Grabar reel de postres')).toBeVisible();

    await page.getByRole('checkbox', { name: 'Completar Grabar reel de postres' }).check();
    await flushWrites(page);
    await page.reload();
    await expect(page.getByRole('checkbox', { name: 'Completar Grabar reel de postres' })).toBeChecked();

    await page.getByRole('button', { name: 'Eliminar tarea' }).click();
    await dialog(page).getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('main').getByText('Grabar reel de postres')).toBeVisible();

    await page.getByRole('button', { name: 'Eliminar tarea' }).click();
    await dialog(page).getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('Registro eliminado')).toBeVisible();
    await page.reload();
    await expect(page.getByText('No hay tareas con esos filtros')).toBeVisible();
  });

  test('filtra por estado y texto', async ({ page }) => {
    await page.goto('#/tasks');
    for (const [title, status] of [['Alfa', 'Pendiente'], ['Beta', 'En progreso']] as const) {
      await page.getByRole('main').getByRole('button', { name: 'Nueva tarea' }).click();
      await field(page, '¿Qué necesitas hacer?').fill(title);
      await field(page, 'Estado').selectOption(status);
      await page.getByRole('button', { name: 'Guardar tarea' }).click();
      await expect(dialog(page)).toHaveCount(0);
    }
    const list = page.getByRole('main').getByRole('list');
    await page.getByLabel('Filtrar por estado').selectOption('En progreso');
    await expect(list.getByText('Beta')).toBeVisible();
    await expect(list.getByText('Alfa')).toHaveCount(0);
    await page.getByLabel('Filtrar por estado').selectOption('');
    await page.getByPlaceholder('Buscar tarea').fill('alf');
    await expect(list.getByText('Alfa')).toBeVisible();
    await expect(list.getByText('Beta')).toHaveCount(0);
  });
});

const crud: { route: string; button: string; fill: Record<string, string>; save: string; shown: string }[] = [
  { route: 'projects', button: 'Nuevo proyecto', fill: { 'Nombre del proyecto': 'Colección otoño' }, save: 'Guardar proyecto', shown: 'Colección otoño' },
  { route: 'calendar', button: 'Nuevo evento', fill: { 'Nombre del evento': 'Reunión hotel' }, save: 'Guardar evento', shown: 'Reunión hotel' },
  { route: 'habits', button: 'Crear hábito', fill: { Hábito: 'Hidratación' }, save: 'Guardar hábito', shown: 'Hidratación' },
  { route: 'content', button: 'Nueva publicación', fill: { 'Idea / título de la publicación': 'Reel de brunch' }, save: 'Guardar publicación', shown: 'Reel de brunch' },
  { route: 'brands', button: 'Nuevo producto', fill: { 'Producto / referencia': 'Anillo luna', 'Cantidad disponible': '4', 'Costo unitario COP': '1000', 'Venta unitaria COP': '2500' }, save: 'Guardar producto', shown: 'Anillo luna' },
  { route: 'creative', button: 'Capturar idea', fill: { 'Nombre de la idea': 'Editorial en blanco', 'URL de referencia': 'https://example.com/ref' }, save: 'Guardar idea', shown: 'Editorial en blanco' },
  { route: 'model', button: 'Nuevo casting', fill: { 'Agencia / marca / cliente': 'Agencia Norte' }, save: 'Guardar casting', shown: 'Agencia Norte' },
  { route: 'study', button: 'Añadir fuente', fill: { 'Título de la fuente': 'Identidad digital' }, save: 'Guardar fuente', shown: 'Identidad digital' },
  { route: 'orders', button: 'Nuevo pedido', fill: { Cliente: 'Clienta CRUD', Producto: 'Bolso', 'Producto (USD)': '50' }, save: 'Guardar pedido', shown: 'Clienta CRUD' },
  { route: 'finance', button: 'Nuevo movimiento', fill: { 'Valor (COP)': '1000', Concepto: 'Pago CRUD' }, save: 'Guardar movimiento', shown: 'Pago CRUD' },
  { route: 'finance', button: 'Nueva meta', fill: { 'Meta de ahorro': 'Viaje CRUD', 'Objetivo (COP)': '5000' }, save: 'Guardar meta', shown: 'Viaje CRUD' },
  { route: 'journal', button: 'Nueva entrada', fill: { 'Lo que quieras escribir…': 'Un buen día' }, save: 'Guardar entrada', shown: 'Un buen día' },
];

test.describe('registros de cada módulo', () => {
  for (const c of crud) {
    test(`${c.route} · ${c.button}: crear, recuperar, editar y eliminar`, async ({ page }) => {
      await page.goto(`#/${c.route}`);
      const main = page.getByRole('main');
      await main.getByRole('button', { name: c.button, exact: true }).click();
      for (const [label, value] of Object.entries(c.fill)) await field(page, label).fill(value);
      await page.getByRole('button', { name: c.save }).click();
      await expect(main.getByText(c.shown).filter({ visible: true }).first()).toBeVisible();

      await page.reload();
      await expect(main.getByText(c.shown).filter({ visible: true }).first()).toBeVisible();

      await main.getByRole('button', { name: /^Editar/ }).first().click();
      await dialog(page).getByRole('button', { name: c.save }).click();
      await expect(dialog(page)).toHaveCount(0);

      await main.getByRole('button', { name: /^Eliminar/ }).first().click();
      await dialog(page).getByRole('button', { name: 'Eliminar' }).click();
      await expect(main.getByText(c.shown)).toHaveCount(0);
    });
  }
});

test('el formulario rechaza una URL peligrosa', async ({ page }) => {
  await page.goto('#/creative');
  await page.getByRole('main').getByRole('button', { name: 'Capturar idea' }).click();
  await field(page, 'Nombre de la idea').fill('x');
  await field(page, 'URL de referencia').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Guardar idea' }).click();
  await expect(page.getByText('Escribe una URL completa')).toBeVisible();
});

test.describe('encargos USA', () => {
  test('la cotización se calcula en vivo y coincide en la lista', async ({ page }) => {
    await page.goto('#/orders');
    await page.getByRole('main').getByRole('button', { name: 'Nuevo pedido' }).click();
    await field(page, 'Cliente').fill('Ana');
    await field(page, 'Producto').fill('Tenis');
    await field(page, 'Producto (USD)').fill('100');
    await field(page, 'Envío en USA (USD)').fill('10');
    await field(page, 'Peso (libras)').fill('2');
    await field(page, 'Otros costos (USD)').fill('5');
    await expect(page.getByTestId('quote-preview')).toContainText('575.000');
    await field(page, 'Producto (USD)').fill('195');
    await expect(page.getByTestId('quote-preview')).toContainText('supera USD 200');
    await field(page, 'Producto (USD)').fill('100');
    await page.getByRole('button', { name: 'Guardar pedido' }).click();
    await expect(page.getByRole('main').getByRole('list').getByText(/575\.000/)).toBeVisible();
  });
});

test.describe('finanzas', () => {
  test('el balance del mes refleja los movimientos', async ({ page }) => {
    await page.goto('#/finance');
    const add = async (kind: string, value: string, name: string) => {
      await page.getByRole('main').getByRole('button', { name: 'Nuevo movimiento' }).click();
      await field(page, 'Tipo').selectOption(kind);
      await field(page, 'Valor (COP)').fill(value);
      await field(page, 'Concepto').fill(name);
      await page.getByRole('button', { name: 'Guardar movimiento' }).click();
      await expect(dialog(page)).toHaveCount(0);
    };
    await add('Ingreso', '100000', 'Pago Taikinsa');
    await add('Gasto', '30000', 'Transporte');
    await expect(page.getByRole('definition').filter({ hasText: /70\.000/ })).toBeVisible();
  });
});

test('hábitos: marcar actualiza la racha y persiste', async ({ page }) => {
  await page.goto('#/habits');
  await page.getByRole('main').getByRole('button', { name: 'Crear hábito' }).click();
  await field(page, 'Hábito').fill('Leer');
  await page.getByRole('button', { name: 'Guardar hábito' }).click();
  await page.getByRole('button', { name: 'Completar Leer' }).click();
  await expect(page.getByText('1 día de racha')).toBeVisible();
  await flushWrites(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Desmarcar Leer' })).toBeVisible();
});

test('focus: el temporizador corre y sigue al cambiar de página', async ({ page }) => {
  await page.goto('#/focus');
  await page.getByRole('button', { name: '5 min · Pausa' }).click();
  await expect(page.getByRole('timer')).toHaveText('05:00');
  await page.getByRole('button', { name: 'Empezar sesión' }).click();
  await expect(page.getByRole('timer')).toHaveText('04:59', { timeout: 3000 });
  await page.goto('#/tasks');
  await page.goto('#/focus');
  await expect(page.getByRole('button', { name: 'Pausar sesión' })).toBeVisible();
});

test('calendario: tocar un día muestra todo lo que tiene', async ({ page }) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
  await page.goto('#/calendar');
  await page.getByRole('main').getByRole('button', { name: 'Nuevo evento', exact: true }).click();
  await field(page, 'Nombre del evento').fill('Sesión de fotos');
  await field(page, 'Fecha').fill(today);
  await field(page, 'Hora').fill('15:30');
  await page.getByRole('button', { name: 'Guardar evento' }).click();
  await expect(dialog(page)).toHaveCount(0);

  await page.goto('#/tasks');
  await page.getByRole('main').getByRole('button', { name: 'Nueva tarea' }).click();
  await field(page, '¿Qué necesitas hacer?').fill('Enviar fotos');
  await field(page, 'Fecha límite').fill(today);
  await page.getByRole('button', { name: 'Guardar tarea' }).click();
  await expect(dialog(page)).toHaveCount(0);

  await page.goto('#/calendar');
  await page.locator('[aria-current="date"]').click();
  const agenda = dialog(page).getByRole('list', { name: 'Agenda del día' });
  await expect(agenda.getByRole('listitem')).toHaveCount(2);
  await expect(agenda.getByRole('listitem').first()).toContainText('Enviar fotos');
  await expect(agenda.getByRole('listitem').last()).toContainText('15:30');

  // Completar la tarea desde el día la quita de la agenda.
  await agenda.getByRole('checkbox', { name: 'Completar Enviar fotos' }).click();
  await expect(agenda.getByRole('listitem')).toHaveCount(1);

  // Editar abre el formulario del registro.
  await agenda.getByRole('button', { name: 'Editar Sesión de fotos' }).click();
  await expect(field(page, 'Nombre del evento')).toHaveValue('Sesión de fotos');
  await dialog(page).getByRole('button', { name: 'Cancelar' }).click();

  // Crear desde el día propone esa fecha.
  await page.locator('[aria-current="date"]').click();
  await dialog(page).getByRole('button', { name: 'Nuevo evento este día' }).click();
  await expect(field(page, 'Fecha')).toHaveValue(today);
});
