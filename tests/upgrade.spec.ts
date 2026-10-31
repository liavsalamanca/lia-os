import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Simula lo que ocurrirá en GitHub Pages: la v1 real con su service worker es
 * reemplazada por el build nuevo en la misma URL. Requiere una copia de v1:
 * V1_DIR=/ruta/a/v1 npm run test:e2e -- upgrade --project=escritorio
 */
const V1_DIR = process.env.V1_DIR;
const PORT = 4310;
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

test('actualizar desde la v1 real conserva los datos y funciona sin conexión', async ({ page, context, browserName }) => {
  test.skip(!V1_DIR || browserName !== 'chromium', 'Requiere V1_DIR');
  let root = V1_DIR!;
  const server: Server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url!, 'http://x').pathname).replace(/^\/lia-os\//, '') || 'index.html';
    try {
      const body = await readFile(join(root, path));
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-cache' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  }).listen(PORT);

  try {
    const url = `http://localhost:${PORT}/lia-os/`;
    await page.goto(`${url}#tasks`);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    expect(await page.evaluate(() => caches.keys())).toContain('lia-os-static-v1');

    await page.getByRole('button', { name: /Nueva tarea/ }).click();
    await page.locator('[name="title"]').fill('Creada en la v1 real');
    await page.getByRole('button', { name: 'Guardar tarea' }).click();
    await expect(page.getByText('Creada en la v1 real')).toBeVisible();
    const raw = await page.evaluate(() => localStorage.getItem('lia-os-v1'));

    root = resolve('dist');
    await page.reload();
    await expect(page.getByRole('main').getByText('Creada en la v1 real')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('lia-os-v1'))).toBe(raw);

    await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain('lia-os-static-v1');
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toContain('/lia-os/sw.js');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect.poll(async () => (await page.evaluate(() => caches.keys())).some((k) => k.includes('precache'))).toBe(true);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('main').getByText('Creada en la v1 real')).toBeVisible();
  } finally {
    await context.setOffline(false);
    server.close();
  }
});
