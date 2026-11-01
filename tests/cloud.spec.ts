import type { BrowserContext, Page, Route } from '@playwright/test';
import { expect, test } from './fixtures';

/**
 * Dos dispositivos reales contra un Supabase simulado en memoria: prueba la
 * interfaz y el cliente real, no los permisos (esos están en rls.test.ts).
 * Requiere un build con VITE_SUPABASE_URL=http://supabase.test
 */
test.skip(process.env.VITE_SUPABASE_URL !== 'http://supabase.test', 'Requiere el build con Supabase simulado');
test.use({ serviceWorkers: 'block' });

type Row = { collection: string; id: string; data: unknown; deleted: boolean; modified_at: string; updated_at: string };

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
const USER = { id: '00000000-0000-0000-0000-00000000000a', email: 'prueba@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const jwt = `e30.${Buffer.from(JSON.stringify({ sub: USER.id, exp: 4102444800 })).toString('base64url')}.firma`;

function fakeSupabase() {
  const rows = new Map<string, Row>();
  let tick = 0;
  return async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (status: number, body: unknown) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    if (url.pathname === '/auth/v1/token') {
      const body = request.postDataJSON() as { password?: string };
      if (body.password !== 'correcta-123') return json(400, { error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
      return json(200, { access_token: jwt, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user: USER });
    }
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers: CORS });
    if (url.pathname === '/rest/v1/records' && request.method() === 'GET') {
      const since = url.searchParams.get('updated_at')?.replace('gte.', '');
      return json(200, [...rows.values()].filter((r) => !since || r.updated_at >= since));
    }
    if (url.pathname === '/rest/v1/records' && request.method() === 'POST') {
      for (const row of request.postDataJSON() as Row[]) {
        const key = `${row.collection}:${row.id}`;
        const current = rows.get(key);
        if (current && row.modified_at < current.modified_at) continue;
        rows.set(key, { ...row, updated_at: new Date(Date.now() + ++tick).toISOString() });
      }
      return route.fulfill({ status: 201, headers: CORS });
    }
    return json(404, {});
  };
}

async function device(context: BrowserContext, handler: (route: Route) => Promise<void>) {
  await context.route('http://supabase.test/**', handler);
  const page = await context.newPage();
  await page.goto('#/settings');
  return page;
}

const signIn = async (page: Page) => {
  await page.getByLabel('Correo').fill(USER.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('correcta-123');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
};

const addTask = async (page: Page, title: string) => {
  await page.goto('#/tasks');
  await page.getByRole('main').getByRole('button', { name: 'Nueva tarea' }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: '¿Qué necesitas hacer?' }).fill(title);
  await page.getByRole('button', { name: 'Guardar tarea' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
};

const syncNow = async (page: Page) => {
  await page.goto('#/settings');
  await page.getByRole('button', { name: 'Sincronizar ahora' }).click();
  await expect(page.getByText(/^Sincronizado/)).toBeVisible();
};

test.beforeEach(({ browserName, isMobile }) => {
  test.skip(browserName !== 'chromium' || isMobile, 'Basta con escritorio');
});

test('una contraseña incorrecta se rechaza con un mensaje claro', async ({ browser, errors }) => {
  const page = await device(await browser.newContext(), fakeSupabase());
  await page.getByLabel('Correo').fill(USER.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('mala');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByText('No se pudo iniciar sesión')).toBeVisible();
  errors.length = 0;
});

test('la conexión es voluntaria y guarda una copia antes', async ({ browser }) => {
  const page = await device(await browser.newContext(), fakeSupabase());
  await addTask(page, 'Antes de la nube');
  await page.goto('#/settings');
  await signIn(page);
  await expect(page.getByRole('button', { name: 'Conectar este dispositivo' })).toBeVisible();
  await page.getByRole('button', { name: 'Conectar este dispositivo' }).click();
  await expect(page.getByText(/^Sincronizado/)).toBeVisible();
  await expect(page.getByText('Antes de conectar la nube')).toBeVisible();
});

test('crear, editar y borrar viaja entre dos dispositivos', async ({ browser }) => {
  const cloud = fakeSupabase();
  const a = await device(await browser.newContext(), cloud);
  const b = await device(await browser.newContext(), cloud);
  for (const page of [a, b]) {
    await signIn(page);
    await page.getByRole('button', { name: 'Conectar este dispositivo' }).click();
    await expect(page.getByText(/^Sincronizado/)).toBeVisible();
  }

  await addTask(a, 'Desde el iPhone');
  await syncNow(a);
  await syncNow(b);
  await b.goto('#/tasks');
  await expect(b.getByRole('main').getByText('Desde el iPhone')).toBeVisible();

  await b.getByRole('button', { name: 'Eliminar tarea' }).click();
  await b.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await expect(b.getByText('Registro eliminado')).toBeVisible();
  await syncNow(b);
  await syncNow(a);
  await a.goto('#/tasks');
  await expect(a.getByText('No hay tareas con esos filtros')).toBeVisible();
});

test('los cambios se envían solos, sin pulsar nada', async ({ browser }) => {
  const cloud = fakeSupabase();
  const a = await device(await browser.newContext(), cloud);
  await signIn(a);
  await a.getByRole('button', { name: 'Conectar este dispositivo' }).click();
  await expect(a.getByText(/^Sincronizado/)).toBeVisible();
  const sent = a.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/rest/v1/records') && (r.postData() ?? '').includes('Envío automático'));
  await addTask(a, 'Envío automático');
  await sent;
});

test('cerrar sesión borrando este dispositivo no borra la nube', async ({ browser }) => {
  const cloud = fakeSupabase();
  const a = await device(await browser.newContext(), cloud);
  await signIn(a);
  await a.getByRole('button', { name: 'Conectar este dispositivo' }).click();
  await addTask(a, 'Debe seguir en la nube');
  await syncNow(a);

  await a.getByRole('button', { name: 'Cerrar y borrar de aquí' }).click();
  await a.getByRole('dialog').getByRole('button', { name: 'Cerrar y borrar de aquí' }).click();
  await expect(a.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  await a.goto('#/tasks');
  await expect(a.getByText('No hay tareas con esos filtros')).toBeVisible();

  await a.goto('#/settings');
  await signIn(a);
  await a.getByRole('button', { name: 'Conectar este dispositivo' }).click();
  await expect(a.getByText(/^Sincronizado/)).toBeVisible();
  await a.goto('#/tasks');
  await expect(a.getByRole('main').getByText('Debe seguir en la nube')).toBeVisible();
});
