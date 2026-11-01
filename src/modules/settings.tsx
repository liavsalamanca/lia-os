import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { getStore, useData } from '../app/store';
import { useUI } from '../app/ui';
import { readLegacy } from '../data/legacy';
import type { BackupEntry } from '../data/repository';
import { Button, Note, PageHeader, Section } from '../design';
import { todayISO } from '../domain/dates';
import { safeUrl } from '../domain/url';
import { download } from './download';

function Setting({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4 last:border-b-0">
      <div className="min-w-48 flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-[13px] text-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function InlineField({ label, value, type = 'text', onSave, step }: { label: string; value: string | number; type?: string; step?: string; onSave: (value: string) => Promise<unknown> }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void onSave(draft);
  };
  return (
    <form onSubmit={submit} className="flex w-full max-w-72 gap-2">
      <input aria-label={label} type={type} step={step} min={type === 'number' ? 0 : undefined} value={draft} onChange={(e) => setDraft(e.target.value)} className="control" />
      <Button type="submit" size="sm">
        Guardar
      </Button>
    </form>
  );
}

function LegacyCopy() {
  const { confirm, attempt, toast } = useUI();
  const [state, setState] = useState(() => readLegacy());
  const store = getStore();
  if (state.status === 'none') return null;
  const remove = async () => {
    if (!(await confirm('Se borrará la copia de la versión anterior guardada en este navegador. Tus datos actuales no cambian.', 'Continuar'))) return;
    if (!(await confirm('Confirmación final: esta copia no se podrá recuperar.', 'Borrar copia'))) return;
    store.deleteLegacy();
    setState({ status: 'none' });
    toast('Copia anterior eliminada');
  };
  return (
    <Section title="Versión anterior" className="mt-8">
      {state.status === 'corrupt' && <Note>La copia anterior está dañada y no se pudo leer automáticamente. Sigue intacta: descárgala antes de hacer cualquier otra cosa.</Note>}
      <div className="flex flex-wrap gap-2 py-3">
        <Button onClick={() => download(`lia-os-v1-${todayISO()}.json`, store.legacyRaw() ?? '')}>Descargar copia original</Button>
        {state.status === 'ok' && (
          <Button
            onClick={() =>
              attempt(async () => {
                const added = await store.reimportLegacy();
                toast(`Registros añadidos: ${added ?? 0}`);
              })
            }
          >
            Reimportar lo que falte
          </Button>
        )}
        <Button variant="danger" onClick={remove}>
          Borrar copia
        </Button>
      </div>
    </Section>
  );
}

