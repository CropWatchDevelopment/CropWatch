-- Are you an active member (permission < 4) of this location?
create or replace function public.is_location_member_for(loc_id bigint)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cw_location_owners clo
    where clo.location_id = loc_id
      and clo.user_id = auth.uid()
      and clo.is_active is true
      and clo.permission_level < 4
  );
$$;

-- Are you an active owner/admin (permission = 1) of this location?
create or replace function public.is_location_owner_for(loc_id bigint)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cw_location_owners clo
    where clo.location_id = loc_id
      and clo.user_id = auth.uid()
      and clo.is_active is true
      and clo.permission_level = 1
  );
$$;

revoke all on function public.is_location_member_for(bigint) from public;
revoke all on function public.is_location_owner_for(bigint)  from public;
grant execute on function public.is_location_member_for(bigint) to authenticated, anon;
grant execute on function public.is_location_owner_for(bigint)  to authenticated, anon;
