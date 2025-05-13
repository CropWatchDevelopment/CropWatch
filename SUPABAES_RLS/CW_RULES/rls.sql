CREATE POLICY "Allow authenticated users to select cw_rules." 
ON public.cw_rules 
FOR SELECT 
TO authenticated 
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM public.cw_device_owners WHERE dev_eui = cw_rules.dev_eui
  )
);

CREATE POLICY "Allow authenticated users to insert cw_rules." 
ON public.cw_rules 
FOR INSERT 
TO authenticated 
WITH CHECK (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM public.cw_device_owners WHERE dev_eui = cw_rules.dev_eui
  )
);

CREATE POLICY "Allow authenticated users to update cw_rules." 
ON public.cw_rules 
FOR UPDATE 
TO authenticated 
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM public.cw_device_owners WHERE dev_eui = cw_rules.dev_eui
  )
) 
WITH CHECK (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM public.cw_device_owners WHERE dev_eui = cw_rules.dev_eui
  )
);

CREATE POLICY "Allow authenticated users to delete cw_rules." 
ON public.cw_rules 
FOR DELETE 
TO authenticated 
USING (
  (SELECT auth.uid()) IN (
    SELECT user_id FROM public.cw_device_owners WHERE dev_eui = cw_rules.dev_eui
  )
);