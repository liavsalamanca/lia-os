-- Avisa al instante a los dispositivos conectados de cada cambio en sus registros.
-- Realtime aplica las mismas políticas RLS: cada persona recibe solo los suyos.
-- Se puede ejecutar más de una vez.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'records'
  ) then
    alter publication supabase_realtime add table public.records;
  end if;
end;
$$;
