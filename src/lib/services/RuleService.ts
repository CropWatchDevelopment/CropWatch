import type { IRuleService } from '../interfaces/IRuleService';
import { RuleRepository } from '../repositories/RuleRepository';
import type {
	Rule,
	RuleInsert,
	RuleUpdate,
	RuleCriteria,
	RuleCriteriaInsert,
	RuleCriteriaUpdate,
	RuleWithCriteria
} from '../models/Rule';

/**
 * Implementation of RuleService
 * This service handles all business logic related to rules and criteria
 */
export class RuleService implements IRuleService {
	/**
	 * Constructor with RuleRepository dependency
	 */
	constructor(private ruleRepository: RuleRepository) {}

	/**
	 * Get a rule by its ID
	 * @param id The rule ID
	 */
	async getRuleById(id: number): Promise<Rule | null> {
		return this.ruleRepository.findById(id);
	}

	/**
	 * Get a rule with its criteria by group ID
	 * @param ruleGroupId The rule group ID
	 */
	async getRuleWithCriteria(ruleGroupId: string): Promise<RuleWithCriteria | null> {
		return this.ruleRepository.findRuleWithCriteria(ruleGroupId);
	}

	/**
	 * Get rules by device EUI
	 * @param devEui The device EUI
	 */
	async getRulesByDevice(devEui: string): Promise<Rule[]> {
		return this.ruleRepository.findByDevice(devEui);
	}

	/**
	 * Get rules with Criteria by device EUI
	 * @param devEui The device EUI
	 */
	getRulesAndCriteriaByDevice(devEui: string): Promise<RuleWithCriteria[]> {
		return this.ruleRepository.getRulesAndCriteriaByDevice(devEui);
	}

	/**
	 * Get rules by profile ID
	 * @param profileId The profile ID
	 */
	async getRulesByProfile(profileId: string): Promise<Rule[]> {
		return this.ruleRepository.findByProfile(profileId);
	}

	/**
	 * Get rule criteria by rule group ID
	 * @param ruleGroupId The rule group ID
	 */
	async getRuleCriteriaByGroup(ruleGroupId: string): Promise<RuleCriteria[]> {
		return this.ruleRepository.findCriteriaByGroup(ruleGroupId);
	}

	/**
	 * Create a new rule
	 * @param rule The rule to create
	 */
	async createRule(rule: RuleInsert): Promise<Rule> {
		return this.ruleRepository.create(rule);
	}

	/**
	 * Create a new rule criteria
	 * @param criteria The rule criteria to create
	 */
	async createRuleCriteria(criteria: RuleCriteriaInsert): Promise<RuleCriteria> {
		return this.ruleRepository.createCriteria(criteria);
	}

	/**
	 * Create a complete rule with criteria
	 * @param rule The rule to create
	 * @param criteria Array of criteria to create for the rule
	 */
	async createRuleWithCriteria(
		rule: RuleInsert,
		criteria: RuleCriteriaInsert[]
	): Promise<RuleWithCriteria> {
		// First create the rule
		const createdRule = await this.createRule(rule);

		// Then create all the criteria
		const createdCriteria: RuleCriteria[] = [];

		for (const criterion of criteria) {
			// Ensure all criteria reference the same rule group ID
			const criterionWithGroup = {
				...criterion,
				ruleGroupId: createdRule.ruleGroupId
			};

			const created = await this.createRuleCriteria(criterionWithGroup);
			createdCriteria.push(created);
		}

		// Return the combined result
		return {
			...createdRule,
			criteria: createdCriteria
		};
	}

	/**
	 * Update an existing rule
	 * @param id The rule ID
	 * @param rule The rule with updated values
	 */
	async updateRule(id: number, rule: RuleUpdate): Promise<Rule | null> {
		return this.ruleRepository.update(id, rule);
	}

	/**
	 * Update an existing rule criteria
	 * @param id The criteria ID
	 * @param criteria The criteria with updated values
	 */
	async updateRuleCriteria(id: number, criteria: RuleCriteriaUpdate): Promise<RuleCriteria | null> {
		return this.ruleRepository.updateCriteria(id, criteria);
	}

	/**
	 * Delete a rule and its associated criteria
	 * @param id The rule ID
	 */
	async deleteRule(id: number): Promise<boolean> {
		// First get the rule to find its group ID
		const rule = await this.getRuleById(id);

		if (!rule) {
			// Rule doesn't exist, so it's already effectively deleted
			return true;
		}

		// Delete all criteria associated with this rule
		await this.ruleRepository.deleteCriteriaByGroup(rule.ruleGroupId);

		// Then delete the rule itself
		return this.ruleRepository.delete(id);
	}

	/**
	 * Delete a rule criteria
	 * @param id The criteria ID
	 */
	async deleteRuleCriteria(id: number): Promise<boolean> {
		return this.ruleRepository.deleteCriteria(id);
	}
}
