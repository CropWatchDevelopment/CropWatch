CREATE POLICY "Allow authenticated users to select cw_rule_criteria." 
ON public.cw_rule_criteria 
FOR SELECT 
TO authenticated 
USING (
  (SELECT auth.uid()) IN (
    SELECT profile_id FROM public.cw_rules WHERE "ruleGroupId" = public.cw_rule_criteria."ruleGroupId"
  )
);

CREATE POLICY "Allow authenticated users to insert cw_rule_criteria." 
ON public.cw_rule_criteria 
FOR INSERT 
TO authenticated 
WITH CHECK (
  (SELECT auth.uid()) IN (
    SELECT profile_id FROM public.cw_rules WHERE "ruleGroupId" = public.cw_rule_criteria."ruleGroupId"
  )
);

CREATE POLICY "Allow authenticated users to update cw_rule_criteria." 
ON public.cw_rule_criteria 
FOR UPDATE 
TO authenticated 
USING (
  (SELECT auth.uid()) IN (
    SELECT profile_id FROM public.cw_rules WHERE "ruleGroupId" = public.cw_rule_criteria."ruleGroupId"
  )
) 
WITH CHECK (
  (SELECT auth.uid()) IN (
    SELECT profile_id FROM public.cw_rules WHERE "ruleGroupId" = public.cw_rule_criteria."ruleGroupId"
  )
);

CREATE POLICY "Allow authenticated users to delete cw_rule_criteria." 
ON public.cw_rule_criteria 
FOR DELETE 
TO authenticated 
USING (
  (SELECT auth.uid()) IN (
    SELECT profile_id FROM public.cw_rules WHERE "ruleGroupId" = public.cw_rule_criteria."ruleGroupId"
  )
);