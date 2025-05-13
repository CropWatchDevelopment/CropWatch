import type { Database } from '../../../database.types';

/**
 * Rule model representing rules from the cw_rules table
 */
export interface Rule {
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
   * Device EUI the rule applies to
   */
  dev_eui?: string | null;
  
  /**
   * Profile ID the rule belongs to
   */
  profile_id: string;
  
  /**
   * Action to take when rule is triggered
   */
  notifier_type?: number | null;

  /**
   * Who should the message be sent to? (This may need to be pulled into a new table)
   */
  action_recipient: string | null;
  
  /**
   * Timestamp when the rule was created
   */
  created_at: string;
}

/**
 * Rule Criteria model representing rule criteria from the cw_rule_criteria table
 */
export interface RuleCriteria {
  /**
   * Unique identifier for the rule criteria
   */
  id: number;
  
  /**
   * The rule group this criteria belongs to
   */
  ruleGroupId: string;
  
  /**
   * The key of the value to be compaired (e.g., 'temperature_c', 'humidity')
   * this is the actual database column name.
   */
  subject: string;
  
  /**
   * Comparison operator (e.g., '>', '<', '=')
   */
  operator: string;
  
  /**
   * Threshold value for comparison
   */
  trigger_value: number;

  /**
   * This value is used to set the rule's triggered value back to false,
   */
  reset_value: number;
  
  /**
   * Timestamp when the criteria was created
   */
  created_at: string;
}

/**
 * Combined model representing a rule with its criteria
 */
export interface RuleWithCriteria extends Rule {
  /**
   * Array of criteria associated with this rule
   */
  criteria: RuleCriteria[];
}

/**
 * Data required to insert a new rule
 */
export type RuleInsert = Omit<Rule, 'id' | 'created_at'>;

/**
 * Type for updating existing rule
 */
export type RuleUpdate = Partial<Omit<Rule, 'id' | 'created_at' | 'ruleGroupId'>>;

/**
 * Data required to insert a new rule criteria
 */
export type RuleCriteriaInsert = Omit<RuleCriteria, 'id' | 'created_at'>;

/**
 * Type for updating existing rule criteria
 */
export type RuleCriteriaUpdate = Partial<Omit<RuleCriteria, 'id' | 'created_at' | 'ruleGroupId'>>;