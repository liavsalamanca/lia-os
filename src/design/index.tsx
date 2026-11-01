import { Search, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clampPercent } from '../domain/finance';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' | 'danger'; size?: 'sm' | 'md' };

export function Button({ variant = 'quiet', size = 'md', className = '', type = 'button', ...props }: ButtonProps) {
  const tone = {
    primary: 'bg-wine text-wine-ink border-wine hover:opacity-90',
    quiet: 'bg-transparent text-wine border-line-strong hover:bg-wine-soft',
    danger: 'bg-transparent text-danger border-danger/50 hover:bg-danger/10',
  }[variant];
  const scale = size === 'sm' ? 'px-3 py-1.5 text-[13px]' : 'px-4 py-2.5 text-sm';
  return <button type={type} className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border font-medium transition-colors ${scale} ${tone} ${className}`} {...props} />;
}

export function IconButton({ icon: Icon, label, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={`grid size-10 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-wine-soft hover:text-wine ${className}`} {...props}>
      <Icon size={18} strokeWidth={1.6} aria-hidden />
    </button>
  );
}

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight font-normal text-ink sm:text-5xl">{title}</h1>
        <p className="mt-2 text-muted">{subtitle}</p>
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </header>
  );
}

export function Section({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 ${className}`}>
      <div className="mb-2 flex items-baseline justify-between gap-3 border-b border-line pb-2">
        <h2 className="font-serif text-xl font-normal">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TextLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-[13px] font-medium whitespace-nowrap text-wine hover:underline">
      {children}
    </button>
  );
}

/** Franja de cifras separadas por filetes, no tarjetas. */
export function Metrics({ items }: { items: { label: string; value: ReactNode; foot?: string }[] }) {
  return (
    <dl className="mb-7 grid grid-cols-2 gap-x-6 gap-y-3 sm:gap-y-5 lg:mb-9 lg:flex lg:divide-x lg:divide-line">
      {items.map((m) => (
        <div key={m.label} className="min-w-0 lg:flex-1 lg:px-6 lg:first:pl-0">
          <dt className="text-[13px] text-muted">{m.label}</dt>
          <dd className="truncate font-serif text-2xl sm:mt-1 sm:text-3xl">{m.value}</dd>
          {m.foot && <dd className="mt-0.5 hidden text-[13px] text-muted sm:block">{m.foot}</dd>}
        </div>
      ))}
    </dl>
  );
}

export function Row({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <li className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line py-3 last:border-b-0 ${muted ? 'opacity-60' : ''}`}>{children}</li>;
}

export function RowBody({ title, sub, strike = false }: { title: ReactNode; sub?: ReactNode; strike?: boolean }) {
  return (
    <div className="min-w-48 flex-1">
      <div className={`font-medium [overflow-wrap:anywhere] ${strike ? 'line-through' : ''}`}>{title}</div>
      {sub && <div className="text-[13px] text-muted [overflow-wrap:anywhere]">{sub}</div>}
    </div>
  );
}

const TONES: [RegExp, string][] = [
  [/hecho|complet|pagado|public|confirmado|entregado|finalizado|citada/i, 'text-ok border-ok/40'],
  [/cancel|descartado/i, 'text-danger border-danger/40'],
  [/pend|idea|alta|cotiz|por leer|revisar/i, 'text-warn border-warn/40'],
  [/curso|progreso|producción|tránsito|leyendo/i, 'text-wine border-wine/40'],
];

export function Chip({ children }: { children: string }) {
  const tone = TONES.find(([re]) => re.test(children))?.[1] ?? 'text-muted border-line-strong';
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs whitespace-nowrap ${tone}`}>{children || 'Sin estado'}</span>;
}

export function Progress({ value, label }: { value: number; label: string }) {
  const percent = clampPercent(value);
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-1 overflow-hidden rounded-full bg-line">
      <div className="h-full bg-wine transition-[width] duration-500" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <div className="animate-rise px-4 py-14 text-center">
      <p className="font-serif text-xl text-wine">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-muted">{hint}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="my-5 border-l-2 border-rose pl-4 text-[13px] text-muted">{children}</p>;
}

export function Dialog({ title, onClose, children, size = 'md' }: { title: string; onClose: () => void; children: ReactNode; size?: 'sm' | 'md' }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`animate-rise max-h-[92dvh] w-[calc(100%-2rem)] overflow-auto rounded-lg border border-line bg-surface p-0 shadow-xl ${size === 'sm' ? 'max-w-md' : 'max-w-2xl'}`}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-3">
        <h2 id="dialog-title" className="font-serif text-2xl font-normal">
          {title}
        </h2>
        <IconButton icon={X} label="Cerrar" onClick={onClose} />
      </div>
      {children}
    </dialog>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block min-w-52 flex-1">
      <span className="sr-only">{placeholder}</span>
      <Search size={16} className="absolute top-3.5 left-3 text-muted" aria-hidden />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="control pl-9" />
    </label>
  );
}

export function SelectFilter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block w-auto min-w-40">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="control">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap gap-2">{children}</div>;
}
