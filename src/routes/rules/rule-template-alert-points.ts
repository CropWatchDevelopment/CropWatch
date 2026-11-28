import { getUiLocale } from '#lib/i18n/format.ts';
import { m } from '#lib/paraglide/messages.js';
import {
	cwRuleConditionText,
	isRuleConditionValid,
	type CwAlertPointCondition,
	type CwAlertPointRule,
	type CwAlertPointsValue
} from '@cropwatchdevelopment/cwui';
import type {
	RuleTemplateCriterionDto,
	RuleTemplateCriterionInput
} from '#lib/rules/rule-template.types.ts';

export interface RuleTemplateAlertCriteriaGroup {
	localId: number;
	subject: string;
	alertPoints: CwAlertPointsValue;
	/**
	 * The points saved as "not equal" (`!=`) conditions. The alert-points editor
	 * has no such condition, so they show as `equals` and are saved as `!=`
	 * again until the user gives them another condition. None when absent.
	 */
	notEqualPointIds?: string[];
}

const NOT_EQUAL_OPERATOR = '!=';
const DEFAULT_RULE_SUBJECT = 'temperature_c';
const DEFAULT_ALERT_CENTER = '0';
const ALERT_POINT_COLORS = ['#f7903b', '#42edf0', '#7a8cff', '#e35c8d', '#4fcf7a', '#ffcf5a'];

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
		},
		notEqualPointIds: groupCriteria
			.filter((criterion) => criterion.operator.trim() === NOT_EQUAL_OPERATOR)
			.map(alertPointIdOf)
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
			operator: isKeptNotEqualPoint(group, point)
				? NOT_EQUAL_OPERATOR
				: mapAlertConditionToOperator(point.condition),
			triggerValue: readAlertPointTriggerValue(point),
			resetValue: readNumberOrZero(point.reset ?? '')
		}))
	);
}

/**
 * The editor's `onchange`: stores its value with a reset field on every point,
 * and drops the "not equal" of a point the user gave another condition (or
 * removed), so a later `equals` is saved as `=`.
 */
export function applyAlertPointsChange(
	group: RuleTemplateAlertCriteriaGroup,
	value: CwAlertPointsValue
): void {
	group.alertPoints = ensureAlertPointsIncludeReset(value);
	if (!group.notEqualPointIds?.length) return;
	group.notEqualPointIds = group.notEqualPointIds.filter((id) =>
		value.points.some((point) => point.id === id && point.condition === 'equals')
	);
}

/**
 * The notice for the group's points saved as "not equal", which the editor
 * shows as `equals`; `null` when there are none.
 */
export function describeNotEqualPoints(group: RuleTemplateAlertCriteriaGroup): string | null {
	const names = group.alertPoints.points.flatMap((point, index) =>
		isKeptNotEqualPoint(group, point)
			? [point.name.trim() || m.rules_condition_number({ count: String(index + 1) })]
			: []
	);
	if (names.length === 0) return null;
	return m.rules_condition_not_equal_kept({
		names: names.join(getUiLocale() === 'ja' ? '、' : ', '),
		notEqual: m.rule_operator_not_equal(),
		equals: cwRuleConditionText(getUiLocale()).opEquals
	});
}

function isKeptNotEqualPoint(group: RuleTemplateAlertCriteriaGroup, point: CwAlertPointRule) {
	return point.condition === 'equals' && (group.notEqualPointIds?.includes(point.id) ?? false);
}

/**
 * Whether every condition can be saved: a reading, and limits the rule editor
 * finds nothing wrong with (complete numbers, each reset on the safe side of
 * its limit, no two limits that overlap).
 */
export function areAlertCriteriaGroupsValid(groups: RuleTemplateAlertCriteriaGroup[]): boolean {
	return (
		groups.length > 0 &&
		groups.every(
			(group) => group.subject.trim().length > 0 && isRuleConditionValid(group.alertPoints)
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

/** A saved criterion's point id; {@link readPersistedCriterionId} reads the criterion id back. */
function alertPointIdOf(criterion: RuleTemplateCriterionDto): string {
	return `criterion-${criterion.id}`;
}

function mapCriterionToAlertPoint(
	criterion: RuleTemplateCriterionDto,
	index: number
): CwAlertPointRule {
	return {
		id: alertPointIdOf(criterion),
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
		// The editor has no "not equal": shown as `equals`, kept by notEqualPointIds.
		case NOT_EQUAL_OPERATOR:
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
