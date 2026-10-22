import { describe, expect, it } from 'vitest';
import type {
	CwAlertPointRule,
	CwAlertPointsEditorText,
	CwAlertPointsValue
} from '@cropwatchdevelopment/cwui';
import { m } from '$lib/paraglide/messages.js';
import { getLocale, overwriteGetLocale } from '$lib/paraglide/runtime.js';
import {
	applyAlertPointsChange,
	areAlertCriteriaGroupsValid,
	buildInitialAlertCriteriaGroups,
	buildRuleTemplateCriteriaFromAlertGroups,
	createBlankAlertCriteriaGroup,
	createRuleTemplateAlertPointsEditorText,
	describeNotEqualPoints,
	ensureAlertPointsIncludeReset,
	hasUnsupportedAlertPointConditions
} from './rule-template-alert-points';
import type { RuleTemplateCriterionDto } from '$lib/rules/rule-template.types';

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

describe('createRuleTemplateAlertPointsEditorText', () => {
	it('labels the editor in the wording of rules', () => {
		expect(createRuleTemplateAlertPointsEditorText()).toMatchObject({
			previewLabel: m.cwui_alert_points_preview(),
			unitFieldLabel: m.reports_create_alert_points_unit_label(),
			centerFieldLabel: m.reports_create_alert_points_center_label(),
			nameFieldLabel: m.common_name(),
			conditionFieldLabel: m.rules_operator(),
			valueFieldLabel: m.rules_trigger_value(),
			minValueFieldLabel: m.reports_create_alert_minimum(),
			maxValueFieldLabel: m.reports_create_alert_maximum(),
			resetFieldLabel: m.rules_reset_value(),
			colorFieldLabel: m.reports_create_alert_hex_color(),
			addAlertPointButton: m.rules_add_threshold_for_field(),
			removePointButton: m.action_remove(),
			emptyTitle: m.reports_create_alert_points_empty_title(),
			emptyDescription: m.reports_create_alert_points_empty_description(),
			invalidNumberError: m.reports_create_alert_points_invalid_number(),
			resetNeverHappensError: m.reports_create_alert_points_reset_never_happens_error(),
			minEqualsMaxWarning: m.reports_create_alert_points_equal_bounds_warning(),
			unitCelsiusLabel: '°C',
			unitFahrenheitLabel: '°F',
			unitKelvinLabel: '°K',
			conditionEqualsLabel: m.reports_create_alert_points_condition_equals(),
			conditionRangeLabel: m.reports_create_alert_points_condition_range(),
			conditionLessThanLabel: m.reports_create_alert_points_condition_less_than(),
			conditionLessThanOrEqualLabel: m.reports_create_alert_points_condition_less_than_or_equal(),
			conditionGreaterThanLabel: m.reports_create_alert_points_condition_greater_than(),
			conditionGreaterThanOrEqualLabel:
				m.reports_create_alert_points_condition_greater_than_or_equal(),
			pointDescriptionWaitingForValue: m.reports_create_alert_points_waiting_for_value(),
			pointDescriptionWaitingForThreshold: m.reports_create_alert_points_waiting_for_threshold(),
			pointDescriptionRangeMissingBounds: m.reports_create_alert_points_range_missing_bounds(),
			resetDescriptionWaitingForValue: m.reports_create_alert_points_reset_waiting_for_value()
		});
	});

	it('fills in labels, counts and values', () => {
		const text = createRuleTemplateAlertPointsEditorText() as Required<CwAlertPointsEditorText>;

		expect(text.requiredFieldError('Value')).toBe(
			m.reports_create_alert_points_required_field({ label: 'Value' })
		);
		expect(text.fieldLabelWithUnit('Value', '°C')).toBe(
			m.reports_create_alert_points_label_with_unit({ label: 'Value', unit: '°C' })
		);
		expect(text.invalidPreviewNote(1)).toBe(m.reports_create_alert_points_invalid_preview_single());
		expect(text.invalidPreviewNote(3)).toBe(
			m.reports_create_alert_points_invalid_preview_multiple({ count: '3' })
		);
		expect(text.overlapPreviewNote(1)).toBe(m.reports_create_alert_points_overlap_preview_single());
		expect(text.overlapPreviewNote(2)).toBe(
			m.reports_create_alert_points_overlap_preview_multiple({ count: '2' })
		);
		expect(text.resetNeverHappensPreviewNote(1)).toBe(
			m.reports_create_alert_points_reset_never_happens_preview_single()
		);
		expect(text.resetNeverHappensPreviewNote(4)).toBe(
			m.reports_create_alert_points_reset_never_happens_preview_multiple({ count: '4' })
		);
		expect(text.defaultPointName(2)).toBe(m.rules_condition_number({ count: '2' }));
		expect(text.pointDescriptionEquals('5', '°C')).toBe(
			m.reports_create_alert_points_description_equals({ value: '5', unit: '°C' })
		);
		expect(text.pointDescriptionRange('1', '9', '°C')).toBe(
			m.reports_create_alert_points_description_range({ min: '1', max: '9', unit: '°C' })
		);
		expect(text.pointDescriptionLessThan('5', '°C')).toBe(
			m.reports_create_alert_points_description_less_than({ value: '5', unit: '°C' })
		);
		expect(text.pointDescriptionLessThanOrEqual('5', '°C')).toBe(
			m.reports_create_alert_points_description_less_than_or_equal({ value: '5', unit: '°C' })
		);
		expect(text.pointDescriptionGreaterThan('5', '°C')).toBe(
			m.reports_create_alert_points_description_greater_than({ value: '5', unit: '°C' })
		);
		expect(text.pointDescriptionGreaterThanOrEqual('5', '°C')).toBe(
			m.reports_create_alert_points_description_greater_than_or_equal({ value: '5', unit: '°C' })
		);
		expect(text.resetDescriptionNotEquals('5', '°C')).toBe(
			m.reports_create_alert_points_reset_description_not_equals({ value: '5', unit: '°C' })
		);
		expect(text.resetDescriptionLessThan('5', '°C')).toBe(
			m.reports_create_alert_points_reset_description_less_than({ value: '5', unit: '°C' })
		);
		expect(text.resetDescriptionLessThanOrEqual('5', '°C')).toBe(
			m.reports_create_alert_points_reset_description_less_than_or_equal({ value: '5', unit: '°C' })
		);
		expect(text.resetDescriptionGreaterThan('5', '°C')).toBe(
			m.reports_create_alert_points_reset_description_greater_than({ value: '5', unit: '°C' })
		);
		expect(text.resetDescriptionGreaterThanOrEqual('5', '°C')).toBe(
			m.reports_create_alert_points_reset_description_greater_than_or_equal({
				value: '5',
				unit: '°C'
			})
		);
	});

	it('lists overlapping conditions with the separator of the language', () => {
		const originalGetLocale = getLocale;
		const overlapError = (labels: string[]) =>
			(createRuleTemplateAlertPointsEditorText() as Required<CwAlertPointsEditorText>).overlapError(
				labels
			);
		try {
			overwriteGetLocale(() => 'ja');
			expect(overlapError(['A', 'B'])).toBe(
				m.reports_create_alert_points_overlap_error({ labels: 'A、B' })
			);

			overwriteGetLocale(() => 'en');
			expect(overlapError(['A', 'B'])).toBe(
				m.reports_create_alert_points_overlap_error({ labels: 'A, B' })
			);
		} finally {
			overwriteGetLocale(originalGetLocale);
		}
	});
});

