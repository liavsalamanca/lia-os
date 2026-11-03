import { describe, expect, it } from 'vitest';
import { handleFeed, handleImport, type FeedDeps } from './handlers.ts';
import { icloudUrl, MAX_BYTES } from './icloud.ts';
import { buildCalendar, escapeText, foldLine, zonedToUtc, type FeedRow } from './ics.ts';
import { newToken, sha256Hex, TOKEN_PATTERN } from './token.ts';

const row = (collection: string, id: string, data: Record<string, unknown>): FeedRow => ({ collection, id, data });
const unfold = (ics: string) => ics.replace(/\r\n /g, '');

describe('calendario .ics', () => {
  const rows = [
    row('events', 'e1', { title: 'Sesión de fotos, estudio', date: '2026-11-04', time: '09:30', notes: 'Llevar\nlooks', area: 'Modelaje', updatedAt: '2026-11-01T10:00:00.000Z' }),
    row('events', 'e2', { title: 'Feria', date: '2026-11-07', time: '' }),
    row('tasks', 't1', { title: 'Entrega moda', due: '2026-11-05', status: 'Pendiente' }),
    row('tasks', 't2', { title: 'Ya hecha', due: '2026-11-05', status: 'Hecho' }),
    row('tasks', 't3', { title: 'Sin fecha', due: '', status: 'Pendiente' }),
    row('castings', 'c1', { brand: 'Agencia Norte', type: 'Casting', date: '2026-11-06' }),
    row('content', 'p1', { title: 'Reel brunch', publishDate: '2026-11-08' }),
    row('orders', 'o1', { client: 'No va al calendario' }),
  ];
  const ics = unfold(buildCalendar(rows, 'America/Bogota', new Date('2026-11-02T00:00:00Z')));

  it('convierte la hora de Bogotá a UTC y usa una hora de duración', () => {
    expect(ics).toContain('DTSTART:20261104T143000Z');
    expect(ics).toContain('DTEND:20261104T153000Z');
  });

  it('sin hora, el evento es de todo el día', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20261107');
    expect(ics).toContain('DTEND;VALUE=DATE:20261108');
  });

  it('incluye tareas pendientes con fecha, castings y publicaciones', () => {
    expect(ics).toContain('SUMMARY:Tarea: Entrega moda');
    expect(ics).toContain('SUMMARY:Modelaje: Agencia Norte · Casting');
    expect(ics).toContain('SUMMARY:Publicación: Reel brunch');
    expect(ics).not.toContain('Ya hecha');
    expect(ics).not.toContain('Sin fecha');
    expect(ics).not.toContain('No va al calendario');
  });

  it('escapa comas, saltos de línea y usa UID estables', () => {
    expect(ics).toContain('SUMMARY:Sesión de fotos\\, estudio');
    expect(ics).toContain('DESCRIPTION:Llevar\\nlooks');
    expect(ics).toContain('UID:events-e1@lia-os');
    expect(ics).toContain('DTSTAMP:20261101T100000Z');
  });

  it('usa CRLF y ninguna línea pasa de 75 bytes', () => {
    const long = buildCalendar([row('events', 'x', { title: 'ñ'.repeat(200), date: '2026-11-04' })], 'America/Bogota');
    expect(long.endsWith('\r\n')).toBe(true);
    for (const line of long.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(unfold(long)).toContain(`SUMMARY:${'ñ'.repeat(200)}`);
    expect(foldLine('corta')).toBe('corta');
  });

  it('respeta el cambio de horario de otras zonas', () => {
    expect(zonedToUtc('2026-07-01', '09:00', 'America/New_York').toISOString()).toBe('2026-07-01T13:00:00.000Z');
    expect(zonedToUtc('2026-12-01', '09:00', 'America/New_York').toISOString()).toBe('2026-12-01T14:00:00.000Z');
  });

  it('escapeText trata la barra invertida y el punto y coma', () => {
    expect(escapeText('a\\b;c')).toBe('a\\\\b\\;c');
  });
});

