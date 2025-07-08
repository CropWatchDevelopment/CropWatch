import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { RuleService } from '$lib/services/RuleService';
import { RuleRepository } from '$lib/repositories/RuleRepository';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { toRuleDtos, toRuleWithCriteriaDto } from '$lib/dtos/RuleDto';
import type { RuleInsert, RuleCriteriaInsert } from '$lib/models/Rule';

/**
 * GET handler to retrieve rules for a specific device
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const devEui = params.devEui;

		if (!devEui) {
			return json({ error: 'Device EUI is required' }, { status: 400 });
		}

		// Create services directly
		const errorHandler = new ErrorHandlingService();
		const ruleRepo = new RuleRepository(locals.supabase, errorHandler);
		const ruleService = new RuleService(ruleRepo);

		const rules = await ruleService.getRulesByDevice(devEui);

		return json({ rules: toRuleDtos(rules) });
	} catch (error) {
		console.error('Error retrieving rules for device:', error);
		return json({ error: 'Failed to retrieve rules' }, { status: 500 });
	}
};

/**
 * POST handler to create a new rule for a device
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	try {
		const devEui = params.devEui;
		const data = await request.json();

		if (!devEui) {
			return json({ error: 'Device EUI is required' }, { status: 400 });
		}

		if (!data.rule || !data.criteria || !Array.isArray(data.criteria)) {
			return json({ error: 'Rule and criteria array are required' }, { status: 400 });
		}

		// Prepare rule data with the device EUI
		const ruleData: RuleInsert = {
			...data.rule,
			dev_eui: devEui,
			ruleGroupId: `rule-${devEui}-${Date.now()}` // Generate a unique rule group ID
		};

		// Prepare criteria data
		const criteriaData: RuleCriteriaInsert[] = data.criteria;

		// Create services directly
		const errorHandler = new ErrorHandlingService();
		const ruleRepo = new RuleRepository(locals.supabase, errorHandler);
		const ruleService = new RuleService(ruleRepo);

		// Create rule with its criteria
		const createdRule = await ruleService.createRuleWithCriteria(ruleData, criteriaData);

		return json({ rule: toRuleWithCriteriaDto(createdRule) }, { status: 201 });
	} catch (error) {
		console.error('Error creating rule for device:', error);
		return json({ error: 'Failed to create rule' }, { status: 500 });
	}
};
