/**
 * Lectura de un calendario externo desde el servidor: el navegador no puede
 * pedirlo directamente (CORS). Solo se aceptan calendarios públicos de iCloud y
 * direcciones iCal de Google Calendar, para que la función no sirva de puente
 * hacia cualquier otro sitio.
 */

export const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;

export class CalendarError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type CalendarSource = 'Apple Calendar' | 'Google Calendar';

const isIcloud = (url: URL) => url.hostname === 'icloud.com' || url.hostname.endsWith('.icloud.com');
// Google sirve la dirección iCal (pública o secreta) bajo esta ruta.
const isGoogle = (url: URL) => url.hostname === 'calendar.google.com' && url.pathname.startsWith('/calendar/ical/');

/** Devuelve la URL https si es un calendario de iCloud o Google; si no, null. */
export function externalCalendarUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim().replace(/^webcals?:\/\//i, 'https://'));
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  return isIcloud(url) || isGoogle(url) ? url : null;
}

export function calendarSource(raw: string): CalendarSource {
  const url = externalCalendarUrl(raw);
  return url && isGoogle(url) ? 'Google Calendar' : 'Apple Calendar';
}

export async function fetchExternalCalendar(raw: string, fetcher: typeof fetch = fetch): Promise<string> {
  let url = externalCalendarUrl(raw);
  if (!url) throw new CalendarError('La dirección no es un calendario de iCloud ni de Google Calendar.', 400);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response: Response = await fetcher(url.toString(), { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: 'text/calendar' } });
    if (response.status >= 300 && response.status < 400) {
      const next: string | null = response.headers.get('location');
      url = next ? externalCalendarUrl(new URL(next, url).toString()) : null;
      if (!url) throw new CalendarError('El calendario redirigió a una dirección no permitida.', 502);
      continue;
    }
    if (!response.ok) throw new CalendarError(response.status === 404 ? 'No se encontró ese calendario. Revisa que el enlace siga activo.' : 'El calendario no respondió. Inténtalo más tarde.', 502);
    const declared = Number(response.headers.get('content-length'));
    if (declared > MAX_BYTES) throw new CalendarError('El calendario es demasiado grande.', 413);
    const text = await readLimited(response);
    if (!text.includes('BEGIN:VCALENDAR')) throw new CalendarError('La dirección no devolvió un calendario.', 502);
    return text;
  }
  throw new CalendarError('El calendario redirigió demasiadas veces.', 502);
}

async function readLimited(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new CalendarError('El calendario es demasiado grande.', 413);
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(all);
}
