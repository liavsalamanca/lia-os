-- Registros de LIA OS. Cada fila pertenece a una persona y solo ella puede verla.
create table public.records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  collection text not null check (char_length(collection) between 1 and 64),
  id text not null check (char_length(id) between 1 and 200),
  data jsonb not null check (pg_column_size(data) < 1048576),
  deleted boolean not null default false,
  -- Momento del cambio en el dispositivo: decide qué versión gana.
  modified_at timestamptz not null,
  -- Momento de llegada al servidor: permite pedir solo lo nuevo.
  updated_at timestamptz not null default clock_timestamp(),
  primary key (user_id, collection, id)
);

create index records_user_updated_idx on public.records (user_id, updated_at);

create function public.records_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.clock_timestamp();
  -- Un cambio antiguo que llega tarde no pisa uno más reciente.
  if tg_op = 'UPDATE' and new.modified_at < old.modified_at then
    return null;
  end if;
  return new;
end;
$$;

revoke execute on function public.records_guard() from public, anon, authenticated;

create trigger records_guard
before insert or update on public.records
for each row execute function public.records_guard();

alter table public.records enable row level security;
alter table public.records force row level security;

revoke all on public.records from public, anon, authenticated;
grant select, insert, update, delete on public.records to authenticated;

create policy "records_select_own" on public.records
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "records_insert_own" on public.records
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "records_update_own" on public.records
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "records_delete_own" on public.records
for delete to authenticated
using ((select auth.uid()) = user_id);
