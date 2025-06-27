CREATE OR REPLACE FUNCTION get_report_data_for_device(
  input_dev_eui           TEXT,
  input_start             TIMESTAMPTZ,
  input_end               TIMESTAMPTZ,
  input_timezone          TEXT    DEFAULT 'UTC',
  input_interval_minutes  INT     DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  data_table     TEXT;
  data_query     TEXT;
  raw_data       JSONB := '[]';
  filtered_data  JSONB := '[]';
  report_data    JSONB := '[]';
BEGIN
  -- Step 1: find the device's data table
  SELECT cdt.data_table_v2
    INTO data_table
    FROM cw_devices cd
    JOIN cw_device_type cdt
      ON cdt.id = cd."type"
   WHERE cd.dev_eui = input_dev_eui;

  IF data_table IS NULL THEN
    RAISE EXCEPTION 'No data table found for device %', input_dev_eui;
  END IF;

  -- Step 2: sample every X minutes OR include alert‐triggering rows
  data_query := format($sql$
    SELECT jsonb_agg(
      to_jsonb(t)
      || jsonb_build_object(
           'created_at',
           to_char(
             t.created_at AT TIME ZONE 'UTC'
                            AT TIME ZONE $1,
             'YYYY-MM-DD"T"HH24:MI:SSOF'
           )
         )
      - 'created_at'
    )
    FROM %I t
    WHERE
      t.dev_eui        = $4
      AND t.is_simulated = false
      AND t.created_at  BETWEEN $2 AND $3
      AND (
           -- (a) falls exactly on an interval boundary from input_start
           ((EXTRACT(EPOCH FROM (t.created_at - $2)) / 60)::INT %% $5) = 0

           OR

           -- (b) matches one of the report's alert thresholds
           EXISTS (
             SELECT 1
             FROM report_alert_points rap
             WHERE rap.report_id = (
                     SELECT r.report_id
                       FROM reports r
                      WHERE r.dev_eui = $4
                      LIMIT 1
                   )
               AND (
                     (rap.operator = '>'  AND t.temperature_c >  rap.value)
                  OR (rap.operator = '<'  AND t.temperature_c <  rap.value)
                  OR (rap.operator = '>=' AND t.temperature_c >= rap.value)
                  OR (rap.operator = '<=' AND t.temperature_c <= rap.value)
                  OR (rap.operator = '='  AND t.temperature_c =  rap.value)
               )
           )
      )
  $sql$, data_table);

  EXECUTE data_query
    INTO raw_data
    USING input_timezone, input_start, input_end, input_dev_eui, input_interval_minutes;

  raw_data := COALESCE(raw_data, '[]'::jsonb);

  -- Step 3: strip out nulls and unwanted keys (including is_simulated)
  filtered_data := (
    SELECT COALESCE(
      jsonb_agg(
        ( jsonb_strip_nulls(elem)
          - ARRAY[
              'battery_level',
              'smoke_detected',
              'vape_detected',
              'is_simulated'
            ]
        )
      ),
      '[]'::jsonb
    )
    FROM jsonb_array_elements(raw_data) AS t(elem)
  );

  -- Step 4: assemble report_info as before
  SELECT jsonb_agg(
    jsonb_strip_nulls(to_jsonb(r)
    || jsonb_build_object(
         'alert_points',
         ( SELECT jsonb_agg(jsonb_strip_nulls(to_jsonb(rap)))
           FROM report_alert_points rap
           WHERE rap.report_id = r.report_id
         ),
         'recipients',
         ( SELECT jsonb_agg(
             jsonb_strip_nulls(to_jsonb(rr)
             || jsonb_build_object(
                  'recipient_name',       p.full_name,
                  'email',                p.email,
                  'communication_method', cm.name
                )
             )
           )
           FROM report_recipients rr
           JOIN profiles p
             ON p.id = rr.profile_id
           JOIN communication_methods cm
             ON cm.communication_method_id = rr.communication_method
          WHERE rr.report_id = r.report_id
         ),
         'schedules',
         ( SELECT jsonb_agg(jsonb_strip_nulls(to_jsonb(s)))
           FROM report_user_schedule s
           WHERE s.report_id = r.report_id
         )
       )
    )
  )
    INTO report_data
    FROM reports r
   WHERE r.dev_eui = input_dev_eui;

  RETURN jsonb_build_object(
    'device_data',  COALESCE(filtered_data, '[]'::jsonb),
    'report_info',  COALESCE(report_data,  '[]'::jsonb)
  );
END;
$$;



-- Example usage:

SELECT get_report_data_for_device(
  '373632336F32840A',
  '2025-06-01T00:00:00+09',
  '2025-06-09T00:00:00+09',
  'Asia/Tokyo',
  30
) AS report_json;



