import type { BrowserContext, Page, Route, WebSocketRoute } from '@playwright/test';
import { createHash } from 'node:crypto';
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
const jwt = `e30.${Buffer.from(JSON.stringify({ sub: USER.id, exp: 4102444800 })).toString('base64url')}.firma0`;

/** Mensaje de Phoenix (protocolo 2.0.0 de Realtime): [join_ref, ref, topic, event, payload]. */
type Frame = [string | null, string | null, string, string, Record<string, unknown>];

/** Imita Supabase Realtime: acepta la suscripción y avisa de cada fila escrita. */
function fakeRealtime() {
  const channels = new Set<{ ws: WebSocketRoute; joinRef: string | null; topic: string; ids: number[] }>();
  const connect = (ws: WebSocketRoute) => {
    ws.onMessage((raw) => {
      const [joinRef, ref, topic, event, payload] = JSON.parse(String(raw)) as Frame;
      let response: Record<string, unknown> = {};
      if (event === 'phx_join') {
        const config = payload.config as { postgres_changes: Record<string, unknown>[] };
        const bindings = config.postgres_changes.map((filter, i) => ({ ...filter, id: i + 1 }));
        channels.add({ ws, joinRef, topic, ids: bindings.map((b) => b.id) });
        response = { postgres_changes: bindings };
      }
      ws.send(JSON.stringify([joinRef, ref, topic, 'phx_reply', { status: 'ok', response }] satisfies Frame));
    });
  };
  const notify = () => {
    for (const c of channels) {
      const data = { type: 'UPDATE', schema: 'public', table: 'records', commit_timestamp: new Date().toISOString(), columns: [], record: {}, old_record: {}, errors: null };
      c.ws.send(JSON.stringify([c.joinRef, null, c.topic, 'postgres_changes', { ids: c.ids, data }] satisfies Frame));
    }
  };
  return { connect, notify };
}

const bogotaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const appleIcs = () =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', 'UID:clase@icloud', 'SUMMARY:Clase desde Apple', `DTSTART;TZID=America/Bogota:${bogotaToday().replace(/-/g, '')}T100000`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');

function fakeSupabase() {
  const rows = new Map<string, Row>();
  const feeds: { user_id: string; token_hash: string; created_at: string }[] = [];
  const realtime = fakeRealtime();
  let tick = 0;
  const http = async (route: Route) => {
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
    if (url.pathname === '/auth/v1/recover') return json(200, {});
    if (url.pathname === '/auth/v1/user') return json(200, USER);
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
      await route.fulfill({ status: 201, headers: CORS });
      realtime.notify();
      return;
    }
    if (url.pathname === '/rest/v1/calendar_feeds') {
      if (request.method() === 'GET') return json(200, feeds);
      if (request.method() === 'DELETE') feeds.length = 0;
      if (request.method() === 'POST') feeds.splice(0, feeds.length, ...[request.postDataJSON()].flat());
      return route.fulfill({ status: 204, headers: CORS });
    }
    if (url.pathname === '/functions/v1/calendar-import') {
      const { url: calendar } = request.postDataJSON() as { url: string };
      if (!calendar.includes('icloud.com')) return route.fulfill({ status: 400, headers: CORS, body: 'La dirección no es un calendario público de iCloud.' });
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'text/calendar; charset=utf-8' }, body: appleIcs() });
    }
    return json(404, {});
  };
  return Object.assign(http, { realtime, feeds });
}

