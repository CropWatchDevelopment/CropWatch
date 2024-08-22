
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS "timescaledb" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";

COMMENT ON SCHEMA "public" IS 'standard public schema';

CREATE SCHEMA IF NOT EXISTS "stripe";

ALTER SCHEMA "stripe" OWNER TO "postgres";

CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

CREATE EXTENSION IF NOT EXISTS "wrappers" WITH SCHEMA "extensions";

CREATE OR REPLACE FUNCTION "public"."delete_avatar"("avatar_url" "text", OUT "status" integer, OUT "content" character varying) RETURNS "record"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  select
      into status, content
           result.status, result.content
      from public.delete_storage_object('avatars', avatar_url) as result;
end;
$$;

ALTER FUNCTION "public"."delete_avatar"("avatar_url" "text", OUT "status" integer, OUT "content" character varying) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."delete_old_avatar"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  status int;
  content varchar;
begin
  if coalesce(old.avatar_url, '') <> ''
      and (tg_op = 'DELETE' or (old.avatar_url <> new.avatar_url)) then
    select
      into status, content
      result.status, result.content
      from public.delete_avatar(old.avatar_url) as result;
    if status <> 200 then
      raise warning 'Could not delete avatar: % %', status, content;
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

ALTER FUNCTION "public"."delete_old_avatar"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."delete_old_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  delete from public.profiles where id = old.id;
  return old;
end;
$$;

ALTER FUNCTION "public"."delete_old_profile"() OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."delete_storage_object"("bucket" "text", "object" "text", OUT "status" integer, OUT "content" character varying) RETURNS "record"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  project_url varchar := '<YOURPROJECTURL>';
  service_role_key varchar := '<YOURSERVICEROLEKEY>'; --  full access needed
  url varchar := project_url||'/storage/v1/object/'||bucket||'/'||object;
begin
  select
      into status, content
           result.status::int, result.content::varchar
      FROM extensions.http((
    'DELETE',
    url,
    ARRAY[extensions.http_header('authorization','Bearer '||service_role_key)],
    NULL,
    NULL)::extensions.http_request) as result;
end;
$$;

ALTER FUNCTION "public"."delete_storage_object"("bucket" "text", "object" "text", OUT "status" integer, OUT "content" character varying) OWNER TO "postgres";

CREATE PROCEDURE "public"."get_hloc_data"(IN "start_time" timestamp without time zone, IN "end_time" timestamp without time zone, IN "time_interval" "text", IN "table_name" "text", IN "column_name" "text")
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    EXECUTE format(
        'SELECT
            date_trunc(%L, created_at) AS interval,
            MIN(%I) AS low,
            MAX(%I) AS high,
            FIRST_VALUE(%I) OVER (PARTITION BY date_trunc(%L, created_at) ORDER BY created_at) AS open,
            LAST_VALUE(%I) OVER (PARTITION BY date_trunc(%L, created_at) ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS close
        FROM
            %I
        WHERE
            created_at >= $1 AND created_at <= $2
        GROUP BY
            date_trunc(%L, created_at)
        ORDER BY
            interval',
            temperature,
        time_interval, column_name, column_name, column_name, time_interval, column_name, column_name, table_name, time_interval
    )
    USING start_time, end_time;
END;
$_$;

ALTER PROCEDURE "public"."get_hloc_data"(IN "start_time" timestamp without time zone, IN "end_time" timestamp without time zone, IN "time_interval" "text", IN "table_name" "text", IN "column_name" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_hloc_data"("start_time" timestamp without time zone, "end_time" timestamp without time zone, "time_interval" "text", "table_name" "text", "device_eui" character varying) RETURNS TABLE("interval_time" timestamp with time zone, "low" double precision, "high" double precision, "open" double precision, "close" double precision)
    LANGUAGE "plpgsql"
    AS $_$BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT
            date_trunc(%L, created_at) AS interval_time,
            MIN(car_count) AS low,
            MAX(car_count) AS high,
            (array_agg(car_count ORDER BY created_at))[1] AS open,
            (array_agg(car_count ORDER BY created_at DESC))[1] AS close
        FROM
            %I
        WHERE
            created_at >= $1
            AND created_at <= $2
            AND dev_eui = $3
        GROUP BY
            date_trunc(%L, created_at)
        ORDER BY
            interval_time',
        time_interval, table_name, time_interval
    )
    USING start_time, end_time, device_eui;
END;$_$;

ALTER FUNCTION "public"."get_hloc_data"("start_time" timestamp without time zone, "end_time" timestamp without time zone, "time_interval" "text", "table_name" "text", "device_eui" character varying) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_location_for_user"("user_id" "uuid") RETURNS SETOF bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $_$
  select location_id from cw_locations where owner_id = $1
$_$;

ALTER FUNCTION "public"."get_location_for_user"("user_id" "uuid") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_road_events"("time_grouping" "text") RETURNS TABLE("group_period" timestamp without time zone, "event_count" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE
            WHEN time_grouping = 'hour' THEN date_trunc('hour', re.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo')
            WHEN time_grouping = 'day' THEN date_trunc('day', re.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo')
            WHEN time_grouping = 'month' THEN date_trunc('month', re.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Tokyo')
        END as group_period,
        COUNT(*) as event_count
    FROM 
        road_events re
    WHERE 
        re.created_at >= '2024-01-15 00:00:00' AT TIME ZONE 'Asia/Tokyo' AT TIME ZONE 'UTC'
        AND re.created_at < '2024-01-16 00:00:00' AT TIME ZONE 'Asia/Tokyo' AT TIME ZONE 'UTC'
    GROUP BY group_period
    ORDER BY group_period;
END;
$$;

ALTER FUNCTION "public"."get_road_events"("time_grouping" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."get_road_events_summary1"("classes" "text"[], "end_date" timestamp with time zone, "line_id" "text", "start_date" timestamp with time zone, "time_span" "text") RETURNS TABLE("period_start" timestamp with time zone, "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    query TEXT;
BEGIN
    set timezone to 'asia/tokyo'; -- MUST SET TIMEZONE BCAUSE WE WILL BE GROUPING TIMES
    RETURN QUERY EXECUTE format('
        SELECT
            date_trunc(%L, created_at) as period_start,
            COUNT(*) as count
        FROM
            public.road_events
        WHERE
            "class" = ANY(%L)
            AND created_at BETWEEN %L AND %L
            %s
        GROUP BY
            period_start
        ORDER BY
            period_start ASC
    ', time_span, classes, start_date, end_date,
      CASE WHEN line_id IS NOT NULL THEN format('AND line_id = %L', line_id) ELSE '' END);
END;
$$;

ALTER FUNCTION "public"."get_road_events_summary1"("classes" "text"[], "end_date" timestamp with time zone, "line_id" "text", "start_date" timestamp with time zone, "time_span" "text") OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', new.email);
  return new;
end;$$;

ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

CREATE FOREIGN DATA WRAPPER "stripe_customers" HANDLER "extensions"."stripe_fdw_handler" VALIDATOR "extensions"."stripe_fdw_validator";

CREATE FOREIGN DATA WRAPPER "stripe_subscriptions" HANDLER "extensions"."stripe_fdw_handler" VALIDATOR "extensions"."stripe_fdw_validator";

CREATE SERVER "stripe_customers_server" FOREIGN DATA WRAPPER "stripe_customers" OPTIONS (
    "api_key_id" '30c2cce0-93cf-42ee-bf25-ec2be22f2510',
    "api_url" 'https://api.stripe.com/v1'
);

ALTER SERVER "stripe_customers_server" OWNER TO "postgres";

CREATE SERVER "stripe_subscriptions_server" FOREIGN DATA WRAPPER "stripe_subscriptions" OPTIONS (
    "api_key_id" '7c5963c3-7de4-442e-9264-275dee6b62e8',
    "api_url" 'https://api.stripe.com/v1'
);

ALTER SERVER "stripe_subscriptions_server" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";

CREATE TABLE IF NOT EXISTS "public"."seeed_t1000" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dev_eui" character varying NOT NULL,
    "lat" numeric NOT NULL,
    "long" numeric NOT NULL,
    "sos" numeric DEFAULT '0'::numeric,
    "battery_level" numeric,
    "temperatureC" numeric,
    "profile_id" "uuid"
);

ALTER TABLE "public"."seeed_t1000" OWNER TO "postgres";

ALTER TABLE "public"."seeed_t1000" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."SEEED_T1000_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."babylon_connection_types" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type_id" bigint NOT NULL,
    "name" "text" NOT NULL
);

ALTER TABLE "public"."babylon_connection_types" OWNER TO "postgres";

ALTER TABLE "public"."babylon_connection_types" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."babylon_connection_types_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."babylon_connection_types" ALTER COLUMN "type_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."babylon_connection_types_type_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."babylon_in_connections" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "username" "text",
    "password" "text",
    "connection_name" "text" NOT NULL,
    "port" numeric,
    "type" bigint NOT NULL,
    "connection_id" bigint NOT NULL
);

ALTER TABLE "public"."babylon_in_connections" OWNER TO "postgres";

COMMENT ON TABLE "public"."babylon_in_connections" IS 'All Connections configured for Babylon';

COMMENT ON COLUMN "public"."babylon_in_connections"."connection_name" IS 'User Friendly name of this connection';

COMMENT ON COLUMN "public"."babylon_in_connections"."port" IS 'Port the connection is made over';

ALTER TABLE "public"."babylon_in_connections" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."babylon_connections_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."babylon_decoders" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "decoder" "text",
    "name" "text" DEFAULT 'Unnamed Decoder'::"text" NOT NULL,
    "decoder_id" bigint NOT NULL
);

ALTER TABLE "public"."babylon_decoders" OWNER TO "postgres";

COMMENT ON COLUMN "public"."babylon_decoders"."name" IS 'User Friendly name for this decoder';

ALTER TABLE "public"."babylon_decoders" ALTER COLUMN "decoder_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."babylon_decoders_decoder_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."babylon_decoders" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."babylon_decoders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."babylon_in_connections" ALTER COLUMN "connection_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."babylon_in_connections_connection_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."babylon_input_output" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "in_id" bigint NOT NULL,
    "out_id" bigint NOT NULL
);

ALTER TABLE "public"."babylon_input_output" OWNER TO "postgres";

ALTER TABLE "public"."babylon_input_output" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."babylon_input_output_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."babylon_notifier_types" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notifier_id" bigint NOT NULL,
    "name" "text" NOT NULL
);

