-- GET ALL COLUMNS IN A TABLE FOR THE RULES ENGINE
drop function if exists public.get_table_columns(regclass);
create or replace function public.get_table_columns(p_table regclass)
returns table (column_name text)
language sql
stable
set search_path = public
as $$
  select distinct on (a.attname) a.attname as column_name
  from pg_attribute a
  where a.attrelid = p_table
    and a.attnum > 0
    and not a.attisdropped
  order by a.attname, a.attnum;
$$;
select column_name from public.get_table_columns('public.cw_air_data');
-- const { data, error } = await supabase.rpc('get_table_columns', {
--  p_table: 'public.cw_devices'
-- })



