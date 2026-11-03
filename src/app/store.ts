import { useSyncExternalStore } from 'react';
import { parseBackup, serializeBackup } from '../data/backup';
import { LEGACY_KEY, reimportLegacy } from '../data/legacy';
import type { BackupEntry, Repository } from '../data/repository';
import { emptySnapshot, type Collection, type RecordOf, type Settings, type Snapshot } from '../data/schema';
import { timeOf } from '../data/sync/plan';
import { todayISO } from '../domain/dates';
import { toggleHabitDate } from '../domain/habits';
import { completionPatch, DONE } from '../domain/tasks';
import { projectTemplates, habitTemplates } from '../domain/templates';

const CHANNEL = 'lia-os-data';

export class Store {
  private listeners = new Set<() => void>();
  private channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);
  /** Avisa a la sincronización de que hay algo que subir. */
  onLocalChange: (() => void) | null = null;

  constructor(
    private repo: Repository,
    private snapshot: Snapshot,
  ) {
    if (this.channel) this.channel.onmessage = () => void this.reload();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  private set(next: Snapshot) {
    this.snapshot = next;
    this.listeners.forEach((l) => l());
  }

  private changed(next: Snapshot) {
    this.set(next);
    this.channel?.postMessage('changed');
    this.onLocalChange?.();
  }

  /** Actualiza la interfaz al instante y la revierte si no se pudo guardar. */
  private async commit(next: Snapshot, persist: () => Promise<void>) {
    const previous = this.snapshot;
    this.set(next);
    try {
      await persist();
    } catch (error) {
      this.set(previous);
      throw error;
    }
    this.channel?.postMessage('changed');
    this.onLocalChange?.();
  }

  async reload() {
    this.set(await this.repo.load());
  }

  today() {
    return todayISO(this.snapshot.settings.timezone);
  }

  async saveRecord<C extends Collection>(collection: C, values: Record<string, unknown>, id?: string, { instant = false } = {}) {
    const list = this.snapshot[collection] as RecordOf<C>[];
    const existing = id ? list.find((r) => r.id === id) : undefined;
    // Con un reloj atrasado, la edición debe seguir siendo posterior a lo que edita.
    const now = new Date(Math.max(Date.now(), existing ? timeOf(existing.updatedAt) + 1 : 0)).toISOString();
    const record = (existing
      ? { ...existing, ...values, updatedAt: now }
      : { ...values, id: crypto.randomUUID(), createdAt: now, updatedAt: now }) as RecordOf<C>;
    const next = existing ? list.map((r) => (r.id === existing.id ? record : r)) : [record, ...list];
    const updated = { ...this.snapshot, [collection]: next };
    if (instant) {
      await this.commit(updated, () => this.repo.putRecord(collection, record));
    } else {
      await this.repo.putRecord(collection, record);
      this.changed(updated);
    }
    return record;
  }

  async deleteRecord(collection: Collection, id: string) {
    await this.repo.deleteRecord(collection, id);
    const list = (this.snapshot[collection] as { id: string }[]).filter((r) => r.id !== id);
    const next = { ...this.snapshot, [collection]: list } as Snapshot;
    if (collection === 'habits' && id in next.habitLogs) {
      const { [id]: _removed, ...habitLogs } = next.habitLogs;
      await this.repo.putHabitLogs(habitLogs);
      next.habitLogs = habitLogs;
    }
    this.changed(next);
  }

  /** Devuelve la próxima fecha si la tarea es recurrente y vuelve a quedar pendiente. */
  async setTaskDone(id: string, done: boolean): Promise<string | null> {
    const task = this.snapshot.tasks.find((t) => t.id === id);
    if (!task) return null;
    const patch = done ? completionPatch(task, this.today()) : { status: 'Pendiente' };
    await this.saveRecord('tasks', patch, id, { instant: true });
    return done && patch.status !== DONE ? (patch.due ?? null) : null;
  }

  async toggleSubtask(taskId: string, subtaskId: string) {
    const task = this.snapshot.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const subtasks = task.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s));
    await this.saveRecord('tasks', { subtasks }, taskId, { instant: true });
  }

  async toggleHabit(id: string) {
    const habitLogs = toggleHabitDate(this.snapshot.habitLogs, id, this.today());
    await this.commit({ ...this.snapshot, habitLogs }, () => this.repo.putHabitLogs(habitLogs));
  }

  async updateSettings(patch: Partial<Settings>) {
    const settings = { ...this.snapshot.settings, ...patch };
    await this.commit({ ...this.snapshot, settings }, () => this.repo.putSettings(settings));
  }

  exportBackup() {
    return serializeBackup(this.snapshot);
  }

  /** Valida antes de tocar nada y guarda una copia automática de lo actual. */
  async importBackup(text: string) {
    const { snapshot, skipped } = parseBackup(text);
    await this.repo.addBackup('Antes de importar', this.snapshot);
    await this.repo.replaceAll(snapshot);
    await this.reloadChanged();
    return { skipped };
  }

  listBackups() {
    return this.repo.listBackups();
  }

  async restoreBackup(entry: BackupEntry) {
    await this.repo.addBackup('Antes de restaurar', this.snapshot);
    await this.repo.replaceAll(entry.snapshot);
    await this.reloadChanged();
  }

  private async reloadChanged() {
    this.changed(await this.repo.load());
  }

  /** Con la sincronización activa el borrado se propaga; sin ella afecta solo a este dispositivo. */
  async deleteAll({ everywhere }: { everywhere: boolean }) {
    if (everywhere) {
      await this.repo.replaceAll(emptySnapshot());
      await this.repo.clearBackups();
    } else {
      await this.repo.wipeDevice();
    }
    await this.reloadChanged();
  }

  async wipeDevice() {
    await this.repo.wipeDevice();
    await this.reload();
    this.channel?.postMessage('changed');
  }

  backupBeforeLinking() {
    return this.repo.addBackup('Antes de conectar la nube', this.snapshot);
  }

  async addTemplates() {
    for (const [name, area] of projectTemplates) {
      if (!this.snapshot.projects.some((p) => p.name === name)) {
        await this.saveRecord('projects', { name, area, status: 'Planeado', progress: 0, deadline: '', notes: 'Plantilla editable para organizar mis siguientes pasos.' });
      }
    }
    for (const name of habitTemplates) {
      if (!this.snapshot.habits.some((h) => h.name === name)) {
        await this.saveRecord('habits', { name, area: 'Bienestar', notes: 'Personaliza este hábito.' });
      }
    }
  }

  async reimportLegacy() {
    const added = await reimportLegacy(this.repo);
    await this.reload();
    this.channel?.postMessage('changed');
    return added;
  }

  legacyRaw() {
    return localStorage.getItem(LEGACY_KEY);
  }

  /** Único punto que borra la copia v1, y solo tras la doble confirmación en Configuración. */
  deleteLegacy() {
    localStorage.removeItem(LEGACY_KEY);
  }
}

let store: Store | null = null;

export function setStore(next: Store) {
  store = next;
}

export function getStore(): Store {
  if (!store) throw new Error('Store no inicializado');
  return store;
}

export function useData(): Snapshot {
  const s = getStore();
  return useSyncExternalStore(s.subscribe, s.getSnapshot);
}
