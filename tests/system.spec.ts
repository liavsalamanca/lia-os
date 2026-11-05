import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, seedLegacy, test, v1Data } from './fixtures';

const ROUTES = ['overview', 'tasks', 'calendar', 'projects', 'habits', 'focus', 'content', 'orders', 'brands', 'finance', 'creative', 'model', 'study', 'journal', 'settings'];

const importFile = async (page: Page, name: string, content: string) => {
  await page.getByTestId('import-file').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(content) });
};

test.describe('navegación', () => {
  test('la raíz abre Overview y recargar una ruta no da error', async ({ page }) => {
    await page.goto('');
    await expect(page).toHaveURL(/#\/overview$/);
    await page.goto('#/orders');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Encargos USA' })).toBeVisible();
  });

  test('los enlaces de la versión anterior siguen funcionando', async ({ page }) => {
    await page.goto('#finance');
    await expect(page.getByRole('heading', { name: 'Finanzas', level: 1 })).toBeVisible();
  });

  test('una ruta desconocida vuelve a Overview', async ({ page }) => {
    await page.goto('#/nada');
    await expect(page).toHaveURL(/#\/overview$/);
  });

  for (const route of ROUTES) {
    test(`${route} no desborda la pantalla`, async ({ page }) => {
      await seedLegacy(page, JSON.stringify(v1Data));
      await page.goto(`#/${route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('búsqueda y comandos', () => {
  test('encuentra un registro con el teclado y abre su edición', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Atajo de teclado de escritorio');
    await seedLegacy(page, JSON.stringify(v1Data));
    await page.goto('#/overview');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox').fill('clienta');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/orders$/);
    await expect(page.getByRole('dialog')).toContainText('Editar pedido');
    await expect(page.getByRole('dialog').getByRole('textbox', { name: 'Cliente' })).toHaveValue('Clienta heredada');
  });

  test('navega con las flechas y cierra con Escape', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Atajo de teclado de escritorio');
    await page.goto('#/overview');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox').fill('finanzas');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/finance$/);
    await page.keyboard.press('Control+k');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('funciona también con el botón de búsqueda', async ({ page }) => {
    await page.goto('#/overview');
    await page.getByRole('button', { name: /Buscar/ }).locator('visible=true').click();
    await page.getByRole('combobox').fill('sin coincidencias xyz');
    await expect(page.getByText('Sin resultados')).toBeVisible();
  });
});

test('móvil: el menú Más da acceso a todos los módulos', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Solo móvil');
  await page.goto('#/overview');
  await page.getByRole('button', { name: 'Más' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Taikinsa Studio' }).click();
  await expect(page.getByRole('heading', { name: 'Taikinsa Studio' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('el tema oscuro persiste', async ({ page }) => {
  await page.goto('#/overview');
  await page.getByRole('button', { name: 'Cambiar tema' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('los cambios llegan a otra pestaña abierta', async ({ page, context }) => {
  await page.goto('#/tasks');
  const other = await context.newPage();
  await other.goto(page.url());
  await page.getByRole('main').getByRole('button', { name: 'Nueva tarea' }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: '¿Qué necesitas hacer?' }).fill('Desde otra pestaña');
  await page.getByRole('button', { name: 'Guardar tarea' }).click();
  await expect(other.getByRole('main').getByText('Desde otra pestaña')).toBeVisible();
});

test.describe('respaldos', () => {
  test('exportar e importar restaura los datos y guarda una copia automática', async ({ page }) => {
    await seedLegacy(page, JSON.stringify(v1Data));
    await page.goto('#/settings');
    await expect(page.getByRole('heading', { name: 'Configuración' })).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar respaldo' }).locator('visible=true').first().click();
    const backup = await readFile(await (await download).path());
    expect(backup.toString()).not.toContain('service_role');

    await page.goto('#/tasks');
    await page.getByRole('button', { name: 'Eliminar tarea' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(1);

    await page.goto('#/settings');
    await importFile(page, 'respaldo.json', backup.toString());
    await page.getByRole('dialog').getByRole('button', { name: 'Importar' }).click();
    await expect(page.getByText('Respaldo restaurado')).toBeVisible();
    await expect(page.getByText('Antes de importar')).toBeVisible();
    await page.goto('#/tasks');
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(2);
  });

  test('acepta un respaldo de la versión 1', async ({ page }) => {
    await page.goto('#/settings');
    await importFile(page, 'v1.json', JSON.stringify(v1Data));
    await page.getByRole('dialog').getByRole('button', { name: 'Importar' }).click();
    await expect(page.getByText('Respaldo restaurado')).toBeVisible();
    await page.goto('#/tasks');
    await expect(page.getByText('Tarea heredada')).toBeVisible();
  });

  test('un archivo inválido no modifica nada', async ({ page }) => {
    await seedLegacy(page, JSON.stringify(v1Data));
    await page.goto('#/settings');
    await importFile(page, 'malo.json', '{"foo":1}');
    await page.getByRole('dialog').getByRole('button', { name: 'Importar' }).click();
    await expect(page.getByText('El formato no corresponde a LIA OS.')).toBeVisible();
    await page.goto('#/tasks');
    await expect(page.getByText('Tarea heredada')).toBeVisible();
  });

  test('un respaldo manipulado no ejecuta código', async ({ page }) => {
    const payload = '"><img src=x onerror="window.__xss=1">';
    const evil = {
      ...v1Data,
      settings: { ...v1Data.settings, name: payload },
      habits: [{ id: payload, name: payload, area: payload, notes: payload }],
      tasks: [{ id: 'x', title: payload, area: payload, priority: payload, status: payload, due: payload, notes: payload }],
      ideas: [{ id: 'i', title: payload, link: 'javascript:window.__xss=1', description: payload, area: '', type: '', status: '' }],
    };
    await page.goto('#/settings');
    await importFile(page, 'evil.json', JSON.stringify(evil));
    await page.getByRole('dialog').getByRole('button', { name: 'Importar' }).click();
    await expect(page.getByText('Respaldo restaurado')).toBeVisible();
    for (const route of ['overview', 'tasks', 'habits', 'creative']) {
      await page.goto(`#/${route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
    await expect(page.locator('a[href^="javascript"]')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });

  test('eliminar todo exige doble confirmación y borra las copias automáticas', async ({ page }) => {
    await seedLegacy(page, JSON.stringify(v1Data));
    await page.goto('#/settings');
    await importFile(page, 'v1.json', JSON.stringify(v1Data));
    await page.getByRole('dialog').getByRole('button', { name: 'Importar' }).click();
    await expect(page.getByText('Antes de importar')).toBeVisible();
    await page.getByRole('button', { name: 'Eliminar todos los datos' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar todo' }).click();
    await expect(page.getByText('Datos eliminados')).toBeVisible();
    await expect(page.getByText('Antes de importar')).toHaveCount(0);
    await page.reload();
    await page.goto('#/tasks');
    await expect(page.getByText('No hay tareas con esos filtros')).toBeVisible();
  });
});

test('cambiar la zona horaria se guarda y se aplica', async ({ page }) => {
  await page.goto('#/settings');
  await page.getByLabel('Zona horaria').selectOption('Europe/Madrid');
  await expect(page.getByText('Zona horaria actualizada')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Zona horaria')).toHaveValue('Europe/Madrid');
});
