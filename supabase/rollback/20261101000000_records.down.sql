-- Reversión de 20261101000000_records.sql. Borra todos los datos en la nube:
-- exporta un respaldo desde la app antes de ejecutarla.
drop table if exists public.records;
drop function if exists public.records_guard();
