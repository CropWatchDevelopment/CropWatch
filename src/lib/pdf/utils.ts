import type { ReportAlertPoint } from '$lib/models/Report';

/**
 * Check if a value matches the alert point condition.
 */
export const checkMatch = (_value: number, alertPoint: ReportAlertPoint): boolean => {
	const { operator, value, min, max } = alertPoint;

	if (operator === '>') {
		return _value > (value ?? 0);
	}

	if (operator === '<') {
		return _value < (value ?? Infinity);
	}

	if (operator === '=') {
		return _value === (value ?? 0);
	}

	if (operator === 'range') {
		return _value >= (min ?? 0) && _value <= (max ?? Infinity);
	}

	return false;
};

/**
 * Get the value for summary statistics.
 */
export const getValue = (valueList: number[], indicator: string): number => {
	const valueMap = {
		min: Math.min(...valueList),
		max: Math.max(...valueList),
		avg: valueList.reduce((sum, val) => sum + val, 0) / valueList.length,
		stddev: Math.sqrt(
			valueList.reduce(
				(sum, val) =>
					sum + Math.pow(val - valueList.reduce((sum, v) => sum + v, 0) / valueList.length, 2),
				0
			) / valueList.length
		)
	} as Record<string, number>;

	return valueMap[indicator] ?? 0;
};

/**
 * Evaluates whether a value meets the alert condition
 * @param value - The data value to check
 * @param alertPoint - The alert point configuration
 * @returns boolean indicating if the condition is met
 */
export function evaluateAlertCondition(value: number, alertPoint: ReportAlertPoint): boolean {
	if (!alertPoint.operator) {
		return false;
	}

	switch (alertPoint.operator) {
		case '>':
			return alertPoint.min !== null && value > alertPoint.min;
		case '>=':
			return alertPoint.min !== null && value >= alertPoint.min;
		case '<':
			return alertPoint.max !== null && value < alertPoint.max;
		case '<=':
			return alertPoint.max !== null && value <= alertPoint.max;
		case '==':
		case '=':
			return (
				(alertPoint.min !== null && value === alertPoint.min) ||
				(alertPoint.max !== null && value === alertPoint.max)
			);
		case '!=':
			return (
				alertPoint.min !== null &&
				value !== alertPoint.min &&
				alertPoint.max !== null &&
				value !== alertPoint.max
			);
		case 'between':
			return (
				alertPoint.min !== null &&
				alertPoint.max !== null &&
				value >= alertPoint.min &&
				value <= alertPoint.max
			);
		case 'outside':
			return (
				alertPoint.min !== null &&
				alertPoint.max !== null &&
				(value < alertPoint.min || value > alertPoint.max)
			);
		default:
			return false;
	}
}