describe('buildInitialAlertCriteriaGroups', () => {
	it('starts a new rule with one blank condition', () => {
		expect(buildInitialAlertCriteriaGroups()).toEqual([createBlankAlertCriteriaGroup(1)]);
		expect(createBlankAlertCriteriaGroup(4)).toEqual({
			localId: 4,
			subject: 'temperature_c',
			alertPoints: {
				unit: 'C',
				center: '0',
				points: [
					{
						id: 'rule-alert-point-1',
						name: m.rules_condition_number({ count: '1' }),
						color: '#f7903b',
						condition: 'greaterThan',
						value: '',
						min: '',
						max: '',
						reset: ''
					}
				]
			}
		});
	});

	it('shows each saved operator as its editor condition', () => {
		const operators = ['>', '>=', '<', '<=', '=', 'range', ' <= ', '!='];
		const [group] = buildInitialAlertCriteriaGroups(
			operators.map((operator, index) => criterion({ id: index + 1, operator }))
		);

		expect(group.alertPoints.points.map((point) => point.condition)).toEqual([
			'greaterThan',
			'greaterThanOrEqual',
			'lessThan',
			'lessThanOrEqual',
			'equals',
			'range',
			'lessThanOrEqual',
			// The editor has no "not equal": shown as equals, and remembered.
			'equals'
		]);
		expect(group.notEqualPointIds).toEqual(['criterion-8']);
	});

	it('remembers the "not equal" conditions of each data field', () => {
		const groups = buildInitialAlertCriteriaGroups([
			criterion({ id: 1, subject: 'humidity', operator: ' != ' }),
			criterion({ id: 2, subject: 'temperature_c', operator: '=' }),
			criterion({ id: 3, subject: 'humidity', operator: '>' })
		]);

		expect(groups.map((group) => group.notEqualPointIds)).toEqual([['criterion-1'], []]);
	});

	it('names, colours and fills each point from its saved criterion', () => {
		const [group] = buildInitialAlertCriteriaGroups(
			Array.from({ length: 7 }, (_, index) =>
				criterion({ id: 40 + index, triggerValue: index, resetValue: index + 0.5 })
			)
		);

		expect(group.alertPoints.points[0]).toEqual({
			id: 'criterion-40',
			name: m.rules_condition_number({ count: '1' }),
			color: '#f7903b',
			condition: 'greaterThan',
			value: '0',
			min: '',
			max: '',
			reset: '0.5'
		});
		expect(group.alertPoints.points.map((point) => point.color)).toEqual([
			'#f7903b',
			'#42edf0',
			'#7a8cff',
			'#e35c8d',
			'#4fcf7a',
			'#ffcf5a',
			'#f7903b'
		]);
		expect(group.alertPoints.points[6]?.name).toBe(m.rules_condition_number({ count: '7' }));
	});

	it('groups criteria by data field, putting a blank field under temperature', () => {
		const groups = buildInitialAlertCriteriaGroups([
			criterion({ id: 1, subject: 'humidity' }),
			criterion({ id: 2, subject: '  ' }),
			criterion({ id: 3, subject: 'humidity' })
		]);

		expect(
			groups.map((group) => [group.localId, group.subject, group.alertPoints.points.length])
		).toEqual([
			[1, 'humidity', 2],
			[2, 'temperature_c', 1]
		]);
	});
});