async function device(context: BrowserContext, cloud: ReturnType<typeof fakeSupabase>) {
  await context.route('http://supabase.test/**', cloud);
  await context.routeWebSocket(/^ws:\/\/supabase\.test\//, cloud.realtime.connect);
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

test('un cambio aparece solo en el otro dispositivo, sin pulsar nada', async ({ browser }) => {
  const cloud = fakeSupabase();
  const a = await device(await browser.newContext(), cloud);
  const b = await device(await browser.newContext(), cloud);
  for (const page of [a, b]) {
    await signIn(page);
    await page.getByRole('button', { name: 'Conectar este dispositivo' }).click();
    await expect(page.getByText(/^Sincronizado/)).toBeVisible();
  }
  await b.goto('#/tasks');

  await addTask(a, 'Llega sola');
  // Menos que la revisión de respaldo (15 s): solo el aviso en tiempo real lo explica.
  await expect(b.getByRole('main').getByText('Llega sola')).toBeVisible({ timeout: 6000 });

  await a.getByRole('button', { name: 'Eliminar tarea' }).click();
  await a.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await expect(b.getByRole('main').getByText('Llega sola')).toHaveCount(0, { timeout: 6000 });
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

test.describe('recuperar la contraseña', () => {
  test('pide el enlace al correo', async ({ browser }) => {
    const page = await device(await browser.newContext(), fakeSupabase());
    await page.getByRole('button', { name: 'Olvidé mi contraseña' }).click();
    await page.getByLabel('Correo').fill(USER.email);
    const sent = page.waitForRequest((r) => r.url().includes('/auth/v1/recover'));
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    expect((await sent).url()).toContain(encodeURIComponent('/lia-os/'));
    await expect(page.getByText('Te enviamos un enlace al correo')).toBeVisible();
  });

  test('el enlace del correo permite cambiarla y no deja tokens en la dirección', async ({ browser }) => {
    const context = await browser.newContext();
    await context.route('http://supabase.test/**', fakeSupabase());
    const page = await context.newPage();
    await page.goto(`#access_token=${jwt}&refresh_token=r&expires_in=3600&expires_at=4102444800&token_type=bearer&type=recovery`);
    await expect(page.getByLabel('Contraseña nueva')).toBeVisible();
    expect(page.url()).not.toContain('access_token');
    await page.getByLabel('Contraseña nueva').fill('nueva-clave-123');
    await page.getByRole('button', { name: 'Cambiar contraseña' }).click();
    await expect(page.getByText('Contraseña actualizada')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Conectar este dispositivo' })).toBeVisible();
  });

  test('un enlace vencido lo explica', async ({ browser }) => {
    const context = await browser.newContext();
    await context.route('http://supabase.test/**', fakeSupabase());
    const page = await context.newPage();
    await page.goto('#error=access_denied&error_code=otp_expired&error_description=expired');
    await expect(page.getByText('venció o ya se usó')).toBeVisible();
  });
});
test('Apple Calendar en ambos sentidos', async ({ browser }) => {
  const cloud = fakeSupabase();
  const page = await device(await browser.newContext(), cloud);
  await signIn(page);
  await page.getByRole('button', { name: 'Conectar este dispositivo' }).click();
  await expect(page.getByText(/^Sincronizado/)).toBeVisible();

  // LIA OS → Apple: el enlace se muestra una vez y en la nube queda solo su hash.
  await page.getByRole('button', { name: 'Crear enlace privado' }).click();
  const link = await page.getByLabel('Enlace privado del calendario').inputValue();
  expect(link).toMatch(/^http:\/\/supabase\.test\/functions\/v1\/calendar-feed\?token=[A-Za-z0-9_-]{43}$/);
  const token = new URL(link).searchParams.get('token')!;
  expect(cloud.feeds[0]?.token_hash).toBe(createHash('sha256').update(token).digest('hex'));
  expect(JSON.stringify(cloud.feeds)).not.toContain(token);
  await expect(page.getByRole('link', { name: 'Abrir en Calendario' })).toHaveAttribute('href', link.replace(/^http:/, 'webcal:'));
  await page.reload();
  await expect(page.getByText(/^Enlace activo desde/)).toBeVisible();
  await expect(page.getByLabel('Enlace privado del calendario')).toHaveCount(0);

  // Apple → LIA OS: solo se aceptan enlaces de iCloud.
  const input = page.getByLabel('Enlace público de Apple Calendar');
  await input.fill('https://evil.example/cal.ics');
  await page.getByRole('button', { name: 'Conectar', exact: true }).click();
  await expect(page.getByText(/Pega el enlace que da el iPhone/)).toBeVisible();
  await input.fill('webcal://p42-caldav.icloud.com/published/2/prueba');
  await page.getByRole('button', { name: 'Conectar', exact: true }).click();
  await expect(page.getByText('Conectado · 1 eventos en los próximos meses')).toBeVisible();

  await page.goto('#/calendar');
  await expect(page.getByText('10:00 Clase desde Apple')).toBeVisible();
  await expect(page.getByText('Apple Calendar (se edita en Apple)')).toBeVisible();

  // Si iCloud falla, se avisa y se sigue mostrando la última copia, también tras recargar.
  await page.context().route('http://supabase.test/functions/v1/calendar-import', (route) => route.fulfill({ status: 502, headers: CORS, body: 'iCloud no respondió. Inténtalo más tarde.' }));
  await page.getByRole('button', { name: 'Actualizar Apple Calendar' }).click();
  await expect(page.getByText('iCloud no respondió. Inténtalo más tarde.')).toBeVisible();
  await expect(page.getByText('10:00 Clase desde Apple')).toBeVisible();
  await page.reload();
  await expect(page.getByText('10:00 Clase desde Apple')).toBeVisible();

  // Quitarlo borra los eventos de Apple de LIA OS.
  await page.goto('#/settings');
  await page.getByRole('button', { name: 'Quitar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Quitar' }).click();
  await page.goto('#/calendar');
  await expect(page.getByText('10:00 Clase desde Apple')).toHaveCount(0);
});
