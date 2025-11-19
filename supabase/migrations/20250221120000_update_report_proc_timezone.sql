-- 1) Create the function
CREATE OR REPLACE FUNCTION get_filtered_device_report_data_multi(
    p_dev_id             TEXT,
    p_start_time         TIMESTAMPTZ,
    p_end_time           TIMESTAMPTZ,
    p_interval_minutes   INTEGER,
    p_columns            TEXT[],             -- e.g. ['temperature_c','humidity']
    p_ops                TEXT[],             -- e.g. ['>','BETWEEN']
    p_mins               DOUBLE PRECISION[], -- e.g. [-22, 55]
    p_maxs               DOUBLE PRECISION[]  -- e.g. [NULL, 65]
    p_timezone           TEXT DEFAULT 'UTC'
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
AS $function$
DECLARE
    v_target_table   TEXT;
    candidate_cols   TEXT[];
    final_cols       TEXT[] := ARRAY[]::TEXT[];
    col              TEXT;
    has_nonnull      BOOLEAN;
    column_list      TEXT;
    i                INT;
    cond_clauses     TEXT[] := ARRAY[]::TEXT[];
    exceptions_where TEXT;
    sql              TEXT;
    excluded_cols    TEXT[] := ARRAY[
      'dev_eui','smoke_detected','vape_detected','battery_level','is_simulated'
    ];
BEGIN
  -- Ensure timestamptz fields respect the caller's timezone when converted to text/JSON
  PERFORM set_config('TimeZone', COALESCE(NULLIF(p_timezone, ''), 'UTC'), true);

  -- 1) lookup table name
  SELECT cdt.data_table_v2
    INTO v_target_table
    FROM cw_devices dev
    JOIN cw_device_type cdt ON dev."type" = cdt.id
   WHERE dev.dev_eui = p_dev_id;
  IF v_target_table IS NULL THEN
    RAISE EXCEPTION 'No data table for dev_eui=%', p_dev_id;
  END IF;

  -- 2) gather actual columns
  SELECT array_agg(column_name)
    INTO candidate_cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name   = v_target_table
     AND column_name <> ALL(excluded_cols);
  IF candidate_cols IS NULL THEN
    RAISE EXCEPTION 'No columns in %', v_target_table;
  END IF;

  -- 3) filter to only columns with data in the window
  FOREACH col IN ARRAY candidate_cols LOOP
    EXECUTE format(
      'SELECT EXISTS(SELECT 1 FROM %I WHERE dev_eui = %L AND created_at BETWEEN %L AND %L AND %I IS NOT NULL)',
       v_target_table, p_dev_id, p_start_time, p_end_time, col
    ) INTO has_nonnull;
    IF has_nonnull THEN
      final_cols := final_cols || quote_ident(col);
    END IF;
  END LOOP;
  IF array_length(final_cols,1) IS NULL THEN
    RAISE EXCEPTION 'No populated columns in %', v_target_table;
  END IF;
  column_list := array_to_string(final_cols, ', ');

  -- 4) build exception clauses from the four parallel arrays
  IF NOT (
       array_length(p_columns,1) = array_length(p_ops,1)
    AND array_length(p_columns,1) = array_length(p_mins,1)
    AND array_length(p_columns,1) = array_length(p_maxs,1)
  ) THEN
    RAISE EXCEPTION 'Array lengths for columns/ops/mins/maxs must match';
  END IF;

  FOR i IN 1 .. array_length(p_columns,1) LOOP
    IF p_ops[i] ILIKE 'between' AND p_maxs[i] IS NOT NULL THEN
      cond_clauses := cond_clauses ||
        format('%I BETWEEN %L AND %L', p_columns[i], p_mins[i], p_maxs[i]);
    ELSE
      cond_clauses := cond_clauses ||
        format('%I %s %L', p_columns[i], p_ops[i], p_mins[i]);
    END IF;
  END LOOP;
  exceptions_where := array_to_string(cond_clauses, ' OR ');

  -- 5) assemble & run the dynamic SQL
  sql := format($query$
    WITH filtered AS (
      SELECT %s
        FROM %I
       WHERE dev_eui = %L
         AND created_at BETWEEN %L AND %L
    ),
    sampled AS (
      SELECT *,
             FLOOR(
               EXTRACT(EPOCH FROM created_at - %L::timestamptz)
               / (%s * 60)
             ) AS bucket
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
       WHERE %s
    )
    SELECT to_jsonb(x)
      FROM (
        SELECT * FROM dedup
        UNION
        SELECT * FROM exceptions
      ) x
     ORDER BY created_at
  $query$,
    column_list,        -- for filtered
    v_target_table,
    p_dev_id, p_start_time, p_end_time,
    p_start_time,       -- for bucket calc
    p_interval_minutes,
    column_list,        -- for dedup
    column_list,        -- for exceptions
    exceptions_where    -- combined WHERE clause
  );

  RETURN QUERY EXECUTE sql;
END;
$function$;