ALTER TABLE "public"."babylon_notifier_types" OWNER TO "postgres";

ALTER TABLE "public"."babylon_notifier_types" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."babylon_notifier_type_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."babylon_notifier_types" ALTER COLUMN "notifier_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."babylon_notifier_type_notifier_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."babylon_notifiers" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notifier_id" bigint,
    "name" "text" NOT NULL,
    "username" "text",
    "password" "text",
    "api_key" "text",
    "host" "text",
    "port" numeric,
    "isSecure" boolean DEFAULT false NOT NULL,
    "type" bigint
);

ALTER TABLE "public"."babylon_notifiers" OWNER TO "postgres";

ALTER TABLE "public"."babylon_notifiers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."babylon_notifiers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."babylon_notifiers_out_connections" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notifier_id" bigint NOT NULL,
    "out_connection_id" bigint NOT NULL
);

ALTER TABLE "public"."babylon_notifiers_out_connections" OWNER TO "postgres";

ALTER TABLE "public"."babylon_notifiers_out_connections" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."babylon_notifiers_out_connections_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."babylon_out_connections" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "endpoint" "text",
    "username" "text",
    "password" "text",
    "connection_name" "text" NOT NULL,
    "port" numeric,
    "type" bigint NOT NULL,
    "connection_id" bigint NOT NULL,
    "decoder" bigint
);

ALTER TABLE "public"."babylon_out_connections" OWNER TO "postgres";

COMMENT ON TABLE "public"."babylon_out_connections" IS 'This is a duplicate of babylon_in_connections';

COMMENT ON COLUMN "public"."babylon_out_connections"."connection_name" IS 'User Friendly name of this connection';

COMMENT ON COLUMN "public"."babylon_out_connections"."port" IS 'Port the connection is made over';

COMMENT ON COLUMN "public"."babylon_out_connections"."decoder" IS 'fk to the decoder used for this connection';

ALTER TABLE "public"."babylon_out_connections" ALTER COLUMN "connection_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."babylon_out_connections_connection_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."babylon_out_connections" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."babylon_out_connections_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_air_thvd" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dewPointC" numeric,
    "humidity" numeric NOT NULL,
    "temperatureC" numeric NOT NULL,
    "vpd" numeric,
    "dev_eui" character varying NOT NULL,
    "profile_id" "uuid"
);

ALTER TABLE "public"."cw_air_thvd" OWNER TO "postgres";

COMMENT ON TABLE "public"."cw_air_thvd" IS 'CropWatch''s own Air Sensor';

COMMENT ON COLUMN "public"."cw_air_thvd"."profile_id" IS 'profile id if available';

ALTER TABLE "public"."cw_air_thvd" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_air_thvd_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_co2_alerts" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "dev_eui" character varying NOT NULL,
    "operator" "text" NOT NULL,
    "action" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "receiver" "text" NOT NULL,
    "cleared" boolean NOT NULL,
    "value" numeric NOT NULL,
    "OneSignalID" "text"
);

ALTER TABLE "public"."cw_co2_alerts" OWNER TO "postgres";

ALTER TABLE "public"."cw_co2_alerts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_co2_alerts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_co2_uplinks" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dev_eui" character varying,
    "battery" integer,
    "temperature" numeric NOT NULL,
    "humidity" numeric NOT NULL,
    "co2_level" numeric,
    "pressure" numeric,
    "profile_id" "uuid"
);

ALTER TABLE "public"."cw_co2_uplinks" OWNER TO "postgres";

COMMENT ON TABLE "public"."cw_co2_uplinks" IS 'Temperature type devices that may also have co2 or pressure';

ALTER TABLE "public"."cw_co2_uplinks" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_co2_uplinks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_device_locations" (
    "dev_eui" character varying(255) NOT NULL,
    "location_id" bigint NOT NULL,
    "id" bigint NOT NULL
);

ALTER TABLE "public"."cw_device_locations" OWNER TO "postgres";

ALTER TABLE "public"."cw_device_locations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_device_locations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_device_owners" (
    "user_id" "uuid" NOT NULL,
    "dev_eui" character varying(255) NOT NULL,
    "owner_id" bigint NOT NULL,
    "id" bigint NOT NULL,
    "permission_level" numeric DEFAULT '1'::numeric NOT NULL
);

ALTER TABLE "public"."cw_device_owners" OWNER TO "postgres";

COMMENT ON COLUMN "public"."cw_device_owners"."owner_id" IS 'Simply the ID for this column, leave blank is OK!';

ALTER TABLE "public"."cw_device_owners" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_device_owners_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."cw_device_owners" ALTER COLUMN "owner_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_device_owners_owner_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_device_type" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "model" "text",
    "decoder" "text",
    "manufacturer" "text",
    "data_table" "text",
    "device_app" "text",
    "primary_data" "text",
    "primary_data_notation" "text",
    "secondary_data" "text",
    "secondary_data_notation" "text",
    "primary_multiplier" numeric DEFAULT '1'::numeric,
    "primary_divider" numeric DEFAULT '1'::numeric NOT NULL,
    "secondary_divider" numeric DEFAULT '1'::numeric NOT NULL,
    "default_upload_interval" numeric,
    "secondary_multiplier" numeric DEFAULT '1'::numeric NOT NULL
);

ALTER TABLE "public"."cw_device_type" OWNER TO "postgres";

COMMENT ON TABLE "public"."cw_device_type" IS 'types of devices';

COMMENT ON COLUMN "public"."cw_device_type"."model" IS 'the model number';

COMMENT ON COLUMN "public"."cw_device_type"."decoder" IS 'link to Javascript decoder';

COMMENT ON COLUMN "public"."cw_device_type"."manufacturer" IS 'Milesite, HKT, Rak, CropWatch';

COMMENT ON COLUMN "public"."cw_device_type"."data_table" IS 'Data Table where the sensors save data may be found';

COMMENT ON COLUMN "public"."cw_device_type"."device_app" IS 'URL or endpoint of the app that displays data for this device';

COMMENT ON COLUMN "public"."cw_device_type"."primary_data" IS 'Most important data from this device';

COMMENT ON COLUMN "public"."cw_device_type"."primary_data_notation" IS 'type of notation to append to the paimary data';

COMMENT ON COLUMN "public"."cw_device_type"."primary_multiplier" IS 'Optionally Multiply value by this';

COMMENT ON COLUMN "public"."cw_device_type"."default_upload_interval" IS 'the device default normal upload interval';

ALTER TABLE "public"."cw_device_type" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_device_type_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_devices" (
    "dev_eui" character varying(255) NOT NULL,
    "name" "text" DEFAULT 'UnNamed Device'::"text" NOT NULL,
    "type" bigint,
    "upload_interval" numeric DEFAULT '-1'::numeric,
    "lat" numeric,
    "long" numeric,
    "installed_at" "date",
    "battery_changed_at" "date",
    "user_id" "uuid",
    "warranty_start_date" "date",
    "serial_number" "text",
    "location_id" numeric
);

