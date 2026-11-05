/**
 * Lectura de un calendario público de iCloud desde el servidor: el navegador no
 * puede pedirlo directamente (CORS). Solo se aceptan direcciones de iCloud, para
 * que la función no sirva de puente hacia cualquier otro sitio.
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

/** Devuelve la URL https si es un calendario de iCloud; si no, null. */
export function icloudUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim().replace(/^webcals?:\/\//i, 'https://'));
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  if (host !== 'icloud.com' && !host.endsWith('.icloud.com')) return null;
  return url;
}

export async function fetchIcloudCalendar(raw: string, fetcher: typeof fetch = fetch): Promise<string> {
  let url = icloudUrl(raw);
  if (!url) throw new CalendarError('La dirección no es un calendario público de iCloud.', 400);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response: Response = await fetcher(url.toString(), { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { accept: 'text/calendar' } });
    if (response.status >= 300 && response.status < 400) {
      const next: string | null = response.headers.get('location');
      url = next ? icloudUrl(new URL(next, url).toString()) : null;
      if (!url) throw new CalendarError('iCloud redirigió a una dirección no permitida.', 502);
      continue;
    }
    if (!response.ok) throw new CalendarError(response.status === 404 ? 'iCloud no encontró ese calendario. Revisa que siga siendo público.' : 'iCloud no respondió. Inténtalo más tarde.', 502);
    const declared = Number(response.headers.get('content-length'));
    if (declared > MAX_BYTES) throw new CalendarError('El calendario es demasiado grande.', 413);
    const text = await readLimited(response);
    if (!text.includes('BEGIN:VCALENDAR')) throw new CalendarError('La dirección no devolvió un calendario.', 502);
    return text;
  }
  throw new CalendarError('iCloud redirigió demasiadas veces.', 502);
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
