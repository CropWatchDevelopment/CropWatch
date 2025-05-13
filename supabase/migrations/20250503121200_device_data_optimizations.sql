-- Function to get all column names for a specific table
CREATE OR REPLACE FUNCTION public.get_table_columns(table_name text)
RETURNS text[] AS $$
DECLARE
  columns text[];
BEGIN
  SELECT array_agg(column_name::text) INTO columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = $1;
  
  RETURN columns;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get latest device data with specified columns for performance
CREATE OR REPLACE FUNCTION public.get_latest_device_data(
  p_table_name text,
  p_dev_eui text,
  p_columns text DEFAULT '*'
)
RETURNS SETOF json AS $$
DECLARE
  query text;
BEGIN
  -- Construct a query with the specified columns
  query := format(
    'SELECT %s FROM %I WHERE dev_eui = %L ORDER BY created_at DESC LIMIT 1',
    p_columns,
    p_table_name,
    p_dev_eui
  );
  
  -- Return the result of the query as JSON
  RETURN QUERY EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get device data within a date range with pagination and column selection
CREATE OR REPLACE FUNCTION public.get_device_data_by_date_range(
  p_table_name text,
  p_dev_eui text,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone,
  p_limit integer DEFAULT 50,
  p_columns text DEFAULT '*'
)
RETURNS SETOF json AS $$
DECLARE
  query text;
BEGIN
  -- Construct a query with the specified columns and date range
  query := format(
    'SELECT %s FROM %I 
    WHERE dev_eui = %L 
    AND created_at >= %L 
    AND created_at <= %L 
    ORDER BY created_at DESC 
    LIMIT %s',
    p_columns,
    p_table_name,
    p_dev_eui,
    p_start_date,
    p_end_date,
    p_limit
  );
  
  -- Return the result of the query as JSON
  RETURN QUERY EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add an index to improve performance on frequently queried large tables if they don't exist
DO $$
BEGIN
  -- Check if index exists on cw_air_data
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'cw_air_data' AND indexname = 'cw_air_data_dev_eui_created_at_idx'
  ) THEN
    CREATE INDEX cw_air_data_dev_eui_created_at_idx ON public.cw_air_data(dev_eui, created_at DESC);
  END IF;
  
  -- Check if index exists on cw_air_data_hpy
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'cw_air_data_hpy' AND indexname = 'cw_air_data_hpy_dev_eui_created_at_idx'
  ) THEN
    CREATE INDEX cw_air_data_hpy_dev_eui_created_at_idx ON public.cw_air_data_hpy(dev_eui, created_at DESC);
  END IF;
  
  -- Check if index exists on cw_soil_data
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'cw_soil_data' AND indexname = 'cw_soil_data_dev_eui_created_at_idx'
  ) THEN
    CREATE INDEX cw_soil_data_dev_eui_created_at_idx ON public.cw_soil_data(dev_eui, created_at DESC);
  END IF;
  
  -- Check if index exists on cw_soil_data_hpy
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'cw_soil_data_hpy' AND indexname = 'cw_soil_data_hpy_dev_eui_created_at_idx'
  ) THEN
    CREATE INDEX cw_soil_data_hpy_dev_eui_created_at_idx ON public.cw_soil_data_hpy(dev_eui, created_at DESC);
  END IF;
END$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_table_columns(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_latest_device_data(text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_device_data_by_date_range(text, text, timestamp with time zone, timestamp with time zone, integer, text) TO anon, authenticated, service_role;