export default function SettingsPage() {
  const { settings } = useData();
  const { confirm, attempt, toast } = useUI();
  const store = getStore();
  const file = useRef<HTMLInputElement>(null);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const refreshBackups = () => void store.listBackups().then(setBackups);
  useEffect(refreshBackups, [store]);

  const importFile = async (selected?: File) => {
    if (!selected) return;
    if (!(await confirm('Este archivo reemplazará los registros actuales. Antes se guardará una copia automática.', 'Importar'))) return;
    await attempt(async () => {
      const { skipped } = await store.importBackup(await selected.text());
      toast(skipped ? `Respaldo restaurado. Se omitieron ${skipped} registros no válidos.` : 'Respaldo restaurado');
    });
    refreshBackups();
  };

  const restore = async (entry: BackupEntry) => {
    if (!(await confirm('Se reemplazarán los registros actuales por esta copia. Antes se guardará otra copia automática.', 'Restaurar'))) return;
    await attempt(() => store.restoreBackup(entry), 'Copia restaurada');
    refreshBackups();
  };

  const deleteAll = async () => {
    if (!(await confirm('¿Seguro que deseas borrar TODOS tus datos? Primero exporta un respaldo.', 'Continuar'))) return;
    if (!(await confirm('Confirmación final: se eliminarán tus registros y las copias automáticas. La copia de la versión anterior, si existe, se borra aparte.', 'Eliminar todo'))) return;
    await attempt(() => store.deleteAll(), 'Datos eliminados');
    refreshBackups();
  };

  const positive = (value: string, key: 'fx' | 'shippingRate', min: number, message: string) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < min) {
      toast(message);
      return Promise.resolve();
    }
    return attempt(() => store.updateSettings({ [key]: n }), 'Guardado');
  };

  return (
    <>
      <PageHeader eyebrow="Customize your life" title="Configuración" subtitle="Tu sistema, a tu estilo." />
      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="Personalización">
          <Setting title="Tu nombre" hint="Así te saluda LIA OS.">
            <InlineField label="Tu nombre" value={settings.name} onSave={(name) => attempt(() => store.updateSettings({ name: name.trim().slice(0, 30) || 'Lia' }), 'Nombre actualizado')} />
          </Setting>
          <Setting title="Apariencia" hint="Modo claro u oscuro.">
            <Button size="sm" onClick={() => attempt(() => store.updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' }))}>
              {settings.theme === 'dark' ? 'Usar modo claro' : 'Usar modo oscuro'}
            </Button>
          </Setting>
          <Setting title="Portafolio de modelo" hint="La URL de tu página profesional.">
            <InlineField
              label="URL del portafolio"
              type="url"
              value={settings.portfolio}
              onSave={(value) => {
                const portfolio = value.trim();
                if (portfolio && !safeUrl(portfolio)) {
                  toast('La URL debe empezar por https:// o http://');
                  return Promise.resolve();
                }
                return attempt(() => store.updateSettings({ portfolio }), 'Enlace actualizado');
              }}
            />
          </Setting>
          <Setting title="Tasa USD → COP" hint="Predeterminada para pedidos nuevos; actualízala manualmente.">
            <InlineField label="Tasa USD a COP" type="number" step="any" value={settings.fx} onSave={(v) => positive(v, 'fx', 1, 'La tasa debe ser mayor que 0.')} />
          </Setting>
          <Setting title="Casillero por libra (USD)" hint="Predeterminado para pedidos nuevos.">
            <InlineField label="Casillero por libra" type="number" step="any" value={settings.shippingRate} onSave={(v) => positive(v, 'shippingRate', 0, 'La tarifa no puede ser negativa.')} />
          </Setting>
        </Section>

        <div>
          <Section title="Datos y respaldo">
            <Setting title="Exportar tus datos" hint="Descarga un archivo JSON con todos tus registros.">
              <Button size="sm" onClick={() => { download(`lia-os-respaldo-${todayISO(settings.timezone)}.json`, store.exportBackup()); toast('Respaldo descargado. Guárdalo en un lugar privado.'); }}>
                Exportar respaldo
              </Button>
            </Setting>
            <Setting title="Importar un respaldo" hint="Restaura un JSON exportado de LIA OS, de cualquier versión.">
              <Button size="sm" onClick={() => file.current?.click()}>
                Importar archivo
              </Button>
              <input
                ref={file}
                data-testid="import-file"
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  void importFile(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </Setting>
            <Setting title="Empezar con plantillas" hint="Añade proyectos y hábitos de ejemplo editables.">
              <Button
                size="sm"
                onClick={async () => {
                  if (await confirm('¿Añadir proyectos y hábitos de ejemplo? No eliminará tus registros.', 'Añadir')) await attempt(() => store.addTemplates(), 'Plantillas añadidas');
                }}
              >
                Añadir plantillas
              </Button>
            </Setting>
          </Section>

          {backups.length > 0 && (
            <Section title="Copias automáticas" className="mt-8">
              <ul>
                {backups.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0">
                    <span className="text-[13px]">
                      {b.reason} · {new Date(b.createdAt).toLocaleString('es-CO', { timeZone: settings.timezone })}
                    </span>
                    <Button size="sm" onClick={() => restore(b)}>
                      Restaurar
                    </Button>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <LegacyCopy />

          <Note>
            Tus datos se guardan únicamente en este navegador. No hay cuenta, sincronización ni cifrado de extremo a extremo. Borrar los datos del sitio o cambiar de dispositivo puede hacer que no estén disponibles: exporta respaldos con frecuencia.
          </Note>
          <Button variant="danger" onClick={deleteAll}>
            Eliminar todos los datos
          </Button>
        </div>
      </div>
    </>
  );
}
