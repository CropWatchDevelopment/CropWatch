import 'reflect-metadata';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Actions } from './$types';
import type {
	RuleUpdate,
	RuleInsert,
	RuleCriteriaInsert,
	RuleCriteriaUpdate
} from '$lib/models/Rule';
import { SessionService } from '$lib/services/SessionService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { RuleRepository } from '$lib/repositories/RuleRepository';
import { NotifierTypeRepository } from '$lib/repositories/NotifierTypeRepository';
import { RuleService } from '$lib/services/RuleService';

/**
 * Load the device notification rules and notifier types.
 * User session, `devEui` and `locationId` are already validated in the layout server load.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const { devEui } = params;

	try {
		// Create SessionService with per-request Supabase client
		const sessionService = new SessionService(locals.supabase);
		const sessionResult = await sessionService.getSafeSession();

		// Get error handler from container
		const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);

		// Create repositories with per-request Supabase client
		const ruleRepo = new RuleRepository(locals.supabase, errorHandler);
		const notifierTypeRepo = new NotifierTypeRepository(locals.supabase, errorHandler);

		// Create services with repositories
		const ruleService = new RuleService(ruleRepo);

		// Get rules for the device
		// Don’t `await` the promise, stream the data instead
		const rules = ruleService.getRulesByDevice(devEui);

		// Get notifier types
		// Don’t `await` the promise, stream the data instead
		const notifierTypes = notifierTypeRepo.findAll();

		return {
			session: sessionResult.session,
			user: sessionResult.user,
			rules, // streamed
			notifierTypes // streamed
		};
	} catch (err) {
		console.error('Error loading rules data:', err);
		throw error(500, 'Failed to load rules data');
	}
};

/**
 * Actions for device rule management
 */
