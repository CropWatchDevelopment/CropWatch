create or replace function public.cw_air_data_changes()
returns trigger
security definer
language plpgsql
set search_path = ''
as $$
begin
  -- Broadcast the change event to the “cw_air_data” topic.
  -- TG_OP is the operation (INSERT/UPDATE/DELETE), TG_TABLE_NAME is the table,
  -- TG_TABLE_SCHEMA is the schema, NEW is the new row, OLD is the old row.
  perform realtime.broadcast_changes(
    'cw_air_data',          -- topic name
    TG_OP,                  -- event name (INSERT/UPDATE/DELETE)
    TG_OP,                  -- operation type
    TG_TABLE_NAME,          -- table name
    TG_TABLE_SCHEMA,        -- schema name
    NEW,                    -- new record
    OLD                     -- old record
  );
  return null;
end;
$$;

create trigger cw_air_data_broadcast_trigger
after insert or update or delete on public.cw_air_data
for each row
execute function cw_air_data_changes();




--------------------- CW_RELAY_DATA TABLE ---------------------
-- Create or replace the function for broadcasting relay data changes
create or replace function public.cw_relay_data_changes()
returns trigger
security definer
language plpgsql
set search_path = ''
as $$
begin
  -- Broadcast the change event to the “cw_relay_data” topic.
  perform realtime.broadcast_changes(
    'cw_relay_data',        -- topic name
    TG_OP,                  -- event name (INSERT/UPDATE/DELETE)
    TG_OP,                  -- operation type
    TG_TABLE_NAME,          -- table name
    TG_TABLE_SCHEMA,        -- schema name
    NEW,                    -- new record
    OLD                     -- old record
  );
  return null;
end;
$$;

-- Create the trigger that calls the function
create trigger cw_relay_data_broadcast_trigger
after insert or update or delete on public.cw_relay_data
for each row
execute function public.cw_relay_data_changes();

-- Allow authenticated users to receive broadcast messages on cw_relay_data
create policy "authenticated can receive cw_relay_data"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.topic() = 'cw_relay_data' AND
    realtime.messages.extension = 'broadcast'
  );

-- Allow authenticated users to send broadcast messages on cw_relay_data
create policy "authenticated can send cw_relay_data"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.topic() = 'cw_relay_data' AND
    realtime.messages.extension = 'broadcast'
  );