ALTER TABLE "public"."cw_devices" OWNER TO "postgres";

COMMENT ON COLUMN "public"."cw_devices"."name" IS 'Display name of the LoRaWAN device';

COMMENT ON COLUMN "public"."cw_devices"."type" IS 'link to the type of device';

COMMENT ON COLUMN "public"."cw_devices"."upload_interval" IS 'The uplink frequency that each device sends data at in minutes, -1 mean random event based. any thing over that is the expected interval';

COMMENT ON COLUMN "public"."cw_devices"."installed_at" IS 'Date of installation at client location';

COMMENT ON COLUMN "public"."cw_devices"."battery_changed_at" IS 'Date the battery was last changed';

COMMENT ON COLUMN "public"."cw_devices"."warranty_start_date" IS 'Date that the warranty begins on the device.';

CREATE TABLE IF NOT EXISTS "public"."cw_gateways" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "gateway_name" "text" NOT NULL,
    "isOnline" boolean NOT NULL,
    "gateway_id" "text" NOT NULL
);

ALTER TABLE "public"."cw_gateways" OWNER TO "postgres";

COMMENT ON TABLE "public"."cw_gateways" IS 'This table tracks gateway status';

ALTER TABLE "public"."cw_gateways" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_gateways_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_gps_uplinks" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dev_eui" character varying NOT NULL,
    "latitude" numeric NOT NULL,
    "longitude" numeric NOT NULL,
    "geoPos" "extensions"."geometry",
    "isHistoric" boolean DEFAULT false NOT NULL,
    "altitude" numeric,
    "hdop" numeric,
    "battery" numeric,
    "collected_time" timestamp with time zone
);

ALTER TABLE "public"."cw_gps_uplinks" OWNER TO "postgres";

COMMENT ON TABLE "public"."cw_gps_uplinks" IS 'generic dump of all GPS positions from many different devices';

COMMENT ON COLUMN "public"."cw_gps_uplinks"."collected_time" IS 'the time the data was collected by the sensor';

ALTER TABLE "public"."cw_gps_uplinks" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_gps_uplinks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_location_owners" (
    "user_id" "uuid" NOT NULL,
    "owner_id" bigint NOT NULL,
    "id" bigint NOT NULL,
    "location_id" bigint NOT NULL,
    "permission_level" numeric DEFAULT '1'::numeric,
    "is_active" boolean DEFAULT true,
    "description" "text"
);

ALTER TABLE "public"."cw_location_owners" OWNER TO "postgres";

COMMENT ON COLUMN "public"."cw_location_owners"."owner_id" IS 'Simply the ID for this column, leave blank is OK!';

COMMENT ON COLUMN "public"."cw_location_owners"."permission_level" IS '0 = no access   1 = readonly';

COMMENT ON COLUMN "public"."cw_location_owners"."description" IS 'Optional Descripton of location and owner';

ALTER TABLE "public"."cw_location_owners" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_location_owners_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."cw_location_owners" ALTER COLUMN "owner_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_location_owners_owner_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_locations" (
    "location_id" bigint NOT NULL,
    "name" character varying(255) NOT NULL,
    "lat" numeric(9,6),
    "long" numeric(9,6),
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "owner_id" "uuid"
);

ALTER TABLE "public"."cw_locations" OWNER TO "postgres";

COMMENT ON COLUMN "public"."cw_locations"."owner_id" IS 'The Top most owner of the location';

ALTER TABLE "public"."cw_locations" ALTER COLUMN "location_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_locations_location_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_permission_level_types" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "permission_level_id" bigint NOT NULL,
    "name" "text" NOT NULL
);

ALTER TABLE "public"."cw_permission_level_types" OWNER TO "postgres";

ALTER TABLE "public"."cw_permission_level_types" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_permission_level_types_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."cw_permission_level_types" ALTER COLUMN "permission_level_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_permission_level_types_permission_level_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_pulse_meters" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "count" numeric DEFAULT '0'::numeric NOT NULL,
    "dev_eui" character varying NOT NULL,
    "periodCount" numeric DEFAULT '0'::numeric NOT NULL,
    "litersPerPulse" numeric DEFAULT '10'::numeric NOT NULL
);

ALTER TABLE "public"."cw_pulse_meters" OWNER TO "postgres";

COMMENT ON TABLE "public"."cw_pulse_meters" IS 'This is a duplicate of cw_air_thvd';

COMMENT ON COLUMN "public"."cw_pulse_meters"."count" IS 'All Time Pulse Count';

COMMENT ON COLUMN "public"."cw_pulse_meters"."periodCount" IS 'Count Since Last Data Send';

COMMENT ON COLUMN "public"."cw_pulse_meters"."litersPerPulse" IS 'Number of liters per pulse';

ALTER TABLE "public"."cw_pulse_meters" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_pulse_meters_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_rule_criteria" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "subject" "text" NOT NULL,
    "operator" "text" NOT NULL,
    "trigger_value" numeric NOT NULL,
    "reset_value" numeric,
    "ruleGroupId" "text" NOT NULL,
    "parent_id" "text",
    "criteria_id" bigint
);

ALTER TABLE "public"."cw_rule_criteria" OWNER TO "postgres";

COMMENT ON TABLE "public"."cw_rule_criteria" IS 'criterion that cause cw_rules to be triggered';

ALTER TABLE "public"."cw_rule_criteria" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_rule_criterion_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_rules" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dev_eui" character varying,
    "name" "text" NOT NULL,
    "babylon_notifier_type" bigint NOT NULL,
    "action_recipient" "text" NOT NULL,
    "is_triggered" boolean DEFAULT false NOT NULL,
    "last_triggered" timestamp with time zone DEFAULT ("now"() AT TIME ZONE 'utc'::"text"),
    "ruleGroupId" "text" NOT NULL,
    "profile_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trigger_count" numeric DEFAULT '0'::numeric NOT NULL
);

ALTER TABLE "public"."cw_rules" OWNER TO "postgres";

COMMENT ON TABLE "public"."cw_rules" IS 'All Top Level Rules, Please ref cw_rule_criteria for note info';

COMMENT ON COLUMN "public"."cw_rules"."trigger_count" IS 'number of time rule has been triggered in total since last reset';

ALTER TABLE "public"."cw_rules" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_rules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_soil_uplinks" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dev_eui" character varying,
    "battery" integer,
    "temperature" numeric NOT NULL,
    "moisture" numeric NOT NULL,
    "ec" numeric,
    "ph" numeric,
    "n" numeric,
    "p" numeric,
    "k" numeric,
    "internal_temp" numeric,
    "real_duration" numeric,
    "read_attempts" integer
);

ALTER TABLE "public"."cw_soil_uplinks" OWNER TO "postgres";

COMMENT ON TABLE "public"."cw_soil_uplinks" IS 'Data from CropWatch V2.0';

ALTER TABLE "public"."cw_soil_uplinks" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_soil_uplinks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_ss_tme" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "soil_EC" numeric,
    "soil_moisture" numeric NOT NULL,
    "soil_temperatureC" numeric NOT NULL,
    "dev_eui" character varying NOT NULL,
    "modbusAttempts" smallint,
    "internalTemp" numeric,
    "batteryVoltage" numeric,
    "profile_id" "uuid"
);

ALTER TABLE "public"."cw_ss_tme" OWNER TO "postgres";

COMMENT ON TABLE "public"."cw_ss_tme" IS 'Soil Temp, Moisture and EC Sensor Data';

COMMENT ON COLUMN "public"."cw_ss_tme"."soil_EC" IS 'soil EC in us/cm';

COMMENT ON COLUMN "public"."cw_ss_tme"."soil_moisture" IS 'Soil Moisture in %';

COMMENT ON COLUMN "public"."cw_ss_tme"."soil_temperatureC" IS 'Soil Temp in C';

COMMENT ON COLUMN "public"."cw_ss_tme"."modbusAttempts" IS 'Number of try it took to get this data';

COMMENT ON COLUMN "public"."cw_ss_tme"."internalTemp" IS 'Temp of the main processor Must not exceed 85C';

COMMENT ON COLUMN "public"."cw_ss_tme"."batteryVoltage" IS 'is the battery good or not';

ALTER TABLE "public"."cw_ss_tme" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_ss_tme_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_ss_tmepnpk" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "soil_EC" numeric,
    "soil_moisture" numeric NOT NULL,
    "soil_temperatureC" numeric NOT NULL,
    "soil_PH" numeric,
    "dev_eui" character varying NOT NULL,
    "soil_N" numeric,
    "soil_P" numeric,
    "soil_K" numeric,
    "modbusAttempts" smallint,
    "internalTemp" numeric,
    "batteryVoltage" numeric
);

