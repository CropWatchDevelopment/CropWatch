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
 * Service interface for rule operations
 */
export interface IRuleService {
	/**
	 * Get a rule by its ID
	 * @param id The rule ID
	 */
	getRuleById(id: number): Promise<Rule | null>;

	/**
	 * Get a rule with its criteria by group ID
	 * @param ruleGroupId The rule group ID
	 */
	getRuleWithCriteria(ruleGroupId: string): Promise<RuleWithCriteria | null>;

	/**
	 * Get rules by device EUI
	 * @param devEui The device EUI
	 */
	getRulesByDevice(devEui: string): Promise<Rule[]>;

	/**
	 * Get rules and rule criteria by device EUI
	 * @param devEui The device EUI
	 */
	getRulesAndCriteriaByDevice(devEui: string): Promise<RuleWithCriteria[]>;

	/**
	 * Get rules by profile ID
	 * @param profileId The profile ID
	 */
	getRulesByProfile(profileId: string): Promise<Rule[]>;

	/**
	 * Get rule criteria by rule group ID
	 * @param ruleGroupId The rule group ID
	 */
	getRuleCriteriaByGroup(ruleGroupId: string): Promise<RuleCriteria[]>;

	/**
	 * Create a new rule
	 * @param rule The rule to create
	 */
	createRule(rule: RuleInsert): Promise<Rule>;

	/**
	 * Create a new rule criteria
	 * @param criteria The rule criteria to create
	 */
	createRuleCriteria(criteria: RuleCriteriaInsert): Promise<RuleCriteria>;

	/**
	 * Create a complete rule with criteria
	 * @param rule The rule to create
	 * @param criteria Array of criteria to create for the rule
	 */
	createRuleWithCriteria(
		rule: RuleInsert,
		criteria: RuleCriteriaInsert[]
	): Promise<RuleWithCriteria>;

	/**
	 * Update an existing rule
	 * @param id The rule ID
	 * @param rule The rule with updated values
	 */
	updateRule(id: number, rule: RuleUpdate): Promise<Rule | null>;

	/**
	 * Update an existing rule criteria
	 * @param id The criteria ID
	 * @param criteria The criteria with updated values
	 */
	updateRuleCriteria(id: number, criteria: RuleCriteriaUpdate): Promise<RuleCriteria | null>;

	/**
	 * Delete a rule and its associated criteria
	 * @param id The rule ID
	 */
	deleteRule(id: number): Promise<boolean>;

	/**
	 * Delete a rule criteria
	 * @param id The criteria ID
	 */
	deleteRuleCriteria(id: number): Promise<boolean>;
}
