import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';
import type { IndexedDbRepository } from '../data/idb';
import { SYNC_STATE_KEY, SyncEngine } from '../data/sync/engine';
import type { RecoveryLink } from './recovery';
import type { Store } from './store';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const OWNER_KEY = 'syncOwner';
const PUSH_DELAY_MS = 800;
/** Agrupa los avisos de la nube que llegan juntos, como el eco de una subida propia. */
const PULL_DELAY_MS = 300;
/** Respaldo por si el aviso en tiempo real no llega; solo con la app a la vista. */
const POLL_MS = 15_000;

export type CloudState = {
  configured: boolean;
  /** Sesión iniciada en la nube. */
  email: string | null;
  /** Hay sesión, pero este dispositivo aún no se ha conectado. */
  needsLink: boolean;
  /** Este dispositivo tiene datos de otra cuenta. */
  otherOwner: boolean;
  /** Se abrió un enlace de recuperación de contraseña. */
  recovery: 'ready' | 'expired' | null;
  status: 'off' | 'syncing' | 'synced' | 'offline' | 'error';
  lastSyncAt: string | null;
  error: string | null;
};

class Cloud {
  private state: CloudState = { configured: Boolean(URL && KEY), email: null, needsLink: false, otherOwner: false, recovery: null, status: 'off', lastSyncAt: null, error: null };
  private listeners = new Set<() => void>();
  private client: SupabaseClient | null = null;
  private engine: SyncEngine | null = null;
  private userId: string | null = null;
  private store!: Store;
  private repo!: IndexedDbRepository;
  private pushTimer: ReturnType<typeof setTimeout> | undefined;
  private pullTimer: ReturnType<typeof setTimeout> | undefined;
  private channel: RealtimeChannel | null = null;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = () => this.state;

  get active() {
    return this.engine !== null;
  }

  private set(patch: Partial<CloudState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  async start(store: Store, repo: IndexedDbRepository, recovery: RecoveryLink | null) {
    this.store = store;
    this.repo = repo;
    if (!URL || !KEY) return;
    // Carga diferida: quien no usa la nube no descarga el cliente.
    const { createClient } = await import('@supabase/supabase-js');
    this.client = createClient(URL, KEY, { auth: { detectSessionInUrl: false } });
    if (recovery) await this.openRecovery(recovery);
    const { data } = await this.client.auth.getSession();
    await this.onSession(data.session?.user ?? null);
    // Las llamadas a Supabase dentro de este aviso se bloquean: se difiere el trabajo.
    this.client.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => void this.onSession(session?.user ?? null), 0);
    });
    store.onLocalChange = () => {
      clearTimeout(this.pushTimer);
      this.pushTimer = setTimeout(() => {
        this.pushTimer = undefined;
        void this.syncNow();
      }, PUSH_DELAY_MS);
    };
    window.addEventListener('online', () => this.syncNow());
    // Al salir de la app se envía lo pendiente sin esperar; al volver se trae lo nuevo.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' || this.pushTimer) {
        clearTimeout(this.pushTimer);
        this.pushTimer = undefined;
        void this.syncNow();
      }
    });
    setInterval(() => {
      if (document.visibilityState === 'visible') void this.syncNow();
    }, POLL_MS);
  }

  /** La nube avisa de cada cambio en las filas propias (las políticas RLS filtran el resto). */
  private listen(client: SupabaseClient, userId: string) {
    this.unlisten();
    this.channel = client
      .channel(`records:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: `user_id=eq.${userId}` }, () => {
        clearTimeout(this.pullTimer);
        this.pullTimer = setTimeout(() => void this.syncNow(), PULL_DELAY_MS);
      })
      .subscribe((status) => {
        // Tras conectarse o reconectarse se trae lo que pudo llegar mientras tanto.
        if (status === 'SUBSCRIBED') void this.syncNow();
      });
  }

  private unlisten() {
    if (this.channel) void this.client?.removeChannel(this.channel);
    this.channel = null;
  }

  private async onSession(user: { id: string; email?: string } | null) {
    if (user?.id === this.userId) return;
    this.userId = user?.id ?? null;
    this.engine = null;
    this.unlisten();
    if (!user) {
      this.set({ email: null, needsLink: false, otherOwner: false, status: 'off', error: null });
      return;
    }
    const owner = await this.repo.getMeta<string>(OWNER_KEY);
    this.set({ email: user.email ?? '', needsLink: !owner, otherOwner: Boolean(owner) && owner !== user.id });
    if (owner === user.id) this.attach();
  }

  private attach() {
    const client = this.client!;
    const userId = this.userId!;
    void import('../data/sync/supabaseRemote').then(({ SupabaseRemote }) => {
      // La sesión pudo cambiar mientras cargaba el módulo.
      if (this.userId !== userId) return;
      this.engine = new SyncEngine(this.repo, new SupabaseRemote(client, userId));
      void this.syncNow();
      this.listen(client, userId);
    });
  }

  /** Conexión voluntaria: copia de seguridad local primero, y después se combinan los datos. */
  async link() {
    if (!this.userId) return;
    await this.store.backupBeforeLinking();
    await this.repo.setMeta(OWNER_KEY, this.userId);
    this.set({ needsLink: false });
    this.attach();
  }

  async syncNow() {
    if (!this.engine) return;
    if (!navigator.onLine) {
      this.set({ status: 'offline' });
      return;
    }
    this.set({ status: 'syncing', error: null });
    try {
      const { applied } = await this.engine.run();
      if (applied) await this.store.reload();
      this.set({ status: 'synced', lastSyncAt: new Date().toISOString() });
    } catch (error) {
      // Los datos siguen en el dispositivo y se reintenta en la siguiente pasada.
      this.set({ status: 'error', error: error instanceof Error ? error.message : 'Error desconocido' });
    }
  }

  async signIn(email: string, password: string) {
    const { error } = await this.client!.auth.signInWithPassword({ email, password });
    if (error) throw new Error('No se pudo iniciar sesión. Revisa el correo y la contraseña.');
  }

  /** La sesión se cierra; los datos del dispositivo se borran solo si se pide. */
  async signOut({ wipe }: { wipe: boolean }) {
    const { error } = await this.client!.auth.signOut();
    if (error) throw new Error('No se pudo cerrar la sesión. Inténtalo de nuevo.');
    if (wipe) await this.store.wipeDevice();
  }

  async sendRecovery(email: string) {
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}`;
    const { error } = await this.client!.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw new Error('No se pudo enviar el correo. Inténtalo más tarde.');
  }

  private async openRecovery(link: RecoveryLink) {
    if (link.status === 'expired') {
      this.set({ recovery: 'expired' });
      return;
    }
    const { error } = await this.client!.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
    this.set({ recovery: error ? 'expired' : 'ready' });
  }

  async setNewPassword(password: string) {
    const { error } = await this.client!.auth.updateUser({ password });
    if (error) throw new Error('No se pudo cambiar la contraseña. Usa una más larga o pide otro enlace.');
    this.set({ recovery: null });
  }

  /** Desvincula un dispositivo con datos de otra cuenta, sin tocar sus datos. */
  async forgetLink() {
    await this.repo.setMeta(OWNER_KEY, undefined);
    await this.repo.setMeta(SYNC_STATE_KEY, undefined);
    this.set({ otherOwner: false, needsLink: true });
  }
}

export const cloud = new Cloud();

export function useCloud() {
  return useSyncExternalStore(cloud.subscribe, cloud.getState);
}
