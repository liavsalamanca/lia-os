import type { Page } from '@playwright/test';
import { expect, flushWrites, test } from './fixtures';

const dialog = (page: Page) => page.getByRole('dialog');
const field = (page: Page, label: string) => dialog(page).getByLabel(new RegExp(`^${label.replace(/[()?¿]/g, '\\$&')}( \\*)?$`));
const main = (page: Page) => page.getByRole('main');
const bogota = (offsetDays = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(Date.now() + offsetDays * 86_400_000));

async function newTask(page: Page, title: string, fill: (page: Page) => Promise<void> = async () => {}) {
  await main(page).getByRole('button', { name: 'Nueva tarea' }).click();
  await field(page, '¿Qué necesitas hacer?').fill(title);
  await fill(page);
  await page.getByRole('button', { name: 'Guardar tarea' }).click();
  await expect(dialog(page)).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await page.goto('#/tasks');
});

test('subtareas y etiquetas: crear, marcar desde la lista, filtrar y buscar', async ({ page }) => {
  await newTask(page, 'Reel de postres', async () => {
    await field(page, 'Etiquetas').fill('Taikinsa, video');
    const draft = dialog(page).getByLabel('Nueva subtarea');
    await draft.fill('Guion');
    await draft.press('Enter');
    await draft.fill('Grabar');
    await dialog(page).getByRole('button', { name: 'Añadir subtarea' }).click();
  });
  await newTask(page, 'Pagar casillero');

  const row = main(page).getByRole('listitem').filter({ hasText: 'Reel de postres' });
  await expect(row.getByText('#video')).toBeVisible();
  await row.getByRole('button', { name: '0/2 pasos' }).click();
  await row.getByRole('checkbox', { name: 'Guion' }).check();
  await expect(row.getByRole('button', { name: '1/2 pasos' })).toBeVisible();

  await flushWrites(page);
  await page.reload();
  await expect(main(page).getByRole('button', { name: '1/2 pasos' })).toBeVisible();

  await page.getByLabel('Filtrar por etiqueta').selectOption('video');
  await expect(main(page).getByText('Pagar casillero')).toHaveCount(0);
  await page.getByLabel('Filtrar por etiqueta').selectOption('');
  await page.getByPlaceholder('Buscar tarea').fill('grabar');
  await expect(main(page).getByText('Reel de postres')).toBeVisible();
  await expect(main(page).getByText('Pagar casillero')).toHaveCount(0);
});

test('editar conserva las subtareas y permite quitarlas', async ({ page }) => {
  await newTask(page, 'Moodboard', async () => {
    await dialog(page).getByLabel('Nueva subtarea').fill('Buscar referencias');
    await dialog(page).getByLabel('Nueva subtarea').press('Enter');
  });
  await page.getByRole('button', { name: 'Editar tarea' }).click();
  await expect(dialog(page).getByRole('textbox', { name: 'Texto de la subtarea' })).toHaveValue('Buscar referencias');
  await dialog(page).getByRole('button', { name: 'Quitar subtarea Buscar referencias' }).click();
  await page.getByRole('button', { name: 'Guardar tarea' }).click();
  await expect(main(page).getByRole('button', { name: /pasos/ })).toHaveCount(0);
});

test('una tarea recurrente vuelve a quedar pendiente en su próxima fecha', async ({ page }) => {
  await newTask(page, 'Reporte semanal', async () => {
    await field(page, 'Fecha límite').fill(bogota());
    await field(page, 'Se repite').selectOption('Semanal');
  });
  await page.getByRole('checkbox', { name: 'Completar Reporte semanal' }).click();
  await expect(page.getByText(/^Hecha\. Se repite el/)).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Completar Reporte semanal' })).not.toBeChecked();
  await page.getByRole('button', { name: /^Próximas/ }).click();
  await expect(main(page).getByText('Reporte semanal')).toBeVisible();
  await page.getByRole('button', { name: /^Hoy/ }).click();
  await expect(main(page).getByText('Reporte semanal')).toHaveCount(0);
});