ALTER TABLE "public"."cw_ss_tmepnpk" OWNER TO "postgres";

COMMENT ON COLUMN "public"."cw_ss_tmepnpk"."soil_EC" IS 'soil EC in us/cm';

COMMENT ON COLUMN "public"."cw_ss_tmepnpk"."soil_moisture" IS 'Soil Moisture in %';

COMMENT ON COLUMN "public"."cw_ss_tmepnpk"."soil_temperatureC" IS 'Soil Temp in C';

COMMENT ON COLUMN "public"."cw_ss_tmepnpk"."soil_PH" IS 'Soil PH - 0 to 9';

COMMENT ON COLUMN "public"."cw_ss_tmepnpk"."soil_N" IS 'Soil Nitrigen in mg/kg';

COMMENT ON COLUMN "public"."cw_ss_tmepnpk"."soil_P" IS 'Soil Phosporus in mg/kg';

COMMENT ON COLUMN "public"."cw_ss_tmepnpk"."soil_K" IS 'soil potacium in mg/kg';

COMMENT ON COLUMN "public"."cw_ss_tmepnpk"."modbusAttempts" IS 'Number of try it took to get this data';

COMMENT ON COLUMN "public"."cw_ss_tmepnpk"."internalTemp" IS 'Temp of the main processor Must not exceed 85C';

COMMENT ON COLUMN "public"."cw_ss_tmepnpk"."batteryVoltage" IS 'is the battery good or not';

ALTER TABLE "public"."cw_ss_tmepnpk" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_ss_tmepnpk_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_traffic" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "object_type" "text" NOT NULL,
    "period_in" numeric DEFAULT '0'::numeric NOT NULL,
    "period_out" numeric DEFAULT '0'::numeric NOT NULL,
    "period_total" numeric DEFAULT '0'::numeric NOT NULL,
    "dev_eui" character varying NOT NULL
);

ALTER TABLE "public"."cw_traffic" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."cw_traffic2" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "people_count" numeric DEFAULT '0'::numeric NOT NULL,
    "bicycle_count" numeric DEFAULT '0'::numeric NOT NULL,
    "car_count" numeric DEFAULT '0'::numeric NOT NULL,
    "truck_count" numeric DEFAULT '0'::numeric NOT NULL,
    "bus_count" numeric DEFAULT '0'::numeric NOT NULL,
    "dev_eui" character varying NOT NULL
);

ALTER TABLE "public"."cw_traffic2" OWNER TO "postgres";

ALTER TABLE "public"."cw_traffic2" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_traffic2_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE "public"."cw_traffic" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_traffic_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."cw_watermeter_uplinks" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dev_eui" character varying NOT NULL,
    "count" bigint NOT NULL,
    "internal_temp" real,
    "battery_level" smallint
);

ALTER TABLE "public"."cw_watermeter_uplinks" OWNER TO "postgres";

COMMENT ON TABLE "public"."cw_watermeter_uplinks" IS 'Recordings of pulse water meters';

ALTER TABLE "public"."cw_watermeter_uplinks" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."cw_water_meter_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."devices" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "dev_eui" "text" NOT NULL,
    "profile_id" "uuid",
    "type" "text" DEFAULT 'Not Set'::"text",
    "lat" double precision,
    "lng" double precision,
    "device_name" "text",
    "active" boolean DEFAULT false NOT NULL,
    "linked_device_eui" "text"
);

ALTER TABLE "public"."devices" OWNER TO "postgres";

COMMENT ON COLUMN "public"."devices"."type" IS 'Type of device (eg. CropWatch or LoRaWATCH)';

COMMENT ON COLUMN "public"."devices"."device_name" IS 'user friendly name for this device';

ALTER TABLE "public"."devices" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."devices_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "lat" numeric,
    "lng" numeric,
    "name" "text" NOT NULL,
    "description" "text",
    "sensor_type" "text",
    "profile_id" "uuid",
    "dev_eui" "text"
);

ALTER TABLE "public"."locations" OWNER TO "postgres";

ALTER TABLE "public"."locations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."locations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."netvox_ra02a" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dev_eui" character varying NOT NULL,
    "fireAlarm" smallint NOT NULL,
    "highTempAlarm" smallint NOT NULL,
    "temperatureC" numeric NOT NULL,
    "battery" numeric NOT NULL,
    "profile_id" "uuid"
);

ALTER TABLE "public"."netvox_ra02a" OWNER TO "postgres";

ALTER TABLE "public"."netvox_ra02a" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."netvox_ra02a_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "resource" "text" NOT NULL,
    "role_id" bigint NOT NULL,
    "allowed_profile_id" "uuid",
    "allowed_by_profile_id" "uuid",
    "description" "text"
);

ALTER TABLE "public"."permissions" OWNER TO "postgres";

ALTER TABLE "public"."permissions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."permissions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "website" "text",
    "email" character varying,
    "last_login" timestamp with time zone,
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);

ALTER TABLE "public"."profiles" OWNER TO "postgres";

COMMENT ON COLUMN "public"."profiles"."email" IS 'User''s Email Address';

CREATE TABLE IF NOT EXISTS "public"."road_events" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "class" "text" NOT NULL,
    "track_id" numeric NOT NULL,
    "direction" numeric NOT NULL,
    "source_datetime" timestamp with time zone,
    "server_event_datetime" timestamp with time zone DEFAULT "now"(),
    "camera_id" "text",
    "line_id" "text"
);

ALTER TABLE "public"."road_events" OWNER TO "postgres";

ALTER TABLE "public"."road_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."road_event_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."road_event_lines" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "line_name" "text" NOT NULL,
    "camera_name" "text" NOT NULL,
    "camera_id" "text" DEFAULT ''::"text" NOT NULL
);

ALTER TABLE "public"."road_event_lines" OWNER TO "postgres";

COMMENT ON TABLE "public"."road_event_lines" IS 'Lines from each camera';

COMMENT ON COLUMN "public"."road_event_lines"."camera_id" IS 'id of camera in yaml file';

ALTER TABLE "public"."road_event_lines" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."road_event_lines_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" NOT NULL,
    "code" bigint,
    "description" "text"
);

ALTER TABLE "public"."roles" OWNER TO "postgres";

ALTER TABLE "public"."roles" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."roles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."seeed_co2_lorawan_uplinks" (
    "id" integer NOT NULL,
    "dev_eui" character varying(255) NOT NULL,
    "valid" boolean,
    "err" integer,
    "payload" "text",
    "rssi" integer,
    "snr" double precision,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "battery" integer,
    "interval" integer,
    "temperature" double precision,
    "humidity" double precision,
    "co2_level" integer,
    "pressure" double precision
);

ALTER TABLE "public"."seeed_co2_lorawan_uplinks" OWNER TO "postgres";

CREATE SEQUENCE IF NOT EXISTS "public"."seeed_co2_lorawan_uplinks_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."seeed_co2_lorawan_uplinks_id_seq" OWNER TO "postgres";

ALTER SEQUENCE "public"."seeed_co2_lorawan_uplinks_id_seq" OWNED BY "public"."seeed_co2_lorawan_uplinks"."id";

CREATE TABLE IF NOT EXISTS "public"."seeed_sensecap_s2103_WaterLevel" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dev_eui" character varying NOT NULL,
    "profile_id" "uuid",
    "water_level" numeric NOT NULL
);

ALTER TABLE "public"."seeed_sensecap_s2103_WaterLevel" OWNER TO "postgres";

COMMENT ON TABLE "public"."seeed_sensecap_s2103_WaterLevel" IS 'Water Level using seeed sensecap';

ALTER TABLE "public"."seeed_sensecap_s2103_WaterLevel" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."seeed_sensecap_s2103_WaterLevel_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."seeed_sensecap_s2120" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "dev_eui" character varying NOT NULL,
    "profile_id" "uuid",
    "temperatureC" numeric,
    "humidity" numeric,
    "rainfall" numeric,
    "pressure" numeric DEFAULT '92670'::numeric,
    "wind_speed" numeric,
    "wind_direction" numeric DEFAULT '1'::numeric,
    "lux" numeric,
    "uv" numeric,
    "frame_id" numeric,
    CONSTRAINT "seeed_sensecap_s2120_frame_id_check" CHECK (("frame_id" > (0)::numeric))
);

ALTER TABLE "public"."seeed_sensecap_s2120" OWNER TO "postgres";

COMMENT ON COLUMN "public"."seeed_sensecap_s2120"."frame_id" IS 'If a message is split, this is the split ID';

