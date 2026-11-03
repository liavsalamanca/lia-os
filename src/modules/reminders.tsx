import { BellRing } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getStore } from '../app/store';
import { useUI } from '../app/ui';
import { Button } from '../design';
import { dueReminders, nowTime, reminderKey } from '../domain/tasks';

const NOTIFIED_KEY = 'lia-os-reminded';
const CHECK_MS = 30_000;

/** Avisos ya mostrados en este dispositivo. Si el almacenamiento falla, se avisa de nuevo: mejor dos veces que ninguna. */
function readNotified(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '[]');
    return new Set(Array.isArray(raw) ? raw.filter((k): k is string => typeof k === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveNotified(keys: Set<string>) {
  try {
    // Solo se guardan los últimos, para que la lista no crezca sin límite.
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...keys].slice(-200)));
  } catch {
    // Sin almacenamiento el aviso puede repetirse; no es grave.
  }
}

const canNotify = () => typeof Notification !== 'undefined' && Notification.permission === 'granted';

/** Revisa los recordatorios mientras la app está abierta. Sin servidor de avisos, con la app cerrada no suenan. */
export function ReminderWatcher() {
  const { toast } = useUI();
  useEffect(() => {
    const check = () => {
      const store = getStore();
      const { tasks, settings } = store.getSnapshot();
      const notified = readNotified();
      const due = dueReminders(tasks, store.today(), nowTime(settings.timezone), notified);
      if (!due.length) return;
      for (const task of due) {
        notified.add(reminderKey(task));
        if (canNotify() && document.visibilityState !== 'visible') new Notification('LIA OS', { body: task.title, tag: reminderKey(task) });
        else toast(`Recordatorio: ${task.title}`);
      }
      saveNotified(notified);
    };
    check();
    const timer = setInterval(check, CHECK_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [toast]);
  return null;
}

/** Pide permiso para avisos del navegador solo cuando hay recordatorios y la persona lo pulsa. */
export function EnableNotifications() {
  const [permission, setPermission] = useState(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));
  if (permission !== 'default') return null;
  return (
    <Button size="sm" onClick={async () => setPermission(await Notification.requestPermission())}>
      <BellRing size={14} aria-hidden /> Avisarme también fuera de la pestaña
    </Button>
  );
}