describe('buildRuleTemplateCriteriaFromAlertGroups', () => {
	const point = (overrides: Partial<CwAlertPointRule>): CwAlertPointRule => ({
		id: 'rule-alert-point-1',
		name: 'Point',
		color: '#000000',
		condition: 'greaterThan',
		value: '1',
		min: '',
		max: '',
		reset: '0',
		...overrides
	});

	it('maps each editor condition to the operator rules use', () => {
		const criteria = buildRuleTemplateCriteriaFromAlertGroups([
			{
				localId: 1,
				subject: 'humidity',
				alertPoints: {
					unit: 'C',
					center: '0',
					points: [
						point({ condition: 'greaterThan' }),
						point({ condition: 'greaterThanOrEqual' }),
						point({ condition: 'lessThan' }),
						point({ condition: 'lessThanOrEqual' }),
						point({ condition: 'equals' }),
						point({ condition: 'range', min: '4', max: '9', value: '1' }),
						point({ condition: 'unknown' as CwAlertPointRule['condition'] })
					]
				}
			}
		]);

		expect(criteria.map((item) => item.operator)).toEqual([
			'>',
			'>=',
			'<',
			'<=',
			'=',
			'range',
			'='
		]);
		// A range triggers at its minimum.
		expect(criteria[5]?.triggerValue).toBe(4);
		expect(criteria.every((item) => item.subject === 'humidity')).toBe(true);
	});

	it('sends 0 for values that are not numbers, and no id for points that were never saved', () => {
		const criteria = buildRuleTemplateCriteriaFromAlertGroups([
			{
				localId: 1,
				subject: 'temperature_c',
				alertPoints: {
					unit: 'C',
					center: '0',
					points: [
						point({ id: 'criterion-abc', value: 'warm', reset: undefined }),
						point({ id: 'rule-alert-point-3', value: '', reset: 'x' })
					]
				}
			}
		]);

		expect(criteria).toEqual([
			{ id: null, subject: 'temperature_c', operator: '>', triggerValue: 0, resetValue: 0 },
			{ id: null, subject: 'temperature_c', operator: '>', triggerValue: 0, resetValue: 0 }
		]);
	});

	it('sends nothing for no groups', () => {
		expect(buildRuleTemplateCriteriaFromAlertGroups([])).toEqual([]);
	});

	it('saves an unchanged "not equal" condition as "!=" again', () => {
		const criteria = [
			criterion({ id: 5, operator: '!=', triggerValue: 4, resetValue: 2 }),
			criterion({ id: 6, operator: '=', triggerValue: 7, resetValue: 1 })
		];

		expect(
			buildRuleTemplateCriteriaFromAlertGroups(buildInitialAlertCriteriaGroups(criteria))
		).toEqual([
			{ id: 5, subject: 'temperature_c', operator: '!=', triggerValue: 4, resetValue: 2 },
			{ id: 6, subject: 'temperature_c', operator: '=', triggerValue: 7, resetValue: 1 }
		]);
	});

	it('saves the condition chosen for a "not equal" one, even when the mark is still there', () => {
		const [group] = buildInitialAlertCriteriaGroups([criterion({ id: 5, operator: '!=' })]);
		group.alertPoints.points[0].condition = 'lessThan';

		expect(buildRuleTemplateCriteriaFromAlertGroups([group])[0]?.operator).toBe('<');
	});

	it('sends no id for a saved id too large to be a number', () => {
		const [criterion] = buildRuleTemplateCriteriaFromAlertGroups([
			{
				localId: 1,
				subject: 'temperature_c',
				alertPoints: {
					unit: 'C',
					center: '0',
					points: [point({ id: `criterion-${'9'.repeat(400)}` })]
				}
			}
		]);

		expect(criterion?.id).toBeNull();
	});
});

