import { getUiLocale } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import type {
	CwAlertPointCondition,
	CwAlertPointRule,
	CwAlertPointsEditorText,
	CwAlertPointsValue
} from '@cropwatchdevelopment/cwui';
import type {
	RuleTemplateCriterionDto,
	RuleTemplateCriterionInput
} from '$lib/rules-new/rule-template.types';

export interface RuleTemplateAlertCriteriaGroup {
	localId: number;
	subject: string;
	alertPoints: CwAlertPointsValue;
}

const DEFAULT_RULE_SUBJECT = 'temperature_c';
const DEFAULT_ALERT_CENTER = '0';
const ALERT_POINT_COLORS = ['#f7903b', '#42edf0', '#7a8cff', '#e35c8d', '#4fcf7a', '#ffcf5a'];

function formatOverlapLabels(labels: string[]): string {
	return labels.join(getUiLocale() === 'ja' ? '、' : ', ');
}

export function createRuleTemplateAlertPointsEditorText(): CwAlertPointsEditorText {
	return {
		unitFieldLabel: m.reports_create_alert_points_unit_label(),
		centerFieldLabel: m.reports_create_alert_points_center_label(),
		nameFieldLabel: m.common_name(),
		conditionFieldLabel: m.rules_operator(),
		valueFieldLabel: m.rules_trigger_value(),
		minValueFieldLabel: m.reports_create_alert_minimum(),
		maxValueFieldLabel: m.reports_create_alert_maximum(),
		resetFieldLabel: m.rules_reset_value(),
		colorFieldLabel: m.reports_create_alert_hex_color(),
		addAlertPointButton: m.rules_add_another_condition(),
		removePointButton: m.action_remove(),
		emptyTitle: m.reports_create_alert_points_empty_title(),
		emptyDescription: m.reports_create_alert_points_empty_description(),
		invalidNumberError: m.reports_create_alert_points_invalid_number(),
		requiredFieldError: (label) => m.reports_create_alert_points_required_field({ label }),
		fieldLabelWithUnit: (label, unit) =>
			m.reports_create_alert_points_label_with_unit({ label, unit }),
		invalidPreviewNote: (count) =>
			count === 1
				? m.reports_create_alert_points_invalid_preview_single()
				: m.reports_create_alert_points_invalid_preview_multiple({ count: String(count) }),
		overlapPreviewNote: (count) =>
			count === 1
				? m.reports_create_alert_points_overlap_preview_single()
				: m.reports_create_alert_points_overlap_preview_multiple({ count: String(count) }),
		minEqualsMaxWarning: m.reports_create_alert_points_equal_bounds_warning(),
		defaultPointName: (index) => m.rules_condition_number({ count: String(index) }),
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
		pointDescriptionEquals: (value, unit) =>
			m.reports_create_alert_points_description_equals({ value, unit }),
		pointDescriptionRange: (min, max, unit) =>
			m.reports_create_alert_points_description_range({ min, max, unit }),
		pointDescriptionLessThan: (value, unit) =>
			m.reports_create_alert_points_description_less_than({ value, unit }),
		pointDescriptionLessThanOrEqual: (value, unit) =>
			m.reports_create_alert_points_description_less_than_or_equal({ value, unit }),
		pointDescriptionGreaterThan: (value, unit) =>
			m.reports_create_alert_points_description_greater_than({ value, unit }),
		pointDescriptionGreaterThanOrEqual: (value, unit) =>
			m.reports_create_alert_points_description_greater_than_or_equal({ value, unit }),
		overlapError: (labels) =>
			m.reports_create_alert_points_overlap_error({ labels: formatOverlapLabels(labels) })
	};
}

export function buildInitialAlertCriteriaGroups(
	criteria: RuleTemplateCriterionDto[] = []
): RuleTemplateAlertCriteriaGroup[] {
	if (criteria.length === 0) {
		return [createBlankAlertCriteriaGroup(1)];
	}

	const criteriaBySubject = new Map<string, RuleTemplateCriterionDto[]>();
	for (const criterion of criteria) {
		const subject = criterion.subject.trim() || DEFAULT_RULE_SUBJECT;
		criteriaBySubject.set(subject, [...(criteriaBySubject.get(subject) ?? []), criterion]);
	}

	return [...criteriaBySubject.entries()].map(([subject, groupCriteria], index) => ({
		localId: index + 1,
		subject,
		alertPoints: {
			unit: 'C',
			center: DEFAULT_ALERT_CENTER,
			points: groupCriteria.map(mapCriterionToAlertPoint)
		}
	}));
}

