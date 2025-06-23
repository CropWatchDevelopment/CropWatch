CREATE OR REPLACE FUNCTION get_filtered_device_report_data(
    dev_id TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    interval_minutes INTEGER,
    target_column TEXT,
    compare_operator TEXT,
    compare_value_min DOUBLE PRECISION,
    compare_value_max DOUBLE PRECISION DEFAULT NULL
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    target_table TEXT;
    sql TEXT;
    column_list TEXT;
BEGIN
    -- 1. Get table name from device type
    SELECT cdt.data_table_v2
    INTO target_table
    FROM cw_devices dev
    JOIN cw_device_type cdt ON dev."type" = cdt.id
    WHERE dev.dev_eui = dev_id;

    -- 2. Build column list dynamically
    SELECT string_agg(quote_ident(column_name), ', ')
    INTO column_list
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = target_table
      AND column_name NOT IN ('bucket');  -- Exclude any system fields

    IF column_list IS NULL THEN
        RAISE EXCEPTION 'Could not determine column list for table %', target_table;
    END IF;

    -- 3. Construct the SQL dynamically
    sql := format($f$
        WITH filtered AS (
            SELECT %s
            FROM %I
            WHERE dev_eui = %L
              AND created_at BETWEEN %L AND %L
        ),
        sampled AS (
            SELECT *,
                   FLOOR(EXTRACT(EPOCH FROM created_at - %L::timestamp) / (%s * 60)) AS bucket
            FROM filtered
        ),
        dedup AS (
            SELECT DISTINCT ON (bucket) %s
            FROM sampled
            ORDER BY bucket, created_at
        ),
        exceptions AS (
            SELECT %s
            FROM filtered
            WHERE %I %s %s
        )
        SELECT to_jsonb(x)
        FROM (
            SELECT * FROM dedup
            UNION
            SELECT * FROM exceptions
        ) x
        ORDER BY created_at
    $f$,
        column_list,
        target_table,
        dev_id, start_time, end_time,
        start_time,
        interval_minutes,
        column_list,
        column_list,
        target_column,
        compare_operator,
        CASE
            WHEN compare_operator ILIKE 'between' THEN format('%L AND %L', compare_value_min, compare_value_max)
            ELSE format('%L', compare_value_min)
        END
    );

    -- Optional debug
    RAISE NOTICE 'Executing SQL: %', sql;

    -- 4. Execute
    RETURN QUERY EXECUTE sql;
END $$;