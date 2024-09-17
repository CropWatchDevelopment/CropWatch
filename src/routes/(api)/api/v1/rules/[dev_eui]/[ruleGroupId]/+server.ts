import CwRuleCriteriaService from "$lib/services/CwRuleCriteriaService";
import CwRulesService from "$lib/services/CwRulesService";
import type { Tables } from "$lib/types/supabaseSchema";
import { error, redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    return redirect(301, '/auth/unauthorized');
  }

  const devEui = params.dev_eui;
  if (!devEui) {
    throw error(400, 'No Dev_Eui provided');
  }

  const ruleGroupId = params.ruleGroupId;
  if (!ruleGroupId) {
    throw error(400, 'No ruleGroupId provided');
  }

  const cwRulesService = new CwRulesService(supabase);
  const cwRuleCriteriaService = new CwRuleCriteriaService(supabase);

  const cwRule = await cwRulesService.findByRuleGroupId(ruleGroupId);

  if (!cwRule) {
    throw error(404, 'No Rule Found');
  }

  const criteria = await cwRuleCriteriaService.getByRuleGroupId(cwRule?.ruleGroupId)
  cwRule.cw_rule_criteria = criteria;

  return new Response(JSON.stringify(cwRule), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
};


export const PUT: RequestHandler = async ({ url, params, request, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    return redirect(301, '/auth/unauthorized');
  }
  const submittedRule = await request.json();

  const devEui = params.dev_eui;
  if (!devEui) {
    throw error(400, 'No Dev_Eui provided');
  }

  const cwRulesService = new CwRulesService(supabase);
  const cwRuleCriteriaService = new CwRuleCriteriaService(supabase);

  let rule = await cwRulesService.findByRuleGroupId(submittedRule.ruleGroupId);

  if (!rule) {
    throw error(404, 'No Rule Found provided');
  }

  rule.action_recipient = submittedRule.action_recipient;
  rule.babylon_notifier_type = submittedRule.babylon_notifier_type;
  rule.dev_eui = devEui;
  rule.is_triggered = false;
  rule.name = submittedRule.name;
  rule.trigger_count = 0;

  const ruleResult = await cwRulesService.update(rule.id, rule);
  if (!ruleResult) {
    throw error(500, 'Failed to update top Level Rule');
  }

  submittedRule.cw_rule_criteria.forEach(async (criteria) => {
    let currentCriteria = await cwRuleCriteriaService.getById(criteria.id);
    if (currentCriteria) {
      currentCriteria.subject = criteria.subject;
      currentCriteria.operator = criteria.operator;
      currentCriteria.trigger_value = criteria.trigger_value;
      currentCriteria.reset_value = criteria.reset_value;
      const criteriaResult = await cwRuleCriteriaService.update(currentCriteria.id, currentCriteria);
      if (!criteriaResult) {
        throw error(500, `Failed to update criteria of ID ${currentCriteria.id}`);
      }
    }


  });

  return new Response(JSON.stringify(ruleResult), {
    headers: {
      'Content-Type': 'application/json'
    }
  });

}