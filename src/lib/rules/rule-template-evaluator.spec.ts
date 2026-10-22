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

	it('neither matches nor resets without criteria', () => {
		expect(evaluateRuleTemplateCriteria([], { temperature_c: 31 })).toEqual({
			matches: false,
			canReset: false,
			criteria: []
		});
	});

	it.each([
		['>', 31, true],
		['>', 30, false],
		['gt', 31, true],
		['>=', 30, true],
		['gte', 29, false],
		['<', 29, true],
		['lt', 30, false],
		['<=', 30, true],
		['lte', 31, false],
		['=', 30, true],
		['==', 31, false],
		['eq', 30, true],
		['!=', 31, true],
		['neq', 30, false],
		[' GT ', 31, true]
	])('compares with %s: %d against 30 → %s', (operator, value, matched) => {
		const result = evaluateRuleTemplateCriteria(
			[criterion({ operator, triggerValue: 30, resetValue: 25 })],
			{ temperature_c: value }
		);

		expect(result.criteria[0]?.matched).toBe(matched);
		expect(result.matches).toBe(matched);
	});

	it.each([
		['>', 25, true],
		['>=', 26, false],
		['<', 25, true],
		['<=', 24, false],
		['=', 25, true],
		['!=', 24, false]
	])(
		'resets %s when the value reaches the reset value (%d vs 25 → %s)',
		(operator, value, reset) => {
			const result = evaluateRuleTemplateCriteria(
				[criterion({ operator, triggerValue: 30, resetValue: 25 })],
				{ temperature_c: value }
			);

			expect(result.criteria[0]?.resetMatched).toBe(reset);
			expect(result.criteria[0]?.resetReason).toBe(reset ? undefined : 'reset_not_reached');
			expect(result.canReset).toBe(reset);
		}
	);

	it('reports an unsupported operator without throwing', () => {
		const result = evaluateRuleTemplateCriteria(
			[criterion({ subject: 'humidity', operator: 'range', triggerValue: 10, resetValue: 0 })],
			{ humidity: 50 }
		);

		expect(result).toEqual({
			matches: false,
			canReset: false,
			criteria: [
				{
					subject: 'humidity',
					operator: 'range',
					triggerValue: 10,
					resetValue: 0,
					actualValue: 50,
					matched: false,
					resetMatched: false,
					reason: 'unsupported_operator',
					resetReason: 'unsupported_operator'
				}
			]
		});
	});

	it('compares booleans as 1 and 0, and numeric text as numbers', () => {
		const result = evaluateRuleTemplateCriteria(
			[
				criterion({ subject: 'relay_1', operator: '=', triggerValue: 1, resetValue: 0 }),
				criterion({ subject: 'relay_2', operator: '=', triggerValue: 0, resetValue: 1 }),
				criterion({ subject: 'humidity', operator: '>', triggerValue: 80, resetValue: 70 })
			],
			{ relay_1: true, relay_2: false, humidity: ' 85.5 ' }
		);

		expect(result.criteria.map((item) => item.matched)).toEqual([true, true, true]);
		expect(result.criteria[2]?.actualValue).toBe(' 85.5 ');
		expect(result.matches).toBe(true);
		expect(result.canReset).toBe(false);
	});

	it.each([
		['blank text', '   '],
		['an infinite number', Number.POSITIVE_INFINITY],
		['NaN', Number.NaN],
		['text that is not a number', 'Infinity-ish'],
		['a missing value', undefined],
		['null', null],
		['an object', { value: 31 }]
	])('cannot compare %s', (_label, value) => {
		const result = evaluateRuleTemplateCriteria(
			[criterion({ operator: '>', triggerValue: 30, resetValue: 25 })],
			{ temperature_c: value }
		);

		expect(result.criteria[0]).toMatchObject({
			matched: false,
			resetMatched: false,
			reason: 'non_comparable_value',
			resetReason: 'non_comparable_value'
		});
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
