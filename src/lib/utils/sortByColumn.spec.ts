import { describe, expect, it } from 'vitest';
import { sortByColumn } from './sortByColumn';

interface Row {
	id: string;
	name?: string | null;
	value?: number | string | null;
	active?: boolean;
}

const ids = (rows: Row[]) => rows.map((row) => row.id);

describe('sortByColumn', () => {
	it('compares numbers numerically in both directions', () => {
		const rows: Row[] = [
			{ id: 'a', value: 10 },
			{ id: 'b', value: 9 },
			{ id: 'c', value: 100 }
		];

		expect(ids(sortByColumn(rows, 'value', 'asc'))).toEqual(['b', 'a', 'c']);
		expect(ids(sortByColumn(rows, 'value', 'desc'))).toEqual(['c', 'a', 'b']);
	});

	it('compares booleans as numbers (false before true ascending)', () => {
		const rows: Row[] = [
			{ id: 'on', active: true },
			{ id: 'off', active: false }
		];

		expect(ids(sortByColumn(rows, 'active', 'asc'))).toEqual(['off', 'on']);
		expect(ids(sortByColumn(rows, 'active', 'desc'))).toEqual(['on', 'off']);
	});

	it('falls back to a string comparison for text and mixed types', () => {
		const rows: Row[] = [
			{ id: 'a', name: 'Charlie' },
			{ id: 'b', name: 'alpha' },
			{ id: 'c', name: 'Bravo' }
		];
		expect(ids(sortByColumn(rows, 'name', 'asc'))).toEqual(['b', 'c', 'a']);
		expect(ids(sortByColumn(rows, 'name', 'desc'))).toEqual(['a', 'c', 'b']);

		// A number next to a string is compared as text: '10' < '9'.
		const mixed: Row[] = [
			{ id: 'nine', value: '9' },
			{ id: 'ten', value: 10 }
		];
		expect(ids(sortByColumn(mixed, 'value', 'asc'))).toEqual(['ten', 'nine']);
	});

	it('sorts missing cells as empty text by default (first ascending)', () => {
		const rows: Row[] = [
			{ id: 'named', name: 'Alpha' },
			{ id: 'null', name: null },
			{ id: 'missing' }
		];

		expect(ids(sortByColumn(rows, 'name', 'asc'))).toEqual(['null', 'missing', 'named']);
	});

	it('puts missing cells last ascending (and first descending) with nullsLast', () => {
		const rows: Row[] = [
			{ id: 'null', value: null },
			{ id: 'two', value: 2 },
			{ id: 'missing' },
			{ id: 'one', value: 1 }
		];

		expect(ids(sortByColumn(rows, 'value', 'asc', { nullsLast: true }))).toEqual([
			'one',
			'two',
			'null',
			'missing'
		]);
		expect(ids(sortByColumn(rows, 'value', 'desc', { nullsLast: true }))).toEqual([
			'null',
			'missing',
			'two',
			'one'
		]);
	});

	it('compares numericColumns with Number() whatever the runtime type', () => {
		const rows: Row[] = [
			{ id: 'ten', value: '10' },
			{ id: 'nine', value: '9' },
			{ id: 'hundred', value: '100' }
		];

		expect(ids(sortByColumn(rows, 'value', 'asc', { numericColumns: ['value'] }))).toEqual([
			'nine',
			'ten',
			'hundred'
		]);
		expect(ids(sortByColumn(rows, 'value', 'desc', { numericColumns: ['value'] }))).toEqual([
			'hundred',
			'ten',
			'nine'
		]);
		// Other columns keep the default comparison.
		expect(ids(sortByColumn(rows, 'value', 'asc', { numericColumns: ['name'] }))).toEqual([
			'ten',
			'hundred',
			'nine'
		]);
	});

	it('passes the collator options to the string comparison', () => {
		const rows: Row[] = [
			{ id: 'ten', name: 'Sensor 10' },
			{ id: 'two', name: 'Sensor 2' }
		];

		expect(ids(sortByColumn(rows, 'name', 'asc'))).toEqual(['ten', 'two']);
		expect(ids(sortByColumn(rows, 'name', 'asc', { collator: { numeric: true } }))).toEqual([
			'two',
			'ten'
		]);
	});

	it('returns a new array and leaves the input untouched', () => {
		const rows: Row[] = [
			{ id: 'b', value: 2 },
			{ id: 'a', value: 1 }
		];

		const sorted = sortByColumn(rows, 'value', 'asc');

		expect(sorted).not.toBe(rows);
		expect(ids(rows)).toEqual(['b', 'a']);
		expect(ids(sorted)).toEqual(['a', 'b']);
	});
});