ALTER TABLE "public"."seeed_sensecap_s2120" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."seeed_sensecap_s2120_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE TABLE IF NOT EXISTS "public"."sensors" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "connected_device" "text",
    "lat" numeric,
    "lng" numeric,
    "type" "text",
    "address" numeric
);

ALTER TABLE "public"."sensors" OWNER TO "postgres";

COMMENT ON TABLE "public"."sensors" IS 'table of individual sensors, they may be connected to another device, or stand-alone';

COMMENT ON COLUMN "public"."sensors"."type" IS 'communication type (standalone, modbus, i2c, serial, ...)';

COMMENT ON COLUMN "public"."sensors"."address" IS 'If it has an address, or channel ID, add it here';

ALTER TABLE "public"."sensors" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."sensors_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE FOREIGN TABLE "public"."stripe_customers" (
    "id" "text",
    "email" "text",
    "name" "text",
    "description" "text",
    "created" timestamp without time zone,
    "attrs" "jsonb"
)
SERVER "stripe_customers_server"
OPTIONS (
    "object" 'customers',
    "rowid_column" 'id',
    "schema" 'public'
);

ALTER FOREIGN TABLE "public"."stripe_customers" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."temp_humid_co2_alert_settings" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "dev_eui" "text" NOT NULL,
    "operator" "text" NOT NULL,
    "action" numeric NOT NULL,
    "subject" "text" NOT NULL,
    "receiver" "text" NOT NULL,
    "cleared" boolean NOT NULL,
    "value" numeric NOT NULL,
    "OneSignalID" "text"
);

ALTER TABLE "public"."temp_humid_co2_alert_settings" OWNER TO "postgres";

COMMENT ON TABLE "public"."temp_humid_co2_alert_settings" IS 'Temerature Humidity CO2 Alert Settings where user settings are stored';

ALTER TABLE "public"."temp_humid_co2_alert_settings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."temp_humid_co2_alert_settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

CREATE FOREIGN TABLE "stripe"."stripe_subscriptions" (
    "id" "text",
    "current_period_start" timestamp without time zone,
    "current_period_end" timestamp without time zone,
    "attrs" "jsonb",
    "customer" "text",
    "currency" "text"
)
SERVER "stripe_subscriptions_server"
OPTIONS (
    "object" 'subscriptions',
    "rowid_column" 'id',
    "schema" 'custom'
);

ALTER FOREIGN TABLE "stripe"."stripe_subscriptions" OWNER TO "postgres";

ALTER TABLE ONLY "public"."seeed_co2_lorawan_uplinks" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."seeed_co2_lorawan_uplinks_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."seeed_t1000"
    ADD CONSTRAINT "SEEED_T1000_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."babylon_connection_types"
    ADD CONSTRAINT "babylon_connection_types_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."babylon_connection_types"
    ADD CONSTRAINT "babylon_connection_types_type_id_key" UNIQUE ("type_id");

ALTER TABLE ONLY "public"."babylon_in_connections"
    ADD CONSTRAINT "babylon_connections_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."babylon_decoders"
    ADD CONSTRAINT "babylon_decoders_decoder_id_key" UNIQUE ("decoder_id");

ALTER TABLE ONLY "public"."babylon_decoders"
    ADD CONSTRAINT "babylon_decoders_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."babylon_in_connections"
    ADD CONSTRAINT "babylon_in_connections_connection_id_key" UNIQUE ("connection_id");

ALTER TABLE ONLY "public"."babylon_input_output"
    ADD CONSTRAINT "babylon_input_output_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."babylon_notifier_types"
    ADD CONSTRAINT "babylon_notifier_type_name_key" UNIQUE ("name");

ALTER TABLE ONLY "public"."babylon_notifier_types"
    ADD CONSTRAINT "babylon_notifier_type_notifier_id_key" UNIQUE ("notifier_id");

ALTER TABLE ONLY "public"."babylon_notifier_types"
    ADD CONSTRAINT "babylon_notifier_type_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."babylon_notifiers_out_connections"
    ADD CONSTRAINT "babylon_notifiers_out_connections_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."babylon_notifiers"
    ADD CONSTRAINT "babylon_notifiers_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."babylon_out_connections"
    ADD CONSTRAINT "babylon_out_connections_connection_id_key" UNIQUE ("connection_id");

ALTER TABLE ONLY "public"."babylon_out_connections"
    ADD CONSTRAINT "babylon_out_connections_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_air_thvd"
    ADD CONSTRAINT "cw_air_thvd_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_co2_alerts"
    ADD CONSTRAINT "cw_co2_alerts_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_co2_uplinks"
    ADD CONSTRAINT "cw_co2_uplinks_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_device_locations"
    ADD CONSTRAINT "cw_device_locations_dev_eui_key" UNIQUE ("dev_eui");

ALTER TABLE ONLY "public"."cw_device_locations"
    ADD CONSTRAINT "cw_device_locations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_device_owners"
    ADD CONSTRAINT "cw_device_owners_owner_id_key" UNIQUE ("owner_id");

ALTER TABLE ONLY "public"."cw_device_owners"
    ADD CONSTRAINT "cw_device_owners_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_device_type"
    ADD CONSTRAINT "cw_device_type_name_key" UNIQUE ("name");

ALTER TABLE ONLY "public"."cw_device_type"
    ADD CONSTRAINT "cw_device_type_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_gateways"
    ADD CONSTRAINT "cw_gateways_gateway_id_key" UNIQUE ("gateway_id");

ALTER TABLE ONLY "public"."cw_gateways"
    ADD CONSTRAINT "cw_gateways_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_gps_uplinks"
    ADD CONSTRAINT "cw_gps_uplinks_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_location_owners"
    ADD CONSTRAINT "cw_location_owners_owner_id_key" UNIQUE ("owner_id");

ALTER TABLE ONLY "public"."cw_location_owners"
    ADD CONSTRAINT "cw_location_owners_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_locations"
    ADD CONSTRAINT "cw_locations_pkey" PRIMARY KEY ("location_id");

ALTER TABLE ONLY "public"."cw_permission_level_types"
    ADD CONSTRAINT "cw_permission_level_types_name_key" UNIQUE ("name");

ALTER TABLE ONLY "public"."cw_permission_level_types"
    ADD CONSTRAINT "cw_permission_level_types_permission_level_id_key" UNIQUE ("permission_level_id");

ALTER TABLE ONLY "public"."cw_permission_level_types"
    ADD CONSTRAINT "cw_permission_level_types_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_pulse_meters"
    ADD CONSTRAINT "cw_pulse_meters_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_rule_criteria"
    ADD CONSTRAINT "cw_rule_criteria_parent_id_key" UNIQUE ("parent_id");

ALTER TABLE ONLY "public"."cw_rule_criteria"
    ADD CONSTRAINT "cw_rule_criterion_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_rules"
    ADD CONSTRAINT "cw_rules_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_rules"
    ADD CONSTRAINT "cw_rules_ruleGroupId_key" UNIQUE ("ruleGroupId");

ALTER TABLE ONLY "public"."cw_soil_uplinks"
    ADD CONSTRAINT "cw_soil_uplinks_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_ss_tme"
    ADD CONSTRAINT "cw_ss_tme_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_ss_tmepnpk"
    ADD CONSTRAINT "cw_ss_tmepnpk_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_traffic2"
    ADD CONSTRAINT "cw_traffic2_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_traffic"
    ADD CONSTRAINT "cw_traffic_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_watermeter_uplinks"
    ADD CONSTRAINT "cw_water_meter_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_dev_eui_key" UNIQUE ("dev_eui");

ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."netvox_ra02a"
    ADD CONSTRAINT "netvox_ra02a_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."cw_devices"
    ADD CONSTRAINT "pk_cw_devices" PRIMARY KEY ("dev_eui");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");

ALTER TABLE ONLY "public"."road_event_lines"
    ADD CONSTRAINT "road_event_lines_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."road_events"
    ADD CONSTRAINT "road_event_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."seeed_co2_lorawan_uplinks"
    ADD CONSTRAINT "seeed_co2_lorawan_uplinks_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."seeed_sensecap_s2103_WaterLevel"
    ADD CONSTRAINT "seeed_sensecap_s2103_WaterLevel_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."seeed_sensecap_s2120"
    ADD CONSTRAINT "seeed_sensecap_s2120_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."sensors"
    ADD CONSTRAINT "sensors_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."temp_humid_co2_alert_settings"
    ADD CONSTRAINT "temp_humid_co2_alert_settings_pkey" PRIMARY KEY ("id");