export function createBlankAlertCriteriaGroup(localId: number): RuleTemplateAlertCriteriaGroup {
	return {
		localId,
		subject: DEFAULT_RULE_SUBJECT,
		alertPoints: {
			unit: 'C',
			center: DEFAULT_ALERT_CENTER,
			points: [createBlankAlertPoint(1)]
		}
	};
}

export function buildRuleTemplateCriteriaFromAlertGroups(
	groups: RuleTemplateAlertCriteriaGroup[]
): RuleTemplateCriterionInput[] {
	return groups.flatMap((group) =>
		group.alertPoints.points.map((point) => ({
			id: readPersistedCriterionId(point.id),
			subject: group.subject,
			operator: mapAlertConditionToOperator(point.condition),
			triggerValue: readAlertPointTriggerValue(point),
			resetValue: readNumberOrZero(point.reset ?? '')
		}))
	);
}

export function areAlertCriteriaGroupsValid(groups: RuleTemplateAlertCriteriaGroup[]): boolean {
	return (
		groups.length > 0 &&
		groups.every(
			(group) =>
				group.subject.trim().length > 0 &&
				group.alertPoints.points.length > 0 &&
				group.alertPoints.points.every(isAlertPointValid)
		)
	);
}

export function hasUnsupportedAlertPointConditions(
	groups: RuleTemplateAlertCriteriaGroup[]
): boolean {
	return groups.some((group) =>
		group.alertPoints.points.some((point) => point.condition === 'range')
	);
}

function createBlankAlertPoint(index: number): CwAlertPointRule {
	return {
		id: `rule-alert-point-${index}`,
		name: m.rules_condition_number({ count: String(index) }),
		color: ALERT_POINT_COLORS[(index - 1) % ALERT_POINT_COLORS.length],
		condition: 'greaterThan',
		value: '',
		min: '',
		max: '',
		reset: ''
	};
}

function mapCriterionToAlertPoint(
	criterion: RuleTemplateCriterionDto,
	index: number
): CwAlertPointRule {
	return {
		id: `criterion-${criterion.id}`,
		name: m.rules_condition_number({ count: String(index + 1) }),
		color: ALERT_POINT_COLORS[index % ALERT_POINT_COLORS.length],
		condition: mapOperatorToAlertCondition(criterion.operator),
		value: String(criterion.triggerValue),
		min: '',
		max: '',
		reset: String(criterion.resetValue)
	};
}

export function ensureAlertPointsIncludeReset(value: CwAlertPointsValue): CwAlertPointsValue {
	let changed = false;
	const points = value.points.map((point) => {
		if (point.reset !== undefined) return point;
		changed = true;
		return {
			...point,
			reset: ''
		};
	});

	return changed ? { ...value, points } : value;
}

function mapOperatorToAlertCondition(operator: string): CwAlertPointCondition {
	switch (operator.trim()) {
		case '>':
			return 'greaterThan';
		case '>=':
			return 'greaterThanOrEqual';
		case '<':
			return 'lessThan';
		case '<=':
			return 'lessThanOrEqual';
		case 'range':
			return 'range';
		case '=':
		default:
			return 'equals';
	}
}

function mapAlertConditionToOperator(condition: CwAlertPointCondition): string {
	switch (condition) {
		case 'greaterThan':
			return '>';
		case 'greaterThanOrEqual':
			return '>=';
		case 'lessThan':
			return '<';
		case 'lessThanOrEqual':
			return '<=';
		case 'range':
			return 'range';
		case 'equals':
		default:
			return '=';
	}
}

function readAlertPointTriggerValue(point: CwAlertPointRule): number {
	return point.condition === 'range' ? readNumberOrZero(point.min) : readNumberOrZero(point.value);
}

function isAlertPointValid(point: CwAlertPointRule): boolean {
	if (point.condition === 'range') return false;
	return isFiniteNumberText(point.value) && isFiniteNumberText(point.reset ?? '');
}

function isFiniteNumberText(value: string): boolean {
	if (!value.trim()) return false;
	return Number.isFinite(Number(value));
}

function readNumberOrZero(value: string): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function readPersistedCriterionId(id: string): number | null {
	const match = /^criterion-(\d+)$/.exec(id);
	if (!match) return null;

	const parsed = Number(match[1]);
	return Number.isFinite(parsed) ? parsed : null;
}
