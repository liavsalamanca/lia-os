import { CalendarError, fetchIcloudCalendar } from './icloud.ts';
import { buildCalendar, type FeedRow } from './ics.ts';
import { sha256Hex, TOKEN_PATTERN } from './token.ts';

export const FEED_COLLECTIONS = ['events', 'tasks', 'castings', 'content'];
export const SETTINGS_COLLECTION = '_settings';
const DEFAULT_TIMEZONE = 'America/Bogota';

export type FeedDeps = {
  userForTokenHash(hash: string): Promise<string | null>;
  /** Filas no borradas del usuario en FEED_COLLECTIONS y su configuración. */
  rowsFor(userId: string): Promise<FeedRow[]>;
};

const text = (status: number, body: string, headers: Record<string, string> = {}) => new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...headers } });

const validTimezone = (tz: unknown): tz is string => {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/** GET ?token=…: el calendario de LIA OS. Un enlace desconocido responde igual que uno inexistente. */
export async function handleFeed(request: Request, deps: FeedDeps): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return text(405, 'Método no permitido', { allow: 'GET, HEAD' });
  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!TOKEN_PATTERN.test(token)) return text(404, 'Calendario no encontrado');
  const userId = await deps.userForTokenHash(await sha256Hex(token));
  if (!userId) return text(404, 'Calendario no encontrado');

  const rows = await deps.rowsFor(userId);
  const settings = rows.find((r) => r.collection === SETTINGS_COLLECTION)?.data;
  const timezone = validTimezone(settings?.timezone) ? settings.timezone : DEFAULT_TIMEZONE;
  const body = buildCalendar(
    rows.filter((r) => FEED_COLLECTIONS.includes(r.collection)),
    timezone,
  );
  return new Response(request.method === 'HEAD' ? null : body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="lia-os.ics"',
      'cache-control': 'private, max-age=300',
      'x-robots-tag': 'noindex',
    },
  });
}

export type ImportDeps = {
  userForJwt(jwt: string): Promise<string | null>;
  fetcher?: typeof fetch;
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-allow-methods': 'POST, OPTIONS',
};

/** POST { url } con sesión iniciada: el texto del calendario público de iCloud. */
export async function handleImport(request: Request, deps: ImportDeps): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return text(405, 'Método no permitido', { ...CORS, allow: 'POST' });
  const jwt = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const userId = jwt ? await deps.userForJwt(jwt) : null;
  if (!userId) return text(401, 'Inicia sesión para leer tu calendario.', CORS);

  let url: unknown;
  try {
    url = ((await request.json()) as { url?: unknown }).url;
  } catch {
    return text(400, 'Petición no válida.', CORS);
  }
  if (typeof url !== 'string') return text(400, 'Falta la dirección del calendario.', CORS);
  try {
    const calendar = await fetchIcloudCalendar(url, deps.fetcher);
    return new Response(calendar, { headers: { ...CORS, 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'no-store' } });
  } catch (error) {
    if (error instanceof CalendarError) return text(error.status, error.message, CORS);
    return text(502, 'No se pudo leer el calendario de iCloud. Inténtalo más tarde.', CORS);
  }
}
