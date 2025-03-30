
CREATE OR REPLACE PROCEDURE public.get_hloc_data(
    IN start_time timestamp without time zone,
    IN end_time timestamp without time zone,
    IN time_interval text,
    IN table_name text,
    IN column_name text,
    IN dev_eui text
)
LANGUAGE plpgsql
AS $procedure$
DECLARE
    sql text;
BEGIN
    sql := format($f$
WITH grouped AS (
    SELECT
        date_trunc(%L, created_at) AS interval,
        MIN(created_at) AS min_created,
        MAX(created_at) AS max_created,
        MIN(%I) AS low,
        MAX(%I) AS high
    FROM %I
    WHERE created_at >= $1 AND created_at <= $2 AND dev_eui = $3
    GROUP BY date_trunc(%L, created_at)
)
SELECT
    g.interval,
    g.low,
    g.high,
    -- Get the open value using the earliest created_at in each group:
    (SELECT %I FROM %I WHERE created_at = g.min_created AND dev_eui = $3 LIMIT 1) AS open,
    -- Get the close value using the latest created_at in each group:
    (SELECT %I FROM %I WHERE created_at = g.max_created AND dev_eui = $3 LIMIT 1) AS close
FROM grouped g
ORDER BY g.interval;
$f$, 
        time_interval,   -- For date_trunc in CTE SELECT and GROUP BY
        column_name,     -- For MIN(%I)
        column_name,     -- For MAX(%I)
        table_name,      -- For table name in CTE FROM
        time_interval,   -- For date_trunc in GROUP BY
        column_name,     -- For open subquery SELECT
        table_name,      -- For open subquery FROM
        column_name,     -- For close subquery SELECT
        table_name       -- For close subquery FROM
    );

    EXECUTE sql USING start_time, end_time, dev_eui;
END;
$procedure$;