export const actions: Actions = {
	/**
	 * Create a new rule with criteria
	 */
	createRule: async ({ request, params, locals }) => {
		try {
			const devEui = params.devEui;
			const data = await request.formData();

			// Create SessionService with per-request Supabase client
			const sessionService = new SessionService(locals.supabase);
			const sessionResult = await sessionService.getSafeSession();

			if (!sessionResult?.session || !sessionResult?.user) {
				return { success: false, error: 'Authentication required' };
			}

			if (!devEui) {
				throw error(400, 'Device EUI is required');
			}

			// Extract rule data
			const name = data.get('name') as string;
			const action_recipient = data.get('action_recipient') as string;
			const notifier_type = +(data.get('notifier_type') || (0 as number));

			// Validate required fields
			if (!name) {
				return { success: false, error: 'Rule name is required' };
			}

			// Generate a unique rule group ID
			const ruleGroupId = `rule-${devEui}-${Date.now()}`;

			// Prepare rule data with the device EUI
			const ruleData: RuleInsert = {
				name,
				dev_eui: devEui,
				ruleGroupId,
				action_recipient,
				notifier_type,
				profile_id: sessionResult.user?.id || ''
			};

			// Extract criteria data - assuming a JSON string is submitted
			const criteriaDataJson = data.get('criteria') as string;
			if (!criteriaDataJson) {
				return { success: false, error: 'Rule criteria data is required' };
			}

			let criteriaArray: Array<{
				subject: string;
				operator: string;
				trigger_value: number;
				reset_value: number;
			}> = [];

			try {
				criteriaArray = JSON.parse(criteriaDataJson);
				if (!Array.isArray(criteriaArray) || criteriaArray.length === 0) {
					return { success: false, error: 'At least one rule criteria is required' };
				}
			} catch (err) {
				return { success: false, error: 'Invalid criteria data format' };
			}

			// Convert criteria array to the expected format
			const criteriaData: RuleCriteriaInsert[] = criteriaArray.map((item) => ({
				subject: item.subject,
				operator: item.operator,
				trigger_value: item.trigger_value,
				reset_value: item.reset_value,
				ruleGroupId
			}));

			// Get error handler from container
			const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);

			// Create repository with per-request Supabase client
			const ruleRepo = new RuleRepository(locals.supabase, errorHandler);

			// Create rule service with repository
			const ruleService = new RuleService(ruleRepo);

			// Create rule with its criteria
			await ruleService.createRuleWithCriteria(ruleData, criteriaData);

			return { success: true };
		} catch (err) {
			console.error('Error creating rule:', err);
			return { success: false, error: 'Failed to create rule' };
		}
	},

	/**
	 * Update an existing rule
	 */
	updateRule: async ({ request, params, locals }) => {
		try {
			const data = await request.formData();
			const ruleId = parseInt(data.get('ruleId') as string);

			if (isNaN(ruleId)) {
				return { success: false, error: 'Invalid rule ID' };
			}

			// Extract rule data
			const name = data.get('name') as string;
			const action_recipient = data.get('action_recipient') as string;
			const notifier_type = +(data.get('notifier_type') || (0 as number));

			// Validate required fields
			if (!name) {
				return { success: false, error: 'Rule name is required' };
			}

			// Prepare rule update data
			const ruleData: RuleUpdate = {
				name,
				action_recipient,
				notifier_type
			};

			// Get error handler from container
			const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);

			// Create repository with per-request Supabase client
			const ruleRepo = new RuleRepository(locals.supabase, errorHandler);

			// Create rule service with repository
			const ruleService = new RuleService(ruleRepo);

			// Update rule
			const updatedRule = await ruleService.updateRule(ruleId, ruleData);
			if (!updatedRule) {
				return { success: false, error: 'Rule not found' };
			}

			// Extract criteria data - assuming a JSON string is submitted with array of criteria
			const criteriaDataJson = data.get('criteria') as string;
			const deletedCriteriaIdsJson = data.get('deletedCriteriaIds') as string;

			// Process deleted criteria IDs if provided
			if (deletedCriteriaIdsJson) {
				try {
					const deletedIds: number[] = JSON.parse(deletedCriteriaIdsJson);
					for (const id of deletedIds) {
						const deleted = await ruleService.deleteRuleCriteria(id);
						if (!deleted) {
							console.warn(`Failed to delete criteria with ID: ${id}`);
						}
					}
				} catch (err) {
					console.error('Error parsing deleted criteria IDs:', err);
					// Continue with the update even if deleting fails
				}
			}

			// Validate and process criteria data
			if (!criteriaDataJson) {
				return { success: false, error: 'Rule criteria data is required' };
			}

			let criteriaArray: Array<{
				id?: number;
				subject: string;
				operator: string;
				trigger_value: number;
				reset_value: number;
			}> = [];

			try {
				criteriaArray = JSON.parse(criteriaDataJson);
				if (!Array.isArray(criteriaArray) || criteriaArray.length === 0) {
					return { success: false, error: 'At least one rule criteria is required' };
				}
			} catch (err) {
				return { success: false, error: 'Invalid criteria data format' };
			}

			// Process each criteria item
			for (const item of criteriaArray) {
				// Validate the criteria item
				if (
					!item.subject ||
					!item.operator ||
					typeof item.trigger_value !== 'number' ||
					typeof item.reset_value !== 'number'
				) {
					return { success: false, error: 'Invalid criteria data' };
				}

				// Prepare criteria data
				const criteriaData: RuleCriteriaUpdate = {
					subject: item.subject,
					operator: item.operator,
					trigger_value: item.trigger_value,
					reset_value: item.reset_value
				};

				if (item.id) {
					// Update existing criteria
					const updatedCriteria = await ruleService.updateRuleCriteria(item.id, criteriaData);
					if (!updatedCriteria) {
						return { success: false, error: `Failed to update rule criteria with ID: ${item.id}` };
					}
				} else {
					// Create new criteria for this rule
					const newCriteriaInsert: RuleCriteriaInsert = {
						...criteriaData,
						ruleGroupId: updatedRule.ruleGroupId
					};
					const createdCriteria = await ruleService.createRuleCriteria(newCriteriaInsert);
					if (!createdCriteria) {
						return { success: false, error: 'Failed to create new rule criteria' };
					}
				}
			}

			return { success: true };
		} catch (err) {
			console.error('Error updating rule:', err);
			return { success: false, error: 'Failed to update rule' };
		}
	},

	/**
	 * Delete a rule
	 */
	deleteRule: async ({ request, locals }) => {
		try {
			const data = await request.formData();
			const ruleId = parseInt(data.get('ruleId') as string);

			if (isNaN(ruleId)) {
				return { success: false, error: 'Invalid rule ID' };
			}

			// Get error handler from container
			const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);

			// Create repository with per-request Supabase client
			const ruleRepo = new RuleRepository(locals.supabase, errorHandler);

			// Create rule service with repository
			const ruleService = new RuleService(ruleRepo);

			// Delete the rule
			const deleted = await ruleService.deleteRule(ruleId);

			if (!deleted) {
				return { success: false, error: 'Failed to delete rule' };
			}

			return { success: true };
		} catch (err) {
			console.error('Error deleting rule:', err);
			return { success: false, error: 'Failed to delete rule' };
		}
	}
};
