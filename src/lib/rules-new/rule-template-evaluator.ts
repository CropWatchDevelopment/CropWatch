import type { RuleTemplateCriterionInput } from './rule-template.types';

type NormalizedOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';

export interface RuleTemplateCriterionTest {
	subject: string;
	operator: string;
	triggerValue: number;
	resetValue: number;
	actualValue: unknown;
	matched: boolean;
	resetMatched: boolean;
	reason?: string;
	resetReason?: string;
}

export interface RuleTemplateTestResult {
	matches: boolean;
	canReset: boolean;
	criteria: RuleTemplateCriterionTest[];
}

export function evaluateRuleTemplateCriteria(
	criteria: RuleTemplateCriterionInput[],
	decodedPayload: Record<string, unknown>
): RuleTemplateTestResult {
	const results = criteria.map((criterion) => evaluateCriterion(criterion, decodedPayload));

	return {
		matches: results.length > 0 && results.every((criterion) => criterion.matched),
		canReset: results.length > 0 && results.every((criterion) => criterion.resetMatched),
		criteria: results
	};
}

function evaluateCriterion(
	criterion: RuleTemplateCriterionInput,
	decodedPayload: Record<string, unknown>
): RuleTemplateCriterionTest {
	const actualValue = decodedPayload[criterion.subject];
	const operator = normalizeOperator(criterion.operator);

	if (!operator) {
		return {
			subject: criterion.subject,
			operator: criterion.operator,
			triggerValue: criterion.triggerValue,
			resetValue: criterion.resetValue,
			actualValue,
			matched: false,
			resetMatched: false,
			reason: 'unsupported_operator',
			resetReason: 'unsupported_operator'
		};
	}

	const actual = toComparableNumber(actualValue);
	if (actual === null) {
		return {
			subject: criterion.subject,
			operator: criterion.operator,
			triggerValue: criterion.triggerValue,
			resetValue: criterion.resetValue,
			actualValue,
			matched: false,
			resetMatched: false,
			reason: 'non_comparable_value',
			resetReason: 'non_comparable_value'
		};
	}

	const matched = compare(actual, operator, criterion.triggerValue);
	const resetMatched = compareReset(actual, operator, criterion.resetValue);

	return {
		subject: criterion.subject,
		operator: criterion.operator,
		triggerValue: criterion.triggerValue,
		resetValue: criterion.resetValue,
		actualValue,
		matched,
		resetMatched,
		resetReason: resetMatched ? undefined : 'reset_not_reached'
	};
}

function compare(actual: number, operator: NormalizedOperator, expected: number): boolean {
	switch (operator) {
		case 'gt':
			return actual > expected;
		case 'gte':
			return actual >= expected;
		case 'lt':
			return actual < expected;
		case 'lte':
			return actual <= expected;
		case 'eq':
			return actual === expected;
		case 'neq':
			return actual !== expected;
	}
}

function compareReset(actual: number, operator: NormalizedOperator, resetValue: number): boolean {
	switch (operator) {
		case 'gt':
		case 'gte':
			return actual <= resetValue;
		case 'lt':
		case 'lte':
			return actual >= resetValue;
		case 'eq':
		case 'neq':
			return actual === resetValue;
	}
}

function normalizeOperator(operator: string): NormalizedOperator | null {
	switch (operator.trim().toLowerCase()) {
		case '>':
		case 'gt':
			return 'gt';
		case '>=':
		case 'gte':
			return 'gte';
		case '<':
		case 'lt':
			return 'lt';
		case '<=':
		case 'lte':
			return 'lte';
		case '=':
		case '==':
		case 'eq':
			return 'eq';
		case '!=':
		case 'neq':
			return 'neq';
		default:
			return null;
	}
}

function toComparableNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'boolean') return value ? 1 : 0;

	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return null;

		const parsed = Number(trimmed);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
}
