create or replace function public.is_device_owner_for(dev text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cw_device_owners
    where dev_eui = dev
      and user_id = auth.uid()
      and permission_level = 1
  );
$$;

revoke all on function public.is_device_owner_for(text) from public;
grant execute on function public.is_device_owner_for(text) to authenticated, anon;