describe('enlace privado', () => {
  it('es largo, aleatorio y apto para una URL', () => {
    const a = newToken();
    expect(a).toMatch(TOKEN_PATTERN);
    expect(newToken()).not.toBe(a);
  });

  it('el hash es SHA-256 en hexadecimal', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('función calendar-feed', () => {
  const token = newToken();
  const deps = (rows: FeedRow[] = []): FeedDeps => ({
    userForTokenHash: async (hash) => (hash === (await sha256Hex(token)) ? 'user-a' : null),
    rowsFor: async (user) => (user === 'user-a' ? rows : []),
  });
  const get = (query: string, method = 'GET') => new Request(`https://x.supabase.co/functions/v1/calendar-feed${query}`, { method });

  it('con el enlace correcto devuelve el calendario en la zona configurada', async () => {
    const res = await handleFeed(get(`?token=${token}`), deps([row('_settings', 'settings', { timezone: 'America/New_York' }), row('events', 'e', { title: 'Clase', date: '2026-12-01', time: '09:00' })]));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/calendar; charset=utf-8');
    const body = await res.text();
    expect(body).toContain('DTSTART:20261201T140000Z');
    expect(body).toContain('X-WR-TIMEZONE:America/New_York');
  });

  it('una zona horaria inválida usa la de Bogotá', async () => {
    const res = await handleFeed(get(`?token=${token}`), deps([row('_settings', 's', { timezone: 'Marte/Olympus' })]));
    expect(await res.text()).toContain('X-WR-TIMEZONE:America/Bogota');
  });

  it('un enlace falso, mal formado o ausente responde 404 sin pistas', async () => {
    for (const q of ['', '?token=corto', `?token=${newToken()}`]) {
      const res = await handleFeed(get(q), deps());
      expect(res.status).toBe(404);
      expect(await res.text()).toBe('Calendario no encontrado');
    }
  });

  it('solo acepta lectura', async () => {
    expect((await handleFeed(get(`?token=${token}`, 'POST'), deps())).status).toBe(405);
    const head = await handleFeed(get(`?token=${token}`, 'HEAD'), deps());
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });
});

describe('función calendar-import', () => {
  const ICS = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n';
  const URL_OK = 'webcal://p42-caldav.icloud.com/published/2/abc';
  const calls: string[] = [];
  const fetcher = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url.includes('redirige-fuera')) return new Response(null, { status: 302, headers: { location: 'https://evil.example/x' } });
    if (url.includes('redirige')) return new Response(null, { status: 301, headers: { location: 'https://p43-caldav.icloud.com/published/2/abc' } });
    if (url.includes('grande')) return new Response('x'.repeat(MAX_BYTES + 1));
    if (url.includes('noexiste')) return new Response('', { status: 404 });
    if (url.includes('html')) return new Response('<html></html>');
    return new Response(ICS);
  }) as typeof fetch;
  const deps = { userForJwt: async (jwt: string) => (jwt === 'valido' ? 'user-a' : null), fetcher };
  const post = (body: unknown, jwt = 'valido') =>
    handleImport(new Request('https://x.supabase.co/functions/v1/calendar-import', { method: 'POST', headers: { authorization: `Bearer ${jwt}` }, body: JSON.stringify(body) }), deps);

  it('exige sesión', async () => {
    expect((await post({ url: URL_OK }, 'falso')).status).toBe(401);
  });

  it('lee el calendario de iCloud y responde con CORS', async () => {
    const res = await post({ url: URL_OK });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(ICS);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(calls.at(-1)).toBe('https://p42-caldav.icloud.com/published/2/abc');
  });

  it('sigue redirecciones solo dentro de iCloud', async () => {
    expect((await post({ url: 'https://p42-caldav.icloud.com/redirige' })).status).toBe(200);
    expect(calls.at(-1)).toContain('p43-caldav.icloud.com');
    const res = await post({ url: 'https://p42-caldav.icloud.com/redirige-fuera' });
    expect(res.status).toBe(502);
    expect(calls.some((c) => c.includes('evil.example'))).toBe(false);
  });

  it('rechaza otros sitios sin pedirlos', async () => {
    const before = calls.length;
    for (const url of ['https://evil.example/cal.ics', 'https://icloud.com.evil.example/x', 'http://p42-caldav.icloud.com/x', 'https://user:pass@p42-caldav.icloud.com/x', 'https://p42-caldav.icloud.com:8443/x', 'nada']) {
      expect((await post({ url })).status, url).toBe(400);
    }
    expect(calls.length).toBe(before);
  });

  it('limita el tamaño y exige un calendario', async () => {
    expect((await post({ url: 'https://p42-caldav.icloud.com/grande' })).status).toBe(413);
    expect((await post({ url: 'https://p42-caldav.icloud.com/html' })).status).toBe(502);
    const missing = await post({ url: 'https://p42-caldav.icloud.com/noexiste' });
    expect(await missing.text()).toContain('no encontró');
  });

  it('valida la petición', async () => {
    expect((await post({})).status).toBe(400);
    const options = await handleImport(new Request('https://x/functions/v1/calendar-import', { method: 'OPTIONS' }), deps);
    expect(options.status).toBe(204);
  });

  it('icloudUrl normaliza webcal', () => {
    expect(icloudUrl('webcal://p01-caldav.icloud.com/a')?.toString()).toBe('https://p01-caldav.icloud.com/a');
  });
});
