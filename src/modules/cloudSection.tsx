import { useState, type FormEvent } from 'react';
import { cloud, useCloud, type CloudState } from '../app/cloud';
import { useUI } from '../app/ui';
import { Button, Note, Section } from '../design';

const STATUS: Record<CloudState['status'], string> = {
  off: 'Sin sincronizar',
  syncing: 'Sincronizando…',
  synced: 'Sincronizado',
  offline: 'Sin conexión: los cambios se enviarán al volver',
  error: 'No se pudo sincronizar. Tus datos siguen en este dispositivo y se reintentará.',
};

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-muted">{label}</span>
      <input required className="control" {...props} />
    </label>
  );
}

function SignInForm() {
  const { attempt } = useUI();
  const [mode, setMode] = useState<'login' | 'request' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      await attempt(() => cloud.signIn(email.trim(), password));
    } else if (mode === 'request') {
      if (await attempt(() => cloud.sendRecovery(email.trim()), 'Te enviamos un código al correo')) setMode('reset');
    } else if (await attempt(() => cloud.resetPassword(email.trim(), code.trim(), password), 'Contraseña actualizada')) {
      setMode('login');
    }
    setPassword('');
  };

  return (
    <form onSubmit={submit} className="grid gap-3 py-3">
      <Input label="Correo" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      {mode === 'reset' && <Input label="Código del correo" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />}
      {mode !== 'request' && (
        <Input label={mode === 'reset' ? 'Contraseña nueva' : 'Contraseña'} type="password" minLength={mode === 'reset' ? 8 : undefined} autoComplete={mode === 'reset' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary">
          {{ login: 'Iniciar sesión', request: 'Enviar código', reset: 'Cambiar contraseña' }[mode]}
        </Button>
        <button type="button" className="text-[13px] text-wine hover:underline" onClick={() => setMode(mode === 'login' ? 'request' : 'login')}>
          {mode === 'login' ? 'Olvidé mi contraseña' : 'Volver'}
        </button>
      </div>
    </form>
  );
}

export function CloudSection() {
  const state = useCloud();
  const { confirm, attempt } = useUI();

  if (!state.configured) {
    return (
      <Section title="Sincronización" className="mt-8">
        <Note>La sincronización entre dispositivos aún no está configurada. Tus datos se guardan solo en este navegador.</Note>
      </Section>
    );
  }

  const signOut = async () => {
    const wipe = await confirm('Se cerrará la sesión. Tus datos siguen en la nube. ¿Quieres borrarlos también de este dispositivo? Hazlo si no es tuyo.', 'Cerrar y borrar de aquí');
    if (wipe) await attempt(() => cloud.signOut({ wipe: true }), 'Sesión cerrada y dispositivo vacío');
  };

  return (
    <Section title="Sincronización" className="mt-8">
      {!state.email && (
        <>
          <p className="mt-2 text-[13px] text-muted">Inicia sesión para usar tus datos en todos tus dispositivos.</p>
          <SignInForm />
        </>
      )}
      {state.email && (
        <div className="py-3">
          <p className="text-sm">
            Sesión: <strong>{state.email}</strong>
          </p>
          {state.otherOwner ? (
            <>
              <Note>Este dispositivo tiene datos de otra cuenta. Para no mezclarlos, la sincronización está detenida. Exporta un respaldo antes de continuar.</Note>
              <Button
                onClick={async () => {
                  if (await confirm('Los datos de este dispositivo se combinarán con los de esta cuenta y quedarán en su nube.', 'Combinar')) await attempt(() => cloud.forgetLink());
                }}
              >
                Combinar con esta cuenta
              </Button>
            </>
          ) : state.needsLink ? (
            <>
              <p className="my-2 text-[13px] text-muted">Tus datos de este dispositivo se combinarán con los de tu cuenta. Antes se guardará una copia automática aquí. No se borra nada de este dispositivo.</p>
              <Button variant="primary" onClick={() => attempt(() => cloud.link(), 'Dispositivo conectado')}>
                Conectar este dispositivo
              </Button>
            </>
          ) : (
            <p className="mt-1 text-[13px] text-muted" role="status">
              {STATUS[state.status]}
              {state.status === 'synced' && state.lastSyncAt ? ` · ${new Date(state.lastSyncAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : ''}
            </p>
          )}
          {state.error && <p className="mt-1 text-[13px] text-danger">{state.error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {!state.needsLink && !state.otherOwner && (
              <Button size="sm" onClick={() => cloud.syncNow()}>
                Sincronizar ahora
              </Button>
            )}
            <Button size="sm" onClick={() => attempt(() => cloud.signOut({ wipe: false }), 'Sesión cerrada')}>
              Cerrar sesión
            </Button>
            <Button size="sm" variant="danger" onClick={signOut}>
              Cerrar y borrar de aquí
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}