CREATE INDEX "cw_device_owners_dev_eui_idx" ON "public"."cw_device_owners" USING "btree" ("dev_eui");

CREATE INDEX "road_events_created_at_idx" ON "public"."road_events" USING "btree" ("created_at");

CREATE INDEX "seeed_co2_lorawan_uplinks_created_at_idx" ON "public"."seeed_co2_lorawan_uplinks" USING "btree" ("created_at");

CREATE OR REPLACE TRIGGER "before_profile_changes" BEFORE DELETE OR UPDATE OF "avatar_url" ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."delete_old_avatar"();

ALTER TABLE ONLY "public"."seeed_t1000"
    ADD CONSTRAINT "SEEED_T1000_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."babylon_input_output"
    ADD CONSTRAINT "babylon_input_output_in_id_fkey" FOREIGN KEY ("in_id") REFERENCES "public"."babylon_in_connections"("connection_id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."babylon_input_output"
    ADD CONSTRAINT "babylon_input_output_out_id_fkey" FOREIGN KEY ("out_id") REFERENCES "public"."babylon_out_connections"("connection_id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."cw_air_thvd"
    ADD CONSTRAINT "cw_air_thvd_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."cw_co2_alerts"
    ADD CONSTRAINT "cw_co2_alerts_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui");

ALTER TABLE ONLY "public"."cw_co2_alerts"
    ADD CONSTRAINT "cw_co2_alerts_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."cw_co2_uplinks"
    ADD CONSTRAINT "cw_co2_uplinks_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."cw_device_locations"
    ADD CONSTRAINT "cw_device_locations_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."cw_device_locations"
    ADD CONSTRAINT "cw_device_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."cw_locations"("location_id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."cw_device_owners"
    ADD CONSTRAINT "cw_device_owners_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."cw_device_owners"
    ADD CONSTRAINT "cw_device_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."cw_devices"
    ADD CONSTRAINT "cw_devices_type_fkey" FOREIGN KEY ("type") REFERENCES "public"."cw_device_type"("id");

ALTER TABLE ONLY "public"."cw_location_owners"
    ADD CONSTRAINT "cw_location_owners_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."cw_locations"("location_id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."cw_location_owners"
    ADD CONSTRAINT "cw_location_owners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."cw_locations"
    ADD CONSTRAINT "cw_locations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."cw_rules"
    ADD CONSTRAINT "cw_rules_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."cw_soil_uplinks"
    ADD CONSTRAINT "cw_soil_uplinks_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui");

ALTER TABLE ONLY "public"."cw_ss_tme"
    ADD CONSTRAINT "cw_ss_tme_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."cw_ss_tmepnpk"
    ADD CONSTRAINT "cw_ss_tmepnpk_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."cw_traffic2"
    ADD CONSTRAINT "cw_traffic2_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui");

ALTER TABLE ONLY "public"."cw_watermeter_uplinks"
    ADD CONSTRAINT "cw_watermeter_uplinks_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui");

ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "auth"."users"("id");

ALTER TABLE ONLY "public"."netvox_ra02a"
    ADD CONSTRAINT "netvox_ra02a_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_allowed_by_profile_id_fkey" FOREIGN KEY ("allowed_by_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_allowed_profile_id_fkey" FOREIGN KEY ("allowed_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."babylon_in_connections"
    ADD CONSTRAINT "public_babylon_connections_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."babylon_in_connections"
    ADD CONSTRAINT "public_babylon_in_connections_type_fkey" FOREIGN KEY ("type") REFERENCES "public"."babylon_connection_types"("type_id");

ALTER TABLE ONLY "public"."babylon_out_connections"
    ADD CONSTRAINT "public_babylon_out_connections_decoder_fkey" FOREIGN KEY ("decoder") REFERENCES "public"."babylon_decoders"("decoder_id");

ALTER TABLE ONLY "public"."babylon_out_connections"
    ADD CONSTRAINT "public_babylon_out_connections_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."babylon_out_connections"
    ADD CONSTRAINT "public_babylon_out_connections_type_fkey" FOREIGN KEY ("type") REFERENCES "public"."babylon_connection_types"("type_id");

ALTER TABLE ONLY "public"."cw_air_thvd"
    ADD CONSTRAINT "public_cw_air_thvd_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."cw_pulse_meters"
    ADD CONSTRAINT "public_cw_pulse_meters_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui");

ALTER TABLE ONLY "public"."cw_rule_criteria"
    ADD CONSTRAINT "public_cw_rule_criteria_ruleGroupId_fkey" FOREIGN KEY ("ruleGroupId") REFERENCES "public"."cw_rules"("ruleGroupId") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."cw_rules"
    ADD CONSTRAINT "public_cw_rules_babylon_notifier_type_fkey" FOREIGN KEY ("babylon_notifier_type") REFERENCES "public"."babylon_notifier_types"("notifier_id");

ALTER TABLE ONLY "public"."cw_rules"
    ADD CONSTRAINT "public_cw_rules_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");

ALTER TABLE ONLY "public"."seeed_co2_lorawan_uplinks"
    ADD CONSTRAINT "seeed_co2_lorawan_uplinks_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."seeed_sensecap_s2103_WaterLevel"
    ADD CONSTRAINT "seeed_sensecap_s2103_WaterLevel_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui");

ALTER TABLE ONLY "public"."seeed_sensecap_s2120"
    ADD CONSTRAINT "seeed_sensecap_s2120_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."cw_devices"("dev_eui");

ALTER TABLE ONLY "public"."seeed_t1000"
    ADD CONSTRAINT "seeed_t1000_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY "public"."sensors"
    ADD CONSTRAINT "sensors_connected_device_fkey" FOREIGN KEY ("connected_device") REFERENCES "public"."devices"("dev_eui");

ALTER TABLE ONLY "public"."temp_humid_co2_alert_settings"
    ADD CONSTRAINT "temp_humid_co2_alert_settings_dev_eui_fkey" FOREIGN KEY ("dev_eui") REFERENCES "public"."devices"("dev_eui");

ALTER TABLE ONLY "public"."temp_humid_co2_alert_settings"
    ADD CONSTRAINT "temp_humid_co2_alert_settings_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");

CREATE POLICY "Allow device owners access." ON "public"."devices" USING (("dev_eui" IN ( SELECT "cw_device_owners"."dev_eui"
   FROM "public"."cw_device_owners"
  WHERE ("cw_device_owners"."user_id" = "auth"."uid"())))) WITH CHECK (("dev_eui" IN ( SELECT "cw_device_owners"."dev_eui"
   FROM "public"."cw_device_owners"
  WHERE ("cw_device_owners"."user_id" = "auth"."uid"()))));

CREATE POLICY "Enable Select for users based on user_id" ON "public"."cw_rules" FOR SELECT USING (("auth"."uid"() = "profile_id"));

CREATE POLICY "Enable cw_device_types read access for all users" ON "public"."cw_device_type" FOR SELECT USING (true);

CREATE POLICY "Enable delete for users based on user_id" ON "public"."cw_location_owners" FOR SELECT USING ((("auth"."uid"() = "user_id") AND ("is_active" = true)));

CREATE POLICY "Enable delete for users based on user_id" ON "public"."cw_locations" FOR DELETE USING ((( SELECT "auth"."uid"() AS "uid") = "owner_id"));

CREATE POLICY "Enable delete for users based on user_id" ON "public"."cw_rules" FOR DELETE USING (("auth"."uid"() = "profile_id"));

CREATE POLICY "Enable delete for users based on user_id" ON "public"."temp_humid_co2_alert_settings" FOR DELETE USING (("auth"."uid"() = "profile_id"));

CREATE POLICY "Enable insert for authenticated users only" ON "public"."cw_devices" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable insert for authenticated users only" ON "public"."cw_rules" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable insert to Locations for authenticated users only" ON "public"."cw_locations" FOR INSERT TO "authenticated" WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON "public"."cw_gateways" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."cw_permission_level_types" FOR SELECT USING (true);

CREATE POLICY "Enable read access for all users" ON "public"."road_events" FOR SELECT USING (true);

CREATE POLICY "Enable read access for service_role users" ON "public"."babylon_in_connections" FOR SELECT TO "service_role" USING (true);

CREATE POLICY "Enable select for users based on user_id" ON "public"."cw_device_owners" FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Enable update for users based on user_id" ON "public"."cw_rules" FOR UPDATE USING (("auth"."uid"() = "profile_id"));

CREATE POLICY "Members can insert team details if they belong to the team" ON "public"."cw_device_owners" FOR INSERT WITH CHECK (( SELECT true
   FROM "public"."cw_device_owners" "cw_device_owners_1"
  WHERE ("cw_device_owners_1"."permission_level" = (3)::numeric)));

CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);

CREATE POLICY "Update only devices you own" ON "public"."cw_devices" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."cw_device_owners" "cdo"
  WHERE ((("cdo"."dev_eui")::"text" = ("cw_devices"."dev_eui")::"text") AND ("cdo"."user_id" = "auth"."uid"())))));

CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));

CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));

CREATE POLICY "allow only authenticated user to view their own cw_devices" ON "public"."cw_devices" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."cw_device_owners" "cdo"
  WHERE ((("cdo"."dev_eui")::"text" = ("cw_devices"."dev_eui")::"text") AND ("cdo"."user_id" = "auth"."uid"())))));

ALTER TABLE "public"."babylon_connection_types" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."babylon_decoders" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."babylon_in_connections" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."babylon_input_output" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."babylon_notifier_types" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."babylon_notifiers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."babylon_notifiers_out_connections" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."babylon_out_connections" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."cw_device_type" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."cw_devices" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."cw_gateways" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."cw_locations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."cw_permission_level_types" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."cw_pulse_meters" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."cw_rules" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."cw_watermeter_uplinks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "location owner can insert team members if they own to the locat" ON "public"."cw_location_owners" USING (("location_id" IN ( SELECT "public"."get_location_for_user"("auth"."uid"()) AS "get_location_for_user")));

ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."road_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select if you have been granted permission" ON "public"."locations" FOR SELECT USING ((("auth"."uid"() = "profile_id") OR (0 < ( SELECT "count"(*) AS "count"
   FROM "public"."permissions"
  WHERE (("permissions"."allowed_profile_id" = "auth"."uid"()) AND (("permissions"."allowed_by_profile_id" = "locations"."profile_id") AND ("permissions"."resource" = "locations"."name")))))));

CREATE POLICY "select_user_devices_only" ON "public"."devices" USING (("auth"."uid"() = "profile_id"));

CREATE POLICY "update_if_user_owns_table" ON "public"."cw_locations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."cw_location_owners"
  WHERE (("cw_location_owners"."user_id" = "auth"."uid"()) AND ("cw_location_owners"."location_id" = "cw_locations"."location_id")))));

