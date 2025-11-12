import type { Database } from '../../../database.types';

export type Rule = Database['public']['Tables']['cw_rules']['Row'];
export type RuleInsert = Database['public']['Tables']['cw_rules']['Insert'];
export type RuleUpdate = Database['public']['Tables']['cw_rules']['Update'];

export type RuleCriteria = Database['public']['Tables']['cw_rule_criteria']['Row'];
export type RuleCriteriaInsert = Database['public']['Tables']['cw_rule_criteria']['Insert'];
export type RuleCriteriaUpdate = Database['public']['Tables']['cw_rule_criteria']['Update'];

export type RuleWithCriteria = Rule & {
	criteria: RuleCriteria[];
};
