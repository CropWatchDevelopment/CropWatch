import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import type { Tables } from '$lib/types/supabaseSchema';
import CwRulesService from '$lib/services/CwRulesService';
import { generateCustomUUIDv4 } from '$lib/components/ui/utilities/generateCustomUUIDv4';
import CwRuleCriteriaService from '$lib/services/CwRuleCriteriaService';

type cwRules = Tables<'cw_rules'>;


export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    return redirect(301, '/auth/unauthorized');
  }

  const devEui = params.dev_eui;
  if (!devEui) {
    throw error(400, 'No Dev_Eui provided');
  }

  const cwRulesService = new CwRulesService(supabase);
  const cwRuleCriteriaService = new CwRuleCriteriaService(supabase);

  const cwRules = await cwRulesService.getByDevEui(devEui);
  for (let rule of cwRules) {
    const criteria = await cwRuleCriteriaService.getAll(rule.ruleGroupId);
    rule['criteria'] = criteria;
  }


  if (!cwRules) {
    throw error(500, 'Error fetching locations');
  }

  return new Response(JSON.stringify(cwRules), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

export const POST: RequestHandler = async ({ url, params, request, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    return redirect(301, '/auth/unauthorized');
  }
  const newRule = await request.json();
  console.log(newRule);

  const devEui = params.dev_eui;
  if (!devEui) {
    throw error(400, 'No Dev_Eui provided');
  }

  const ruleGroupId = generateCustomUUIDv4();

  //Create Rule before adding criteria
  const cwRulesService = new CwRulesService(supabase);
  const addedRule = await cwRulesService.add({
    action_recipient: newRule.action_recipient,
    babylon_notifier_type: newRule.babylon_notifier_type,
    dev_eui: devEui,
    is_triggered: false,
    name: newRule.name,
    trigger_count: 0,
    ruleGroupId,
    profile_id: session.user.id,
  });

  //Add Rule Criteria associated with this rule
  const cwRuleCriteriaService = new CwRuleCriteriaService(supabase);
  for (let criteria of newRule.sub_criteria) {
    const insertedCriterial = await cwRuleCriteriaService.add({
      ruleGroupId,
      subject: criteria.subject,
      trigger_value: criteria.trigger_value,
      reset_value: criteria.reset_value,
      operator: criteria.operator,
    });
    if (!insertedCriterial) {
      throw error(500, JSON.stringify(insertedCriterial));
    }
  }

  return new Response(JSON.stringify(addedRule), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

export const DELETE: RequestHandler = async ({ url, params, request, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    return redirect(301, '/auth/unauthorized');
  }

  const id = url.searchParams.get('id') ?? 0;
  const devEui = params.dev_eui;

  if (!devEui) {
    throw error(400, 'No Dev_Eui provided');
  }
  if (!id) {
    throw error(400, 'No ID provided');
  }

  const cwRulesService = new CwRulesService(supabase);
  const removed = await cwRulesService.remove(+id);

  if (!removed) {
    throw error(500, JSON.stringify(removed));
  }

  return new Response(JSON.stringify(removed), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });

}