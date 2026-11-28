import { ApiError } from '#lib/api/api-error.ts';
import type { RuleRefDto } from '#lib/rules/rule-template.types.ts';

/**
 * The rules that start or pause the rule a delete was refused for.
 *
 * The API answers such a delete with 409 and `{ message, dependents: [{ id,
 * name }] }` (name null for a rule the caller cannot see). Anything else,
 * also a 409 without that list, gives none.
 */
export function readRuleDependents(error: unknown): RuleRefDto[] {
	if (!(error instanceof ApiError) || error.status !== 409) return [];

	const body = isRecord(error.payload) ? error.payload.payload : null;
	const list = isRecord(body) ? body.dependents : null;
	if (!Array.isArray(list)) return [];

	return list.flatMap((entry: unknown): RuleRefDto[] =>
		isRecord(entry) && typeof entry.id === 'number'
			? [{ id: entry.id, name: typeof entry.name === 'string' ? entry.name : null }]
			: []
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
