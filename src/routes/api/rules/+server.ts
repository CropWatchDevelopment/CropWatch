import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import CwRulesService from '$lib/services/CwRulesService';
import CwRuleCriteriaService from '$lib/services/CwRuleCriteriaService';
import type { Tables } from '$lib/types/database.types';
import { generateCustomUUIDv4 } from '$lib/utilities/generateCustomUUIDv4';

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
    if (!cwRules) {
        throw error(500, 'Error fetching locations');
    }

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

export const POST: RequestHandler = async ({ request, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }
    const newRule = await request.json();
    console.log(newRule);

    const ruleGroupId = generateCustomUUIDv4();

    //Create Rule before adding criteria
    const cwRulesService = new CwRulesService(supabase);
    const addedRule = await cwRulesService.add({
        action_recipient: newRule.action_recipient,
        babylon_notifier_type: newRule.babylon_notifier_type,
        dev_eui: newRule.dev_eui,
        is_triggered: false,
        name: newRule.name,
        trigger_count: 0,
        last_triggered: null,
        ruleGroupId,
        profile_id: session.user.id,
    });

    //Add Rule Criteria associated with this rule
    const cwRuleCriteriaService = new CwRuleCriteriaService(supabase);
    for (let criteria of newRule.cw_rule_criteria) {
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




export const PUT: RequestHandler = async ({ url, params, request, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }
    const ruleToEdit = await request.json();

    const devEui = params.dev_eui;
    if (!devEui) {
        throw error(400, 'No Dev_Eui provided');
    }

    const cwRulesService = new CwRulesService(supabase);
    const cwRuleCriteriaService = new CwRuleCriteriaService(supabase);

    const updateObject: Tables<'cw_rules'> = {
        action_recipient: ruleToEdit.action_recipient,
        babylon_notifier_type: ruleToEdit.babylon_notifier_type,
        dev_eui: devEui,
        is_triggered: ruleToEdit.is_triggered,
        name: ruleToEdit.name,
        trigger_count: ruleToEdit.trigger_count,
        ruleGroupId: ruleToEdit.ruleGroupId,
        id: ruleToEdit.id,
        profile_id: session.user.id,
    };

    const topLevelRuleResult = await cwRulesService.update(+ruleToEdit.id, updateObject);
    console.log(topLevelRuleResult);

    if (!topLevelRuleResult) {
        throw error(500, JSON.stringify(topLevelRuleResult));
    }

    //Update Rule Criteria associated with this rule
    const criteriaUpdateResults = [];
    for (let criteria of ruleToEdit.sub_criteria) {
        const updateCriteriaObject: Tables<'cw_rule_criteria'> = {
            ruleGroupId: ruleToEdit.ruleGroupId,
            subject: criteria.subject,
            trigger_value: criteria.trigger_value,
            reset_value: criteria.reset_value,
            operator: criteria.operator,
        };
        const updatedCriteria = await cwRuleCriteriaService.update(+criteria.id, updateCriteriaObject);
        criteriaUpdateResults.push(updatedCriteria);
    }
    if (criteriaUpdateResults.length !== ruleToEdit.sub_criteria.length) {
        throw error(500, JSON.stringify(criteriaUpdateResults));
    }


    return new Response(JSON.stringify({ message: "Rule Updated Successfully!" }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json'
        }
    });
}




export const DELETE: RequestHandler = async ({ url, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }

    const id = url.searchParams.get('id') ?? 0;

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