describe('areAlertCriteriaGroupsValid', () => {
	const group = (points: Partial<CwAlertPointRule>[], subject = 'temperature_c') => {
		const base = createBlankAlertCriteriaGroup(1);
		return {
			...base,
			subject,
			alertPoints: {
				...base.alertPoints,
				points: points.map((overrides) => ({ ...base.alertPoints.points[0]!, ...overrides }))
			}
		};
	};

	it('accepts complete numeric conditions', () => {
		expect(areAlertCriteriaGroupsValid([group([{ value: '30', reset: '25' }])])).toBe(true);
		expect(areAlertCriteriaGroupsValid([group([{ value: '-1.5', reset: '0' }])])).toBe(true);
	});

	it.each([
		['no groups', []],
		['a blank data field', [group([{ value: '30', reset: '25' }], '  ')]],
		['a group without points', [group([])]],
		['a blank trigger value', [group([{ value: '  ', reset: '25' }])]],
		['a trigger value that is not a number', [group([{ value: 'hot', reset: '25' }])]],
		['a blank reset value', [group([{ value: '30', reset: '' }])]],
		['no reset value', [group([{ value: '30', reset: undefined }])]],
		['a reset value that is not a number', [group([{ value: '30', reset: 'cold' }])]]
	])('rejects %s', (_label, groups) => {
		expect(areAlertCriteriaGroupsValid(groups)).toBe(false);
	});
});

