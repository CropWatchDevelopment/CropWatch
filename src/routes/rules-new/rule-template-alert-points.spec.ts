import { describe, expect, it } from 'vitest';
import type { CwAlertPointsValue } from '@cropwatchdevelopment/cwui';
import {
	areAlertCriteriaGroupsValid,
	buildInitialAlertCriteriaGroups,
	buildRuleTemplateCriteriaFromAlertGroups,
	createBlankAlertCriteriaGroup,
	ensureAlertPointsIncludeReset,
	hasUnsupportedAlertPointConditions
} from './rule-template-alert-points';
import type { RuleTemplateCriterionDto } from '$lib/rules-new/rule-template.types';

describe('rule template alert points adapter', () => {
	it('creates blank alert points with reset included', () => {
		const group = createBlankAlertCriteriaGroup(1);

		expect(group.alertPoints.points[0]?.reset).toBe('');
	});

	it('adds reset to editor values that do not include it', () => {
		const value: CwAlertPointsValue = {
			unit: 'C',
			center: '0',
			points: [
				{
					id: 'no-reset',
					name: 'High temperature',
					color: '#e35c8d',
					condition: 'greaterThan',
					value: '30',
					min: '',
					max: ''
				}
			]
		};

		expect(ensureAlertPointsIncludeReset(value).points[0]?.reset).toBe('');
	});

	it('maps alert points into rule template criteria payloads', () => {
		const criteria = buildRuleTemplateCriteriaFromAlertGroups([
			{
				localId: 1,
				subject: 'temperature_c',
				alertPoints: {
					unit: 'C',
					center: '0',
					points: [
						{
							id: 'criterion-12',
							name: 'High temperature',
							color: '#e35c8d',
							condition: 'greaterThanOrEqual',
							value: '30',
							min: '',
							max: '',
							reset: '25'
						}
					]
				}
			}
		]);

		expect(criteria).toEqual([
			{
				id: 12,
				subject: 'temperature_c',
				operator: '>=',
				triggerValue: 30,
				resetValue: 25
			}
		]);
	});

	it('blocks range alert points because rule templates require one trigger and reset value', () => {
		const group = createBlankAlertCriteriaGroup(1);
		group.alertPoints.points[0] = {
			...group.alertPoints.points[0]!,
			condition: 'range',
			min: '10',
			max: '20',
			reset: ''
		};

		expect(hasUnsupportedAlertPointConditions([group])).toBe(true);
		expect(areAlertCriteriaGroupsValid([group])).toBe(false);
	});

	it('keeps existing range operators unsupported instead of changing their meaning', () => {
		const groups = buildInitialAlertCriteriaGroups([
			criterion({
				operator: 'range',
				triggerValue: 10,
				resetValue: 0
			})
		]);

		expect(groups[0]?.alertPoints.points[0]?.condition).toBe('range');
		expect(hasUnsupportedAlertPointConditions(groups)).toBe(true);
	});
});

function criterion(overrides: Partial<RuleTemplateCriterionDto>): RuleTemplateCriterionDto {
	return {
		id: overrides.id ?? 1,
		templateId: overrides.templateId ?? 1,
		subject: overrides.subject ?? 'temperature_c',
		operator: overrides.operator ?? '>',
		triggerValue: overrides.triggerValue ?? 30,
		resetValue: overrides.resetValue ?? 25,
		createdAt: overrides.createdAt ?? null
	};
}
