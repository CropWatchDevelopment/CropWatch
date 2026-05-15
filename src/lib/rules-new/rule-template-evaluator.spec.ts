import { describe, expect, it } from 'vitest';
import { evaluateRuleTemplateCriteria } from './rule-template-evaluator';
import type { RuleTemplateCriterionInput } from './rule-template.types';

describe('evaluateRuleTemplateCriteria', () => {
	it('matches only when every trigger condition passes', () => {
		const result = evaluateRuleTemplateCriteria(
			[
				criterion({ subject: 'temperature_c', operator: '>', triggerValue: 30, resetValue: 25 }),
				criterion({ subject: 'humidity', operator: '<=', triggerValue: 80, resetValue: 85 })
			],
			{ temperature_c: 31, humidity: 80 }
		);

		expect(result.matches).toBe(true);
		expect(result.criteria.every((item) => item.matched)).toBe(true);
	});

	it('reports non-comparable values without throwing', () => {
		const result = evaluateRuleTemplateCriteria(
			[criterion({ subject: 'temperature_c', operator: '>', triggerValue: 30, resetValue: 25 })],
			{ temperature_c: 'not-a-number' }
		);

		expect(result.matches).toBe(false);
		expect(result.criteria[0]?.reason).toBe('non_comparable_value');
	});

	it('uses reset direction compatible with the alert handler', () => {
		const highThreshold = evaluateRuleTemplateCriteria(
			[criterion({ subject: 'temperature_c', operator: '>', triggerValue: 30, resetValue: 25 })],
			{ temperature_c: 25 }
		);
		const lowThreshold = evaluateRuleTemplateCriteria(
			[criterion({ subject: 'battery_level', operator: '<', triggerValue: 20, resetValue: 35 })],
			{ battery_level: 35 }
		);

		expect(highThreshold.canReset).toBe(true);
		expect(lowThreshold.canReset).toBe(true);
	});
});

function criterion(overrides: Partial<RuleTemplateCriterionInput>): RuleTemplateCriterionInput {
	return {
		subject: overrides.subject ?? 'temperature_c',
		operator: overrides.operator ?? '>',
		triggerValue: overrides.triggerValue ?? 30,
		resetValue: overrides.resetValue ?? 25
	};
}
