import { useSyncExternalStore } from 'react';
import type { IndexedDbRepository } from '../data/idb';
import type { ExternalEvent } from '../domain/appleCalendar';
import { shiftDays } from '../domain/dates';
import { cloud } from './cloud';
import type { Store } from './store';

const CACHE_KEY = 'appleCalendarCache';
/** Apple publica los cambios con algo de retraso; pedirlo más seguido no adelanta nada. */
const STALE_MS = 10 * 60_000;
const PAST_DAYS = 90;
const FUTURE_DAYS = 400;

type Cache = { url: string; fetchedAt: string; ics: string };

export type AppleState = {
  events: ExternalEvent[];
  status: 'off' | 'loading' | 'ready' | 'error';
  fetchedAt: string | null;
  error: string | null;
};

const OFF: AppleState = { events: [], status: 'off', fetchedAt: null, error: null };

/** Eventos de Apple Calendar: solo lectura y guardados aparte, nunca en los registros ni en la nube. */
class Apple {
  private state: AppleState = OFF;
  private listeners = new Set<() => void>();
  private store!: Store;
  private repo!: IndexedDbRepository;
  private running: Promise<void> | null = null;
  private lastAttempt = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = () => this.state;

  private set(patch: Partial<AppleState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  private get url() {
    return this.store.getSnapshot().settings.appleCalendarUrl;
  }

  async start(store: Store, repo: IndexedDbRepository) {
    this.store = store;
    this.repo = repo;
    let lastUrl = this.url;
    let lastZone = store.getSnapshot().settings.timezone;
    store.subscribe(() => {
      const zone = store.getSnapshot().settings.timezone;
      if (this.url !== lastUrl) {
        lastUrl = this.url;
        void this.refresh({ force: true });
      } else if (zone !== lastZone) {
        // Las horas se calculan para la zona configurada: se recalculan desde la copia guardada.
        void this.showCache();
      }
      lastZone = zone;
    });
    cloud.subscribe(() => void this.refresh());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.refresh();
    });
    await this.showCache();
    await this.refresh();
  }

  private async parse(ics: string) {
    // ical.js se descarga solo si se usa Apple Calendar.
    const { parseCalendar } = await import('../domain/appleCalendar');
    const today = this.store.today();
    return parseCalendar(ics, { from: shiftDays(today, -PAST_DAYS), to: shiftDays(today, FUTURE_DAYS), timezone: this.store.getSnapshot().settings.timezone });
  }

  private async showCache() {
    const cache = await this.repo.getMeta<Cache>(CACHE_KEY);
    if (!this.url || cache?.url !== this.url) return;
    this.lastAttempt = Date.parse(cache.fetchedAt) || 0;
    try {
      this.set({ events: await this.parse(cache.ics), status: 'ready', fetchedAt: cache.fetchedAt, error: null });
    } catch {
      // Una copia dañada se ignora; la siguiente lectura la reemplaza.
    }
  }

  /** Lee de nuevo el calendario si cambió la dirección, si se pide o si la copia es vieja. */
  refresh({ force = false } = {}): Promise<void> {
    if (this.running) return this.running;
    this.running = this.load(force).finally(() => (this.running = null));
    return this.running;
  }

  private async load(force: boolean) {
    const url = this.url;
    if (!url) {
      if (this.state !== OFF) {
        this.set(OFF);
        await this.repo.setMeta(CACHE_KEY, undefined);
      }
      return;
    }
    const { email } = cloud.getState();
    if (!email || !navigator.onLine) return;
    // También tras un error se espera antes de reintentar, salvo que se pida.
    if (!force && Date.now() - this.lastAttempt < STALE_MS) return;
    this.lastAttempt = Date.now();

    this.set({ status: 'loading', error: null });
    try {
      const ics = await cloud.fetchAppleCalendar(url);
      const events = await this.parse(ics);
      const fetchedAt = new Date().toISOString();
      await this.repo.setMeta(CACHE_KEY, { url, fetchedAt, ics } satisfies Cache);
      // Si la dirección cambió mientras tanto, este resultado ya no sirve.
      if (this.url === url) this.set({ events, status: 'ready', fetchedAt, error: null });
    } catch (error) {
      // Se siguen mostrando los últimos eventos leídos.
      this.set({ status: 'error', error: error instanceof Error ? error.message : 'No se pudo leer el calendario.' });
    }
  }
}

export const apple = new Apple();

export function useApple() {
  return useSyncExternalStore(apple.subscribe, apple.getState);
}
