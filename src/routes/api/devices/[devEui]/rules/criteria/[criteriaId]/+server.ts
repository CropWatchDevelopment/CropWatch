import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { RuleService } from '$lib/services/RuleService';
import { RuleRepository } from '$lib/repositories/RuleRepository';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { toRuleCriteriaDto } from '$lib/dtos/RuleDto';
import type { RuleCriteriaUpdate } from '$lib/models/Rule';

/**
 * PUT handler to update a specific rule criteria
 */
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		const criteriaId = parseInt(params.criteriaId);
		const data = await request.json();

		if (isNaN(criteriaId)) {
			return json({ error: 'Invalid criteria ID' }, { status: 400 });
		}

		if (!data.criteria) {
			return json({ error: 'Criteria data is required' }, { status: 400 });
		}

		// Create services directly
		const errorHandler = new ErrorHandlingService();
		const ruleRepo = new RuleRepository(locals.supabase, errorHandler);
		const ruleService = new RuleService(ruleRepo);

		// Update criteria
		const criteriaData: RuleCriteriaUpdate = data.criteria;
		const updatedCriteria = await ruleService.updateRuleCriteria(criteriaId, criteriaData);

		if (!updatedCriteria) {
			return json({ error: 'Criteria not found' }, { status: 404 });
		}

		return json({ criteria: toRuleCriteriaDto(updatedCriteria) });
	} catch (error) {
		console.error('Error updating rule criteria:', error);
		return json({ error: 'Failed to update rule criteria' }, { status: 500 });
	}
};

/**
 * DELETE handler to delete a specific rule criteria
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const criteriaId = parseInt(params.criteriaId);

		if (isNaN(criteriaId)) {
			return json({ error: 'Invalid criteria ID' }, { status: 400 });
		}

		// Create services directly
		const errorHandler = new ErrorHandlingService();
		const ruleRepo = new RuleRepository(locals.supabase, errorHandler);
		const ruleService = new RuleService(ruleRepo);

		const deleted = await ruleService.deleteRuleCriteria(criteriaId);

		if (!deleted) {
			return json({ error: 'Failed to delete criteria' }, { status: 500 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting rule criteria:', error);
		return json({ error: 'Failed to delete rule criteria' }, { status: 500 });
	}
};