describe('ensureAlertPointsIncludeReset', () => {
	it('returns the same value when every point has a reset', () => {
		const value = createBlankAlertCriteriaGroup(1).alertPoints;

		expect(ensureAlertPointsIncludeReset(value)).toBe(value);
	});
});

describe('applyAlertPointsChange', () => {
	const notEqualGroup = () =>
		buildInitialAlertCriteriaGroups([
			criterion({ id: 5, operator: '!=' }),
			criterion({ id: 6, operator: '!=' })
		])[0];
	const operators = (group: ReturnType<typeof notEqualGroup>) =>
		buildRuleTemplateCriteriaFromAlertGroups([group]).map((item) => item.operator);

	it('stores the editor value with a reset on every point', () => {
		const group = createBlankAlertCriteriaGroup(1);
		const [point] = group.alertPoints.points;

		applyAlertPointsChange(group, {
			...group.alertPoints,
			points: [{ ...point, value: '30', reset: undefined }]
		});

		expect(group.alertPoints.points).toEqual([{ ...point, value: '30', reset: '' }]);
		expect(group.notEqualPointIds).toBeUndefined();
	});

	it('keeps a "not equal" condition while only its values change', () => {
		const group = notEqualGroup();

		applyAlertPointsChange(group, {
			...group.alertPoints,
			points: group.alertPoints.points.map((point) => ({ ...point, value: '9', reset: '3' }))
		});

		expect(group.notEqualPointIds).toEqual(['criterion-5', 'criterion-6']);
		expect(operators(group)).toEqual(['!=', '!=']);
	});

	it('forgets the "not equal" of a point given another condition, or removed', () => {
		const group = notEqualGroup();
		const [first] = group.alertPoints.points;

		applyAlertPointsChange(group, {
			...group.alertPoints,
			points: [{ ...first, condition: 'greaterThan' }]
		});
		expect(group.notEqualPointIds).toEqual([]);
		expect(operators(group)).toEqual(['>']);

		// Chosen again, equals now means "=".
		applyAlertPointsChange(group, {
			...group.alertPoints,
			points: [{ ...first, condition: 'equals' }]
		});
		expect(operators(group)).toEqual(['=']);
	});
});

describe('describeNotEqualPoints', () => {
	it('says nothing for a group without "not equal" conditions', () => {
		expect(describeNotEqualPoints(createBlankAlertCriteriaGroup(1))).toBeNull();
		expect(
			describeNotEqualPoints(buildInitialAlertCriteriaGroups([criterion({ operator: '=' })])[0])
		).toBeNull();
	});

	it('names the points kept as "not equal", which the editor shows as equals', () => {
		const originalGetLocale = getLocale;
		const [group] = buildInitialAlertCriteriaGroups([
			criterion({ id: 1, operator: '!=' }),
			criterion({ id: 2, operator: '>' }),
			criterion({ id: 3, operator: '!=' })
		]);
		group.alertPoints.points[0].name = 'Door';
		// A point without a name is named by its position, as the editor does.
		group.alertPoints.points[2].name = '  ';
		const notice = (separator: string) =>
			m.rules_condition_not_equal_kept({
				names: `Door${separator}${m.rules_condition_number({ count: '3' })}`,
				notEqual: m.rule_operator_not_equal(),
				equals: m.reports_create_alert_points_condition_equals()
			});
		try {
			overwriteGetLocale(() => 'ja');
			expect(describeNotEqualPoints(group)).toBe(notice('、'));

			overwriteGetLocale(() => 'en');
			expect(describeNotEqualPoints(group)).toBe(notice(', '));
		} finally {
			overwriteGetLocale(originalGetLocale);
		}
	});

	it('leaves out a point given another condition', () => {
		const [group] = buildInitialAlertCriteriaGroups([criterion({ operator: '!=' })]);
		group.alertPoints.points[0].condition = 'lessThan';

		expect(describeNotEqualPoints(group)).toBeNull();
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
