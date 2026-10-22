import { describe, expect, it } from 'vitest';
import type { CwTableQuery } from '@cropwatchdevelopment/cwui';
import { createClientTableLoader } from './clientTableLoader';

interface Row {
	id: string;
	created_at: string;
	value: number;
}

const rows: Row[] = [
	{ id: 'a', created_at: '2026-01-01T00:00:00Z', value: 30 },
	{ id: 'b', created_at: '2026-01-02T00:00:00Z', value: 10 },
	{ id: 'c', created_at: '2026-01-03T00:00:00Z', value: 20 },
	{ id: 'd', created_at: '2026-01-04T00:00:00Z', value: 40 }
];

function query(overrides: Partial<CwTableQuery> = {}): CwTableQuery {
	return {
		page: 1,
		pageSize: 25,
		search: '',
		sort: null,
		filters: {},
		signal: new AbortController().signal,
		...overrides
	};
}

describe('createClientTableLoader', () => {
	it('slices rows to the requested page and reports the full total', async () => {
		const load = createClientTableLoader(() => rows);

		const pageOne = await load(query({ pageSize: 3 }));
		expect(pageOne.rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
		expect(pageOne.total).toBe(4);

		const pageTwo = await load(query({ page: 2, pageSize: 3 }));
		expect(pageTwo.rows.map((r) => r.id)).toEqual(['d']);
		expect(pageTwo.total).toBe(4);
	});

	it('reverses the source rows when configured', async () => {
		const load = createClientTableLoader(() => rows, { reverse: true });

		const result = await load(query());
		expect(result.rows.map((r) => r.id)).toEqual(['d', 'c', 'b', 'a']);
	});

	it('sorts numeric columns numerically and honours the direction', async () => {
		const load = createClientTableLoader(() => rows);

		const asc = await load(query({ sort: { column: 'value', direction: 'asc' } }));
		expect(asc.rows.map((r) => r.value)).toEqual([10, 20, 30, 40]);

		const desc = await load(query({ sort: { column: 'value', direction: 'desc' } }));
		expect(desc.rows.map((r) => r.value)).toEqual([40, 30, 20, 10]);
	});

	it('supports a custom sort function', async () => {
		const load = createClientTableLoader(() => rows, {
			sort: (input, _column, direction) =>
				[...input].sort((a, b) => (a.id < b.id ? 1 : -1) * (direction === 'asc' ? 1 : -1))
		});

		const result = await load(query({ sort: { column: 'id', direction: 'asc' } }));
		expect(result.rows.map((r) => r.id)).toEqual(['d', 'c', 'b', 'a']);
	});

	it('filters case-insensitively via searchText and paginates the filtered set', async () => {
		const load = createClientTableLoader(() => rows, {
			searchText: (row) => `${row.created_at} ${row.value}`
		});

		const result = await load(query({ search: ' 2026-01-0 ' }));
		expect(result.rows).toHaveLength(4);

		const filtered = await load(query({ search: '40' }));
		expect(filtered.rows.map((r) => r.id)).toEqual(['d']);
		expect(filtered.total).toBe(1);
	});

	it('ignores the search when no searchText is configured', async () => {
		const load = createClientTableLoader(() => rows);

		const result = await load(query({ search: 'no-such-row' }));
		expect(result.rows).toHaveLength(4);
	});

	it('reports loading-state transitions around each query', async () => {
		const transitions: boolean[] = [];
		const load = createClientTableLoader(() => rows, {
			onLoadingChange: (loading) => transitions.push(loading)
		});

		await load(query());
		expect(transitions).toEqual([true, false]);
	});

	it('ends the loading state even when building the page fails', async () => {
		const transitions: boolean[] = [];
		const load = createClientTableLoader(() => rows, {
			sort: () => {
				throw new Error('bad column');
			},
			onLoadingChange: (loading) => transitions.push(loading)
		});

		await expect(load(query({ sort: { column: 'value', direction: 'asc' } }))).rejects.toThrow(
			'bad column'
		);
		expect(transitions).toEqual([true, false]);
	});

	it('reads the rows afresh on every query, so a live source stays current', async () => {
		let source: Row[] = rows.slice(0, 2);
		const load = createClientTableLoader(() => source);
		expect((await load(query())).total).toBe(2);

		source = rows;

		expect((await load(query())).total).toBe(4);
	});

	it('never reorders the source rows', async () => {
		const source = [...rows];
		const load = createClientTableLoader(() => source, { reverse: true });

		await load(query({ sort: { column: 'value', direction: 'asc' } }));

		expect(source.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
	});

	it('treats a blank search as no search and a page before the first as the first', async () => {
		const load = createClientTableLoader(() => rows, { searchText: (row) => row.id });

		expect((await load(query({ search: '   ' }))).rows).toHaveLength(4);
		expect((await load(query({ page: 0, pageSize: 2 }))).rows.map((r) => r.id)).toEqual(['a', 'b']);
	});

	it('returns an empty page past the end, still reporting the total', async () => {
		const load = createClientTableLoader(() => rows);

		expect(await load(query({ page: 3, pageSize: 3 }))).toEqual({ rows: [], total: 4 });
	});
});
