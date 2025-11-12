CREATE OR REPLACE FUNCTION public.fn_log_rule_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only handle rising edge: false -> true
  IF COALESCE(OLD.is_triggered, false) = false
     AND COALESCE(NEW.is_triggered, false) = true
  THEN
    -- -- Stamp and bump (commented out for now)
    -- NEW.last_triggered := (now() AT TIME ZONE 'utc');
    -- NEW.trigger_count  := COALESCE(OLD.trigger_count, 0) + 1;

    -- Insert log row if we have both NOT NULL values required by FK
    IF NEW.dev_eui IS NOT NULL AND NEW."ruleGroupId" IS NOT NULL THEN
      INSERT INTO public.cw_rule_triggered (dev_eui, rule_group_id)
      VALUES (NEW.dev_eui, NEW."ruleGroupId");
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_cw_rules_log_trigger ON public.cw_rules;

CREATE TRIGGER trg_cw_rules_log_trigger
BEFORE UPDATE OF is_triggered ON public.cw_rules
FOR EACH ROW
WHEN (COALESCE(OLD.is_triggered, false) IS DISTINCT FROM COALESCE(NEW.is_triggered, false))
EXECUTE FUNCTION public.fn_log_rule_trigger();