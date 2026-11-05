import { useEffect, useState, type FormEvent } from 'react';
import { icloudUrl } from '../../supabase/functions/_shared/icloud.ts';
import { useApple } from '../app/apple';
import { cloud, useCloud } from '../app/cloud';
import { getStore, useData } from '../app/store';
import { useUI } from '../app/ui';
import { Button, Note, Section } from '../design';

const sub = 'mt-1 text-[13px] text-muted';

/** LIA OS → Apple: enlace privado de suscripción. */
function FeedLink() {
  const { confirm, attempt, toast } = useUI();
  const { needsLink, otherOwner } = useCloud();
  const [createdAt, setCreatedAt] = useState<string | null | undefined>(undefined);
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    cloud.calendarFeedCreatedAt().then(
      (at) => alive && setCreatedAt(at),
      () => alive && setCreatedAt(null),
    );
    return () => {
      alive = false;
    };
  }, []);

  const create = async () => {
    if (createdAt && !(await confirm('Se creará un enlace nuevo y el anterior dejará de funcionar. Tendrás que suscribirte otra vez en el iPhone.', 'Crear enlace nuevo'))) return;
    await attempt(async () => {
      setLink(await cloud.createCalendarFeed());
      setCreatedAt(new Date().toISOString());
    });
  };

  const remove = async () => {
    if (!(await confirm('El calendario de LIA OS dejará de actualizarse en Apple Calendar. Luego puedes borrar la suscripción en el iPhone.', 'Desactivar'))) return;
    await attempt(async () => {
      await cloud.deleteCalendarFeed();
      setCreatedAt(null);
      setLink(null);
    }, 'Enlace desactivado');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link ?? '');
      toast('Enlace copiado');
    } catch {
      toast('No se pudo copiar. Mantén pulsado el enlace para copiarlo.');
    }
  };

  return (
    <div className="border-b border-line py-4">
      <p className="font-medium">Ver LIA OS en Apple Calendar</p>
      <p className={sub}>Tus eventos, tareas pendientes con fecha, castings y publicaciones aparecen en el calendario del iPhone y se actualizan solos.</p>
      {(needsLink || otherOwner) && <Note>Conecta este dispositivo en Sincronización: Apple lee tus datos desde la nube.</Note>}
      {link ? (
        <div className="mt-3 grid gap-2">
          <input readOnly aria-label="Enlace privado del calendario" value={link} className="control font-mono text-[12px]" onFocus={(e) => e.target.select()} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={copy}>
              Copiar enlace
            </Button>
            <a className="inline-flex items-center rounded-md border border-line-strong px-3 py-1.5 text-[13px] font-medium text-wine hover:bg-wine-soft" href={link.replace(/^https?:/, 'webcal:')}>
              Abrir en Calendario
            </a>
          </div>
          <Note>Guárdalo ahora: por seguridad no se vuelve a mostrar. Quien lo tenga puede ver tu calendario; si se filtra, crea uno nuevo.</Note>
          <ol className="list-decimal pl-5 text-[13px] text-muted">
            <li>En el iPhone pulsa «Abrir en Calendario», o ve a Ajustes → Calendario → Cuentas → Añadir cuenta → Otra → Añadir calendario suscrito y pega el enlace.</li>
            <li>En «Actualización automática» elige cada 15 minutos.</li>
          </ol>
        </div>
      ) : createdAt === undefined ? (
        <p className={sub}>Consultando…</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {createdAt && <span className="text-[13px]">Enlace activo desde el {new Date(createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}.</span>}
          <Button size="sm" variant={createdAt ? 'quiet' : 'primary'} onClick={create}>
            {createdAt ? 'Crear enlace nuevo' : 'Crear enlace privado'}
          </Button>
          {createdAt && (
            <Button size="sm" variant="danger" onClick={remove}>
              Desactivar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Apple → LIA OS: calendario público de iCloud, solo lectura. */
function AppleSource() {
  const { settings } = useData();
  const { attempt, confirm, toast } = useUI();
  const state = useApple();
  const [draft, setDraft] = useState('');

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const url = icloudUrl(draft);
    if (!url) {
      toast('Pega el enlace que da el iPhone al compartir un calendario público. Empieza por webcal:// y contiene icloud.com.');
      return;
    }
    if (await attempt(() => getStore().updateSettings({ appleCalendarUrl: url.toString() }), 'Apple Calendar conectado')) setDraft('');
  };

  const remove = async () => {
    if (await confirm('Los eventos de Apple dejarán de verse en LIA OS. En Apple no cambia nada.', 'Quitar')) await attempt(() => getStore().updateSettings({ appleCalendarUrl: '' }), 'Apple Calendar quitado');
  };

  return (
    <div className="py-4">
      <p className="font-medium">Ver Apple Calendar en LIA OS</p>
      <p className={sub}>Tus eventos de Apple aparecen en el Calendario de LIA OS. Se ven aquí, pero se editan en Apple.</p>
      {settings.appleCalendarUrl ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[13px]" role="status">
            {state.status === 'loading' ? 'Leyendo…' : state.status === 'error' ? state.error : `Conectado · ${state.events.length} eventos en los próximos meses`}
          </span>
          <Button size="sm" variant="danger" onClick={remove}>
            Quitar
          </Button>
        </div>
      ) : (
        <>
          <ol className="mt-2 list-decimal pl-5 text-[13px] text-muted">
            <li>En el iPhone abre Calendario y pulsa «Calendarios».</li>
            <li>Pulsa ⓘ junto al calendario que quieres ver aquí.</li>
            <li>Activa «Calendario público», pulsa «Compartir enlace» y cópialo.</li>
          </ol>
          <form onSubmit={save} className="mt-3 flex gap-2">
            <input aria-label="Enlace público de Apple Calendar" placeholder="webcal://p…-caldav.icloud.com/published/…" value={draft} onChange={(e) => setDraft(e.target.value)} className="control" />
            <Button type="submit" size="sm">
              Conectar
            </Button>
          </form>
          <Note>Ese enlace es público: cualquiera que lo tenga puede ver ese calendario. Puedes desactivarlo en el iPhone cuando quieras.</Note>
        </>
      )}
    </div>
  );
}

export function AppleSection() {
  const { configured, email } = useCloud();
  if (!configured) return null;
  return (
    <Section title="Apple Calendar" className="mt-8">
      {email ? (
        <>
          <FeedLink />
          <AppleSource />
        </>
      ) : (
        <Note>Inicia sesión en Sincronización para conectar Apple Calendar.</Note>
      )}
    </Section>
  );
}
