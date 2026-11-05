import { useEffect, useState, type FormEvent } from 'react';
import { calendarSource, externalCalendarUrl } from '../../supabase/functions/_shared/icloud.ts';
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

const steps = 'mt-2 list-decimal pl-5 text-[13px] text-muted';

/** Apple o Google → LIA OS: solo lectura. */
function ExternalSource() {
  const { settings } = useData();
  const { attempt, confirm, toast } = useUI();
  const state = useApple();
  const [draft, setDraft] = useState('');

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const url = externalCalendarUrl(draft);
    if (!url) {
      toast('Pega la dirección secreta en formato iCal de Google Calendar, o el enlace de un calendario público de iCloud.');
      return;
    }
    if (await attempt(() => getStore().updateSettings({ appleCalendarUrl: url.toString() }), `${calendarSource(url.toString())} conectado`)) setDraft('');
  };

  const remove = async () => {
    const source = calendarSource(settings.appleCalendarUrl);
    if (await confirm(`Los eventos de ${source} dejarán de verse en LIA OS. En ${source} no cambia nada.`, 'Quitar')) await attempt(() => getStore().updateSettings({ appleCalendarUrl: '' }), `${source} quitado`);
  };

  return (
    <div className="py-4">
      <p className="font-medium">Ver Google o Apple Calendar en LIA OS</p>
      <p className={sub}>Tus eventos aparecen en el Calendario de LIA OS. Se ven aquí, pero se editan en su app.</p>
      {settings.appleCalendarUrl ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[13px]" role="status">
            {state.status === 'loading' ? 'Leyendo…' : state.status === 'error' ? state.error : `${calendarSource(settings.appleCalendarUrl)} conectado · ${state.events.length} eventos en los próximos meses`}
          </span>
          <Button size="sm" variant="danger" onClick={remove}>
            Quitar
          </Button>
        </div>
      ) : (
        <>
          <p className="mt-3 text-[13px] font-medium">Google Calendar (desde un computador)</p>
          <ol className={steps}>
            <li>Abre calendar.google.com, pulsa ⚙ y luego «Configuración».</li>
            <li>A la izquierda, en «Configuración de mis calendarios», elige tu calendario.</li>
            <li>En «Integrar el calendario», copia la «Dirección secreta en formato iCal».</li>
          </ol>
          <p className="mt-3 text-[13px] font-medium">Apple Calendar (en el iPhone)</p>
          <ol className={steps}>
            <li>Abre Calendario, pulsa «Calendarios» y luego ⓘ junto al calendario.</li>
            <li>Activa «Calendario público», pulsa «Compartir enlace» y cópialo.</li>
          </ol>
          <form onSubmit={save} className="mt-3 flex gap-2">
            <input aria-label="Dirección del calendario" placeholder="https://calendar.google.com/calendar/ical/…" value={draft} onChange={(e) => setDraft(e.target.value)} className="control" />
            <Button type="submit" size="sm">
              Conectar
            </Button>
          </form>
          <Note>Quien tenga la dirección puede ver ese calendario. La de Google es secreta: no la compartas, y si se filtra pulsa «Restablecer» en Google. La de Apple es pública: desactívala en el iPhone cuando quieras.</Note>
        </>
      )}
    </div>
  );
}

export function AppleSection() {
  const { configured, email } = useCloud();
  if (!configured) return null;
  return (
    <Section title="Apple y Google Calendar" className="mt-8">
      {email ? (
        <>
          <FeedLink />
          <ExternalSource />
        </>
      ) : (
        <Note>Inicia sesión en Sincronización para conectar tus calendarios.</Note>
      )}
    </Section>
  );
}