CREATE POLICY "user_owns_location" ON "public"."cw_locations" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."cw_location_owners"
  WHERE (("cw_location_owners"."location_id" = "cw_locations"."location_id") AND ("cw_location_owners"."user_id" = "auth"."uid"()) AND ("cw_location_owners"."is_active" = true)))) OR (NOT (EXISTS ( SELECT 1
   FROM "public"."cw_location_owners"
  WHERE ("cw_location_owners"."location_id" = "cw_locations"."location_id"))))));

ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."babylon_in_connections";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."cw_air_thvd";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."cw_co2_uplinks";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."cw_rules";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."cw_soil_uplinks";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."cw_ss_tme";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."cw_ss_tmepnpk";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."cw_traffic";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."netvox_ra02a";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."road_events";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."seeed_co2_lorawan_uplinks";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."seeed_sensecap_s2103_WaterLevel";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."seeed_sensecap_s2120";

ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."seeed_t1000";

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."delete_avatar"("avatar_url" "text", OUT "status" integer, OUT "content" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_avatar"("avatar_url" "text", OUT "status" integer, OUT "content" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_avatar"("avatar_url" "text", OUT "status" integer, OUT "content" character varying) TO "service_role";

GRANT ALL ON FUNCTION "public"."delete_old_avatar"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_old_avatar"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_old_avatar"() TO "service_role";

GRANT ALL ON FUNCTION "public"."delete_old_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_old_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_old_profile"() TO "service_role";

GRANT ALL ON FUNCTION "public"."delete_storage_object"("bucket" "text", "object" "text", OUT "status" integer, OUT "content" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_storage_object"("bucket" "text", "object" "text", OUT "status" integer, OUT "content" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_storage_object"("bucket" "text", "object" "text", OUT "status" integer, OUT "content" character varying) TO "service_role";

GRANT ALL ON PROCEDURE "public"."get_hloc_data"(IN "start_time" timestamp without time zone, IN "end_time" timestamp without time zone, IN "time_interval" "text", IN "table_name" "text", IN "column_name" "text") TO "anon";
GRANT ALL ON PROCEDURE "public"."get_hloc_data"(IN "start_time" timestamp without time zone, IN "end_time" timestamp without time zone, IN "time_interval" "text", IN "table_name" "text", IN "column_name" "text") TO "authenticated";
GRANT ALL ON PROCEDURE "public"."get_hloc_data"(IN "start_time" timestamp without time zone, IN "end_time" timestamp without time zone, IN "time_interval" "text", IN "table_name" "text", IN "column_name" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_hloc_data"("start_time" timestamp without time zone, "end_time" timestamp without time zone, "time_interval" "text", "table_name" "text", "device_eui" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_hloc_data"("start_time" timestamp without time zone, "end_time" timestamp without time zone, "time_interval" "text", "table_name" "text", "device_eui" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_hloc_data"("start_time" timestamp without time zone, "end_time" timestamp without time zone, "time_interval" "text", "table_name" "text", "device_eui" character varying) TO "service_role";

GRANT ALL ON FUNCTION "public"."get_location_for_user"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_location_for_user"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_location_for_user"("user_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_road_events"("time_grouping" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_road_events"("time_grouping" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_road_events"("time_grouping" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_road_events_summary1"("classes" "text"[], "end_date" timestamp with time zone, "line_id" "text", "start_date" timestamp with time zone, "time_span" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_road_events_summary1"("classes" "text"[], "end_date" timestamp with time zone, "line_id" "text", "start_date" timestamp with time zone, "time_span" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_road_events_summary1"("classes" "text"[], "end_date" timestamp with time zone, "line_id" "text", "start_date" timestamp with time zone, "time_span" "text") TO "service_role";

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";

GRANT ALL ON TABLE "public"."seeed_t1000" TO "anon";
GRANT ALL ON TABLE "public"."seeed_t1000" TO "authenticated";
GRANT ALL ON TABLE "public"."seeed_t1000" TO "service_role";

GRANT ALL ON SEQUENCE "public"."SEEED_T1000_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."SEEED_T1000_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."SEEED_T1000_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."babylon_connection_types" TO "anon";
GRANT ALL ON TABLE "public"."babylon_connection_types" TO "authenticated";
GRANT ALL ON TABLE "public"."babylon_connection_types" TO "service_role";

GRANT ALL ON SEQUENCE "public"."babylon_connection_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."babylon_connection_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."babylon_connection_types_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."babylon_connection_types_type_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."babylon_connection_types_type_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."babylon_connection_types_type_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."babylon_in_connections" TO "anon";
GRANT ALL ON TABLE "public"."babylon_in_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."babylon_in_connections" TO "service_role";

GRANT ALL ON SEQUENCE "public"."babylon_connections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."babylon_connections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."babylon_connections_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."babylon_decoders" TO "anon";
GRANT ALL ON TABLE "public"."babylon_decoders" TO "authenticated";
GRANT ALL ON TABLE "public"."babylon_decoders" TO "service_role";

GRANT ALL ON SEQUENCE "public"."babylon_decoders_decoder_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."babylon_decoders_decoder_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."babylon_decoders_decoder_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."babylon_decoders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."babylon_decoders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."babylon_decoders_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."babylon_in_connections_connection_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."babylon_in_connections_connection_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."babylon_in_connections_connection_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."babylon_input_output" TO "anon";
GRANT ALL ON TABLE "public"."babylon_input_output" TO "authenticated";
GRANT ALL ON TABLE "public"."babylon_input_output" TO "service_role";

GRANT ALL ON SEQUENCE "public"."babylon_input_output_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."babylon_input_output_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."babylon_input_output_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."babylon_notifier_types" TO "anon";
GRANT ALL ON TABLE "public"."babylon_notifier_types" TO "authenticated";
GRANT ALL ON TABLE "public"."babylon_notifier_types" TO "service_role";

GRANT ALL ON SEQUENCE "public"."babylon_notifier_type_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."babylon_notifier_type_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."babylon_notifier_type_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."babylon_notifier_type_notifier_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."babylon_notifier_type_notifier_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."babylon_notifier_type_notifier_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."babylon_notifiers" TO "anon";
GRANT ALL ON TABLE "public"."babylon_notifiers" TO "authenticated";
GRANT ALL ON TABLE "public"."babylon_notifiers" TO "service_role";

GRANT ALL ON SEQUENCE "public"."babylon_notifiers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."babylon_notifiers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."babylon_notifiers_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."babylon_notifiers_out_connections" TO "anon";
GRANT ALL ON TABLE "public"."babylon_notifiers_out_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."babylon_notifiers_out_connections" TO "service_role";

GRANT ALL ON SEQUENCE "public"."babylon_notifiers_out_connections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."babylon_notifiers_out_connections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."babylon_notifiers_out_connections_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."babylon_out_connections" TO "anon";
GRANT ALL ON TABLE "public"."babylon_out_connections" TO "authenticated";
GRANT ALL ON TABLE "public"."babylon_out_connections" TO "service_role";

GRANT ALL ON SEQUENCE "public"."babylon_out_connections_connection_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."babylon_out_connections_connection_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."babylon_out_connections_connection_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."babylon_out_connections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."babylon_out_connections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."babylon_out_connections_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_air_thvd" TO "anon";
GRANT ALL ON TABLE "public"."cw_air_thvd" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_air_thvd" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_air_thvd_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_air_thvd_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_air_thvd_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_co2_alerts" TO "anon";
GRANT ALL ON TABLE "public"."cw_co2_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_co2_alerts" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_co2_alerts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_co2_alerts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_co2_alerts_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_co2_uplinks" TO "anon";
GRANT ALL ON TABLE "public"."cw_co2_uplinks" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_co2_uplinks" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_co2_uplinks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_co2_uplinks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_co2_uplinks_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_device_locations" TO "anon";
GRANT ALL ON TABLE "public"."cw_device_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_device_locations" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_device_locations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_device_locations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_device_locations_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_device_owners" TO "anon";
GRANT ALL ON TABLE "public"."cw_device_owners" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_device_owners" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_device_owners_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_device_owners_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_device_owners_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_device_owners_owner_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_device_owners_owner_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_device_owners_owner_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_device_type" TO "anon";
GRANT ALL ON TABLE "public"."cw_device_type" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_device_type" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_device_type_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_device_type_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_device_type_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_devices" TO "anon";
GRANT ALL ON TABLE "public"."cw_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_devices" TO "service_role";

GRANT ALL ON TABLE "public"."cw_gateways" TO "anon";
GRANT ALL ON TABLE "public"."cw_gateways" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_gateways" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_gateways_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_gateways_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_gateways_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_gps_uplinks" TO "anon";
GRANT ALL ON TABLE "public"."cw_gps_uplinks" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_gps_uplinks" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_gps_uplinks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_gps_uplinks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_gps_uplinks_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_location_owners" TO "anon";
GRANT ALL ON TABLE "public"."cw_location_owners" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_location_owners" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_location_owners_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_location_owners_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_location_owners_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_location_owners_owner_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_location_owners_owner_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_location_owners_owner_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_locations" TO "anon";
GRANT ALL ON TABLE "public"."cw_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_locations" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_locations_location_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_locations_location_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_locations_location_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_permission_level_types" TO "anon";
GRANT ALL ON TABLE "public"."cw_permission_level_types" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_permission_level_types" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_permission_level_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_permission_level_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_permission_level_types_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_permission_level_types_permission_level_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_permission_level_types_permission_level_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_permission_level_types_permission_level_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_pulse_meters" TO "anon";
GRANT ALL ON TABLE "public"."cw_pulse_meters" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_pulse_meters" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_pulse_meters_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_pulse_meters_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_pulse_meters_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_rule_criteria" TO "anon";
GRANT ALL ON TABLE "public"."cw_rule_criteria" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_rule_criteria" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_rule_criterion_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_rule_criterion_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_rule_criterion_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_rules" TO "anon";
GRANT ALL ON TABLE "public"."cw_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_rules" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_rules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_rules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_rules_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_soil_uplinks" TO "anon";
GRANT ALL ON TABLE "public"."cw_soil_uplinks" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_soil_uplinks" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_soil_uplinks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_soil_uplinks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_soil_uplinks_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_ss_tme" TO "anon";
GRANT ALL ON TABLE "public"."cw_ss_tme" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_ss_tme" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_ss_tme_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_ss_tme_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_ss_tme_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_ss_tmepnpk" TO "anon";
GRANT ALL ON TABLE "public"."cw_ss_tmepnpk" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_ss_tmepnpk" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_ss_tmepnpk_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_ss_tmepnpk_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_ss_tmepnpk_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_traffic" TO "anon";
GRANT ALL ON TABLE "public"."cw_traffic" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_traffic" TO "service_role";

GRANT ALL ON TABLE "public"."cw_traffic2" TO "anon";
GRANT ALL ON TABLE "public"."cw_traffic2" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_traffic2" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_traffic2_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_traffic2_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_traffic2_id_seq" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_traffic_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_traffic_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_traffic_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."cw_watermeter_uplinks" TO "anon";
GRANT ALL ON TABLE "public"."cw_watermeter_uplinks" TO "authenticated";
GRANT ALL ON TABLE "public"."cw_watermeter_uplinks" TO "service_role";

GRANT ALL ON SEQUENCE "public"."cw_water_meter_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cw_water_meter_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cw_water_meter_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."devices" TO "anon";
GRANT ALL ON TABLE "public"."devices" TO "authenticated";
GRANT ALL ON TABLE "public"."devices" TO "service_role";

GRANT ALL ON SEQUENCE "public"."devices_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."devices_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."devices_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";

GRANT ALL ON SEQUENCE "public"."locations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."locations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."locations_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."netvox_ra02a" TO "anon";
GRANT ALL ON TABLE "public"."netvox_ra02a" TO "authenticated";
GRANT ALL ON TABLE "public"."netvox_ra02a" TO "service_role";

GRANT ALL ON SEQUENCE "public"."netvox_ra02a_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."netvox_ra02a_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."netvox_ra02a_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";

GRANT ALL ON SEQUENCE "public"."permissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."permissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."permissions_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";

GRANT ALL ON TABLE "public"."road_events" TO "anon";
GRANT ALL ON TABLE "public"."road_events" TO "authenticated";
GRANT ALL ON TABLE "public"."road_events" TO "service_role";

GRANT ALL ON SEQUENCE "public"."road_event_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."road_event_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."road_event_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."road_event_lines" TO "anon";
GRANT ALL ON TABLE "public"."road_event_lines" TO "authenticated";
GRANT ALL ON TABLE "public"."road_event_lines" TO "service_role";

GRANT ALL ON SEQUENCE "public"."road_event_lines_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."road_event_lines_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."road_event_lines_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";

GRANT ALL ON SEQUENCE "public"."roles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."roles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."roles_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."seeed_co2_lorawan_uplinks" TO "anon";
GRANT ALL ON TABLE "public"."seeed_co2_lorawan_uplinks" TO "authenticated";
GRANT ALL ON TABLE "public"."seeed_co2_lorawan_uplinks" TO "service_role";

GRANT ALL ON SEQUENCE "public"."seeed_co2_lorawan_uplinks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."seeed_co2_lorawan_uplinks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."seeed_co2_lorawan_uplinks_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."seeed_sensecap_s2103_WaterLevel" TO "anon";
GRANT ALL ON TABLE "public"."seeed_sensecap_s2103_WaterLevel" TO "authenticated";
GRANT ALL ON TABLE "public"."seeed_sensecap_s2103_WaterLevel" TO "service_role";

GRANT ALL ON SEQUENCE "public"."seeed_sensecap_s2103_WaterLevel_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."seeed_sensecap_s2103_WaterLevel_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."seeed_sensecap_s2103_WaterLevel_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."seeed_sensecap_s2120" TO "anon";
GRANT ALL ON TABLE "public"."seeed_sensecap_s2120" TO "authenticated";
GRANT ALL ON TABLE "public"."seeed_sensecap_s2120" TO "service_role";

GRANT ALL ON SEQUENCE "public"."seeed_sensecap_s2120_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."seeed_sensecap_s2120_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."seeed_sensecap_s2120_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."sensors" TO "anon";
GRANT ALL ON TABLE "public"."sensors" TO "authenticated";
GRANT ALL ON TABLE "public"."sensors" TO "service_role";

GRANT ALL ON SEQUENCE "public"."sensors_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sensors_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sensors_id_seq" TO "service_role";

GRANT ALL ON TABLE "public"."stripe_customers" TO "anon";
GRANT ALL ON TABLE "public"."stripe_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_customers" TO "service_role";

GRANT ALL ON TABLE "public"."temp_humid_co2_alert_settings" TO "anon";
GRANT ALL ON TABLE "public"."temp_humid_co2_alert_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."temp_humid_co2_alert_settings" TO "service_role";

GRANT ALL ON SEQUENCE "public"."temp_humid_co2_alert_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."temp_humid_co2_alert_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."temp_humid_co2_alert_settings_id_seq" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";

RESET ALL;
