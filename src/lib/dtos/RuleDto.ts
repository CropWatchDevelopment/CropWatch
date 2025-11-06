import type { Rule, RuleCriteria, RuleWithCriteria } from '../models/Rule';

/**
 * Data Transfer Object for rule criteria
 */
export interface RuleCriteriaDto {
	/**
	 * Unique identifier for the rule criteria
	 */
	id: number;

	/**
	 * The rule group this criteria belongs to
	 */
	ruleGroupId: string;

	/**
	 * The sensor type this criteria applies to
	 */
	sensorType: string;

	/**
	 * Comparison operator (e.g., '>', '<', '=')
	 */
	operator: string;

	/**
	 * Threshold value for comparison
	 */
	value: number;

	/**
	 * Optional unit of measurement
	 */
	unit?: string | null;

	/**
	 * Timestamp when the criteria was created
	 */
	createdAt: string;
}

/**
 * Data Transfer Object for rules
 */
export interface RuleDto {
	/**
	 * Unique identifier for the rule
	 */
	id: number;

	/**
	 * The rule group ID for grouping multiple criteria
	 */
	ruleGroupId: string;

	/**
	 * Name of the rule
	 */
	name: string;

	/**
	 * Description of the rule
	 */
	description?: string | null;

	/**
	 * Device EUI the rule applies to
	 */
	deviceEui?: string | null;

	/**
	 * Profile ID the rule belongs to
	 */
	profileId?: string | null;

	/**
	 * Whether the rule is currently active
	 */
	isActive: boolean;

	/**
	 * Severity level of the rule (e.g., 'low', 'medium', 'high')
	 */
	severity?: string | null;

	/**
	 * Action to take when rule is triggered
	 */
	actionType?: string | null;

	/**
	 * Notification message to send when triggered
	 */
	message?: string | null;

	/**
	 * Timestamp when the rule was created
	 */
	createdAt: string;
}

/**
 * Data Transfer Object for rules with their criteria
 */
export interface RuleWithCriteriaDto extends RuleDto {
	/**
	 * Array of criteria associated with this rule
	 */
	criteria: RuleCriteriaDto[];
}

/**
 * Convert rule criteria entity to DTO
 * @param criteria The rule criteria entity
 */
export function toRuleCriteriaDto(criteria: RuleCriteria): RuleCriteriaDto {
	return {
		id: criteria.id,
		ruleGroupId: criteria.ruleGroupId,
		sensorType: criteria.subject,
		operator: criteria.operator,
		value: criteria.trigger_value,
		unit: null,
		createdAt: criteria.created_at
	};
}

/**
 * Convert rule entity to DTO
 * @param rule The rule entity
 */
export function toRuleDto(rule: Rule): RuleDto {
	return {
		id: rule.id,
		ruleGroupId: rule.ruleGroupId,
		name: rule.name,
		description: null,
		deviceEui: rule.dev_eui ?? null,
		profileId: rule.profile_id ?? null,
		isActive: !rule.is_triggered,
		severity: null,
		actionType: rule.notifier_type != null ? String(rule.notifier_type) : null,
		message: null,
		createdAt: rule.created_at
	};
}

/**
 * Convert rule with criteria entity to DTO
 * @param ruleWithCriteria The rule with criteria entity
 */
export function toRuleWithCriteriaDto(ruleWithCriteria: RuleWithCriteria): RuleWithCriteriaDto {
	return {
		...toRuleDto(ruleWithCriteria),
		criteria: ruleWithCriteria.criteria.map(toRuleCriteriaDto)
	};
}

/**
 * Convert multiple rule entities to DTOs
 * @param rules Array of rule entities
 */
export function toRuleDtos(rules: Rule[]): RuleDto[] {
	return rules.map(toRuleDto);
}
