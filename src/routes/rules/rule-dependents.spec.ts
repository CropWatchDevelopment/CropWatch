import { describe, expect, it } from 'vitest';
import { ApiError } from '#lib/api/api-error.ts';
import { readRuleDependents } from './rule-dependents.ts';

const refusal = (payload: unknown, status = 409) =>
	new ApiError(status, 'Conflict', { url: 'https://api.cropwatch.test/rules/7', payload });

describe('readRuleDependents', () => {
	it('reads the rules the API lists, named or not', () => {
		expect(
			readRuleDependents(
				refusal({
					message: 'Other rules start or pause this rule.',
					dependents: [{ id: 3, name: 'Night switch' }, { id: 9, name: null }, { id: 10 }]
				})
			)
		).toEqual([
			{ id: 3, name: 'Night switch' },
			{ id: 9, name: null },
			{ id: 10, name: null }
		]);
	});

	it('skips entries it cannot use', () => {
		expect(
			readRuleDependents(
				refusal({ dependents: [null, 'x', { name: 'no id' }, { id: '4' }, { id: 5, name: 7 }] })
			)
		).toEqual([{ id: 5, name: null }]);
	});

	it.each([
		['another status with the same body', refusal({ dependents: [{ id: 3, name: 'x' }] }, 403)],
		['a conflict without a list', refusal({ message: 'conflict' })],
		['a conflict whose list is not a list', refusal({ dependents: 'two' })],
		['a conflict without a body', refusal(null)],
		['an ApiError with an odd payload', new ApiError(409, 'Conflict', 'nope')],
		['a network failure', new TypeError('Failed to fetch')],
		['nothing', undefined]
	])('finds none in %s', (_name, error) => {
		expect(readRuleDependents(error)).toEqual([]);
	});
});
