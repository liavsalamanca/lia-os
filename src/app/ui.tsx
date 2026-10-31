import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Collection } from '../data/schema';
import { Button, Dialog } from '../design';
import { focusTimer } from '../modules/focusTimer';
import { RecordForm } from '../modules/RecordForm';

type FormRequest = { collection: Collection; id?: string; overrides?: Record<string, unknown> };
type ConfirmRequest = { message: string; confirmLabel: string; resolve: (ok: boolean) => void };
type Toast = { message: string; error: boolean };

type UI = {
  openForm: (collection: Collection, id?: string, overrides?: Record<string, unknown>) => void;
  confirm: (message: string, confirmLabel?: string) => Promise<boolean>;
  toast: (message: string) => void;
  /** Ejecuta una escritura y avisa si falla, para que ningún error pase en silencio. */
  attempt: (action: () => Promise<unknown>, success?: string) => Promise<boolean>;
};

const UIContext = createContext<UI | null>(null);

export function useUI() {
  const ui = useContext(UIContext);
  if (!ui) throw new Error('useUI fuera de UIProvider');
  return ui;
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [form, setForm] = useState<FormRequest | null>(null);
  const [confirming, setConfirming] = useState<ConfirmRequest | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback((message: string, error = false) => {
    clearTimeout(timeout.current);
    setToast({ message, error });
    timeout.current = setTimeout(() => setToast(null), error ? 7000 : 3500);
  }, []);

  useEffect(() => focusTimer.onFinish(() => show('Sesión terminada. Bien hecho.')), [show]);

  const ui = useMemo<UI>(
    () => ({
      openForm: (collection, id, overrides) => setForm({ collection, id, overrides }),
      confirm: (message, confirmLabel = 'Eliminar') => new Promise((resolve) => setConfirming({ message, confirmLabel, resolve })),
      toast: (message) => show(message),
      attempt: async (action, success) => {
        try {
          await action();
          if (success) show(success);
          return true;
        } catch (error) {
          show(error instanceof Error && error.message ? error.message : 'No se pudo guardar. Inténtalo de nuevo.', true);
          return false;
        }
      },
    }),
    [show],
  );

  const answer = (ok: boolean) => {
    confirming?.resolve(ok);
    setConfirming(null);
  };

  return (
    <UIContext.Provider value={ui}>
      {children}
      {form && <RecordForm key={`${form.collection}-${form.id ?? 'new'}`} {...form} onClose={() => setForm(null)} />}
      {confirming && (
        <Dialog title="Confirmar" size="sm" onClose={() => answer(false)}>
          <p className="px-5 py-4">{confirming.message}</p>
          <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
            <Button onClick={() => answer(false)}>Cancelar</Button>
            <Button variant="danger" onClick={() => answer(true)}>
              {confirming.confirmLabel}
            </Button>
          </div>
        </Dialog>
      )}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-center lg:bottom-6">
        {toast && <p className={`animate-rise rounded-md px-4 py-2.5 text-sm shadow-lg ${toast.error ? 'bg-danger text-canvas' : 'bg-wine text-wine-ink'}`}>{toast.message}</p>}
      </div>
    </UIContext.Provider>
  );
}
