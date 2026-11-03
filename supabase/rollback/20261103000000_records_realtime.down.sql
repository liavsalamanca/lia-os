-- Deja de avisar en tiempo real. No borra datos: la app vuelve a revisar la nube cada 15 segundos.
alter publication supabase_realtime drop table public.records;
