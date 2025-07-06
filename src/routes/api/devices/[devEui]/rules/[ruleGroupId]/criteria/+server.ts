import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { toRuleCriteriaDto } from '$lib/dtos/RuleDto';
import type { RuleCriteriaInsert } from '$lib/models/Rule';
import { RuleService } from '$lib/services/RuleService';
import { RuleRepository } from '$lib/repositories/RuleRepository';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';

/**
 * GET handler to retrieve all criteria for a rule group
 */
export const GET: RequestHandler = async ({ params, locals: { supabase } }) => {
	try {
		const ruleGroupId = params.ruleGroupId;

		if (!ruleGroupId) {
			return json({ error: 'Rule group ID is required' }, { status: 400 });
		}

		// Create rule service with direct instantiation
		const errorHandler = new ErrorHandlingService();
		const ruleRepo = new RuleRepository(supabase, errorHandler);
		const ruleService = new RuleService(ruleRepo);

		const criteria = await ruleService.getRuleCriteriaByGroup(ruleGroupId);

		return json({ criteria: criteria.map(toRuleCriteriaDto) });
	} catch (error) {
		console.error('Error retrieving rule criteria:', error);
		return json({ error: 'Failed to retrieve rule criteria' }, { status: 500 });
	}
};

/**
 * POST handler to add new criteria to an existing rule
 */
export const POST: RequestHandler = async ({ params, request, locals: { supabase } }) => {
	try {
		const ruleGroupId = params.ruleGroupId;
		const data = await request.json();

		if (!ruleGroupId) {
			return json({ error: 'Rule group ID is required' }, { status: 400 });
		}

		if (!data.criteria) {
			return json({ error: 'Criteria data is required' }, { status: 400 });
		}

		// Create rule service with direct instantiation
		const errorHandler = new ErrorHandlingService();
		const ruleRepo = new RuleRepository(supabase, errorHandler);
		const ruleService = new RuleService(ruleRepo);

		// Create new criteria with the rule group ID
		const criteriaData: RuleCriteriaInsert = {
			...data.criteria,
			ruleGroupId
		};

		const createdCriteria = await ruleService.createRuleCriteria(criteriaData);

		return json({ criteria: toRuleCriteriaDto(createdCriteria) }, { status: 201 });
	} catch (error) {
		console.error('Error creating rule criteria:', error);
		return json({ error: 'Failed to create rule criteria' }, { status: 500 });
	}
};
