import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch, type Control, type FieldErrors, type Resolver, type UseFormRegister } from 'react-hook-form';
import { getStore, useData } from '../app/store';
import { useUI } from '../app/ui';
import type { Collection, Snapshot, Subtask } from '../data/schema';
import { Button, Dialog } from '../design';
import { formatCOP } from '../domain/finance';
import { calculateQuote, USD_THRESHOLD } from '../domain/quote';
import { collections, formSchema, newRecordTitle, savedMessage, type FieldDef } from './collections';
import { DependencyPicker, SubtaskEditor } from './taskFields';

type Values = Record<string, unknown>;

function initialValue(field: FieldDef, record: Values | undefined, snapshot: Snapshot) {
  const stored = record?.[field.name];
  if (field.type === 'tags') return Array.isArray(stored) ? stored.join(', ') : '';
  if (field.type === 'subtasks' || field.type === 'dependencies') return Array.isArray(stored) ? stored : [];
  if (stored !== undefined && stored !== null) return stored;
  if (record && field.type === 'number') return '';
  const fallback = field.default;
  if (typeof fallback === 'function') return fallback({ today: getStore().today(), settings: snapshot.settings });
  return fallback ?? '';
}

type ControlProps = { field: FieldDef; register: UseFormRegister<Values>; control: Control<Values>; errors: FieldErrors<Values>; snapshot: Snapshot; value: unknown; recordId?: string };

function FieldControl({ field, register, control: formControl, errors, snapshot, value, recordId }: ControlProps) {
  const id = `field-${field.name}`;
  const error = errors[field.name]?.message as string | undefined;
  const hintId = field.hint ? `${id}-hint` : undefined;
  const describedBy = [error ? `${id}-error` : '', hintId ?? ''].filter(Boolean).join(' ') || undefined;
  const shared = { id, 'aria-invalid': !!error, 'aria-describedby': describedBy, ...register(field.name) };
  const wrap = field.wide ? 'sm:col-span-2' : '';

  if (field.type === 'subtasks' || field.type === 'dependencies') {
    return (
      <div className={wrap}>
        <Controller
          name={field.name}
          control={formControl}
          render={({ field: f }) =>
            field.type === 'subtasks' ? (
              <SubtaskEditor label={field.label} value={f.value as Subtask[]} onChange={f.onChange} />
            ) : (
              <DependencyPicker label={field.label} value={f.value as string[]} onChange={f.onChange} tasks={snapshot.tasks} taskId={recordId} />
            )
          }
        />
      </div>
    );
  }

  let control;
  if (field.type === 'textarea') {
    control = <textarea rows={4} className="control resize-y" {...shared} />;
  } else if (field.type === 'select') {
    // Un valor antiguo fuera de la lista se conserva como opción.
    const options = typeof value === 'string' && value && !field.options?.includes(value) ? [value, ...(field.options ?? [])] : field.options;
    control = (
      <select className="control" {...shared}>
        {field.emptyOption && <option value="">{field.emptyOption}</option>}
        {options?.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  } else if (field.type === 'project') {
    control = (
      <select className="control" {...shared}>
        <option value="">Ninguno</option>
        {snapshot.projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    );
  } else if (field.type === 'number') {
    control = <input type="number" min={0} step="any" inputMode="decimal" className="control" {...shared} />;
  } else {
    const type = field.type === 'tags' ? 'text' : (field.type ?? 'text');
    const placeholder = field.type === 'url' ? 'https://' : field.type === 'tags' ? 'moda, urgente' : undefined;
    control = <input type={type} placeholder={placeholder} className="control" {...shared} />;
  }
  return (
    <div className={wrap}>
      <label htmlFor={id} className="mb-1 block text-[13px] font-medium text-muted">
        {field.label}
        {field.required && <span aria-hidden> *</span>}
      </label>
      {control}
      {field.hint && (
        <p id={hintId} className="mt-1 text-[12px] text-muted">
          {field.hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function QuotePreview({ control }: { control: Control<Values> }) {
  const { settings } = useData();
  const v = useWatch({ control });
  const n = (key: string) => Number(v[key]) || 0;
  const optional = (key: string) => (v[key] === '' || v[key] == null ? undefined : Number(v[key]));
  const quote = calculateQuote(
    { priceUSD: n('priceUSD'), shippingUSD: n('shippingUSD'), weightLb: n('weightLb'), shippingRate: optional('shippingRate'), extraUSD: n('extraUSD'), fx: optional('fx'), marginPercent: n('marginPercent') },
    settings,
  );
  return (
    <div className="border-t border-line bg-sunken px-5 py-3 text-[13px]" data-testid="quote-preview">
      <p>
        Costo {formatCOP(quote.costCOP)} · Precio sugerido <strong>{formatCOP(quote.sellCOP)}</strong> · Ganancia {formatCOP(quote.profitCOP)}
      </p>
      {quote.overThreshold && <p className="mt-1 text-warn">Producto más envío supera USD {USD_THRESHOLD}: revisa impuestos antes de cotizar.</p>}
      <p className="mt-1 text-muted">Es una estimación. Las reglas tributarias dependen del pedido y de la normativa vigente.</p>
    </div>
  );
}

export function RecordForm({ collection, id, overrides, onClose }: { collection: Collection; id?: string; overrides?: Values; onClose: () => void }) {
  const snapshot = useData();
  const { attempt } = useUI();
  const def = collections[collection];
  const record = id ? (snapshot[collection] as Values[]).find((r) => r.id === id) : undefined;
  const merged = overrides ? { ...record, ...overrides } : record;
  const { register, handleSubmit, control, watch, formState } = useForm<Values>({
    resolver: zodResolver(formSchema(def.fields, def.check) as never) as unknown as Resolver<Values>,
    defaultValues: Object.fromEntries(def.fields.map((f) => [f.name, initialValue(f, merged, snapshot)])),
  });

  const submit = handleSubmit(async (values) => {
    const ok = await attempt(() => getStore().saveRecord(collection, values, id), savedMessage(def));
    if (ok) onClose();
  });

  return (
    <Dialog title={record ? `Editar ${def.label}` : newRecordTitle(def)} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {def.fields.map((field) => (
            <FieldControl key={field.name} field={field} register={register} control={control} errors={formState.errors} snapshot={snapshot} value={watch(field.name)} recordId={record ? id : undefined} />
          ))}
        </div>
        {collection === 'orders' && <QuotePreview control={control} />}
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-surface px-5 py-3">
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={formState.isSubmitting}>
            Guardar {def.label}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