test('una tarea que espera a otra se marca como bloqueada y pide confirmación', async ({ page }) => {
  await newTask(page, 'Recibir muestras');
  await newTask(page, 'Sesión de fotos', async () => {
    await dialog(page).getByRole('checkbox', { name: 'Recibir muestras' }).check();
  });
  const row = main(page).getByRole('listitem').filter({ hasText: 'Sesión de fotos' });
  await expect(row.getByText('Bloqueada')).toBeVisible();
  await expect(row.getByText('Espera a: Recibir muestras')).toBeVisible();

  await row.getByRole('checkbox', { name: 'Completar Sesión de fotos' }).click();
  await dialog(page).getByRole('button', { name: 'Cancelar' }).click();
  await expect(row.getByRole('checkbox', { name: 'Completar Sesión de fotos' })).not.toBeChecked();

  await page.getByRole('checkbox', { name: 'Completar Recibir muestras' }).check();
  await expect(row.getByText('Bloqueada')).toHaveCount(0);

  // El requisito no puede depender de la tarea que lo espera.
  await main(page).getByRole('listitem').filter({ hasText: 'Recibir muestras' }).getByRole('button', { name: 'Editar tarea' }).click();
  await expect(dialog(page).getByRole('checkbox', { name: 'Sesión de fotos' })).toHaveCount(0);
});

test('vistas inteligentes: hoy, mañana, vencidas y algún día', async ({ page }) => {
  const tasks: [string, string][] = [
    ['Para hoy', bogota()],
    ['Para mañana', bogota(1)],
    ['Atrasada', bogota(-3)],
    ['Sin fecha', ''],
  ];
  for (const [title, due] of tasks) await newTask(page, title, async () => (due ? field(page, 'Fecha límite').fill(due) : undefined));

  const shown = async (view: RegExp, expected: string[]) => {
    await page.getByRole('button', { name: view }).click();
    for (const [title] of tasks) await expect(main(page).getByRole('listitem').filter({ hasText: title })).toHaveCount(expected.includes(title) ? 1 : 0);
  };
  await shown(/^Hoy/, ['Para hoy']);
  await shown(/^Mañana/, ['Para mañana']);
  await shown(/^Vencidas/, ['Atrasada']);
  await shown(/^Algún día/, ['Sin fecha']);
  await shown(/^Todas/, tasks.map(([t]) => t));
  await expect(page.getByRole('button', { name: /^Hoy/ })).toHaveText('Hoy 1');

  await page.getByRole('button', { name: /^Hoy/ }).click();
  await main(page).getByRole('button', { name: 'Nueva tarea' }).click();
  await expect(field(page, 'Fecha límite')).toHaveValue(bogota());
});

test('un recordatorio exige fecha límite', async ({ page }) => {
  await main(page).getByRole('button', { name: 'Nueva tarea' }).click();
  await field(page, '¿Qué necesitas hacer?').fill('Llamar a la agencia');
  await field(page, 'Recordatorio').fill('09:00');
  await page.getByRole('button', { name: 'Guardar tarea' }).click();
  await expect(dialog(page).getByText('Elige una fecha límite para el recordatorio.')).toBeVisible();
});

test('el recordatorio avisa a su hora con la app abierta', async ({ page }) => {
  // Recargar justo tras la navegación del beforeEach a veces se interrumpe en WebKit:
  // se sale de la app, se instala el reloj y se vuelve a cargar desde cero.
  await page.goto('about:blank');
  await page.clock.install({ time: new Date('2026-11-04T13:58:00Z') }); // 08:58 en Bogotá
  await page.goto('#/tasks');
  await newTask(page, 'Llamar a la agencia', async () => {
    await field(page, 'Fecha límite').fill('2026-11-04');
    await field(page, 'Recordatorio').fill('09:00');
  });
  await expect(main(page).getByText(/Aviso 09:00/)).toBeVisible();
  await expect(page.getByText('Recordatorio: Llamar a la agencia')).toHaveCount(0);
  await page.clock.fastForward(120_000);
  await expect(page.getByText('Recordatorio: Llamar a la agencia')).toBeVisible();
});
