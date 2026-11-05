-- Enlace privado para ver LIA OS en Apple Calendar u otra app de calendario.
-- Solo se guarda el hash SHA-256 del enlace: quien lea la tabla no puede usarlo.
create table if not exists public.calendar_feeds (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

alter table public.calendar_feeds enable row level security;
alter table public.calendar_feeds force row level security;

revoke all on public.calendar_feeds from public, anon, authenticated;
grant select, insert, update, delete on public.calendar_feeds to authenticated;

drop policy if exists "calendar_feeds_select_own" on public.calendar_feeds;
create policy "calendar_feeds_select_own" on public.calendar_feeds
for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "calendar_feeds_insert_own" on public.calendar_feeds;
create policy "calendar_feeds_insert_own" on public.calendar_feeds
for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "calendar_feeds_update_own" on public.calendar_feeds;
create policy "calendar_feeds_update_own" on public.calendar_feeds
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "calendar_feeds_delete_own" on public.calendar_feeds;
create policy "calendar_feeds_delete_own" on public.calendar_feeds
for delete to authenticated
using ((select auth.uid()) = user_id);
