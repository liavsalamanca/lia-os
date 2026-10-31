import { useSyncExternalStore } from 'react';
import { Button, PageHeader } from '../design';
import { focusTimer } from './focusTimer';

const MODES = [
  { minutes: 25, label: '25 min · Focus' },
  { minutes: 50, label: '50 min · Deep work' },
  { minutes: 5, label: '5 min · Pausa' },
];

const pad = (n: number) => String(n).padStart(2, '0');

export default function Focus() {
  const { mode, remaining, running } = useSyncExternalStore(focusTimer.subscribe, focusTimer.getState);
  return (
    <>
      <PageHeader eyebrow="Deep work" title="Focus mode" subtitle="Una sola cosa a la vez. El resto puede esperar." />
      <div className="mx-auto max-w-xl py-6 text-center">
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Duración de la sesión">
          {MODES.map((m) => (
            <Button key={m.minutes} size="sm" variant={mode === m.minutes ? 'primary' : 'quiet'} aria-pressed={mode === m.minutes} onClick={() => focusTimer.reset(m.minutes)}>
              {m.label}
            </Button>
          ))}
        </div>
        <p role="timer" className="my-10 font-serif text-7xl text-wine tabular-nums sm:text-9xl">
          {pad(Math.floor(remaining / 60))}:{pad(remaining % 60)}
        </p>
        <div className="flex justify-center gap-2">
          <Button variant="primary" onClick={() => focusTimer.toggle()}>
            {running ? 'Pausar' : 'Empezar'} sesión
          </Button>
          <Button onClick={() => focusTimer.reset()}>Reiniciar</Button>
        </div>
        <p className="mt-8 text-[13px] text-muted">El temporizador funciona mientras la app esté abierta. No envía notificaciones si la cierras.</p>
      </div>
    </>
  );
}
