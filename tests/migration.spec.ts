import { expect, legacyRaw, seedLegacy, test, v1Data } from './fixtures';

test.describe('migración desde v1', () => {
  test('muestra los datos anteriores en todas las áreas sin tocar el original', async ({ page }) => {
    const raw = JSON.stringify(v1Data);
    await seedLegacy(page, raw);
    await page.goto('#/tasks');
    await expect(page.getByText('Tarea heredada')).toBeVisible();

    const pages: [string, string][] = [
      ['projects', 'Proyecto heredado'],
      ['calendar', 'Evento heredado'],
      ['habits', 'Hábito heredado'],
      ['finance', 'Meta heredada'],
      ['orders', 'Clienta heredada'],
      ['brands', 'Aretes heredados'],
      ['content', 'Reel heredado'],
      ['creative', 'Idea heredada'],
      ['model', 'Agencia heredada'],
      ['study', 'Fuente heredada'],
      ['journal', 'Entrada heredada'],
    ];
    for (const [route, text] of pages) {
      await page.goto(`#/${route}`);
      await expect(page.getByText(text).first()).toBeVisible();
    }
    expect(await legacyRaw(page)).toBe(raw);
  });

  test('recargar no duplica y conserva lo editado', async ({ page }) => {
    await seedLegacy(page, JSON.stringify(v1Data));
    await page.goto('#/tasks');
    await page.getByRole('button', { name: 'Eliminar tarea' }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(1);
    await page.reload();
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(1);
  });

  test('con datos dañados avisa, no los pisa y permite descargarlos', async ({ page }) => {
    await seedLegacy(page, '{dañado');
    await page.goto('#/settings');
    await expect(page.getByRole('alert')).toContainText('Siguen intactos');
    await expect(page.getByRole('button', { name: 'Descargar copia original' })).toBeVisible();
    await page.goto('#/tasks');
    await page.getByRole('button', { name: 'Nueva tarea' }).first().click();
    await page.getByLabel('¿Qué necesitas hacer?').fill('Nueva');
    await page.getByRole('button', { name: 'Guardar tarea' }).click();
    await expect(page.getByText('Tarea guardada')).toBeVisible();
    expect(await legacyRaw(page)).toBe('{dañado');
  });

  test('borrar la copia anterior exige doble confirmación', async ({ page }) => {
    await seedLegacy(page, JSON.stringify(v1Data));
    await page.goto('#/settings');
    await page.getByRole('button', { name: 'Borrar copia' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
    expect(await legacyRaw(page)).not.toBeNull();
    await page.getByRole('button', { name: 'Borrar copia' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Borrar copia' }).click();
    await expect(page.getByText('Copia anterior eliminada')).toBeVisible();
    expect(await legacyRaw(page)).toBeNull();
  });
});
