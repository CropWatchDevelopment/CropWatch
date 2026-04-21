import { describe, expect, it } from 'vitest';
import type { CwTableQuery } from '@cropwatchdevelopment/cwui';
import type { GatewayDto } from '$lib/api/api.dtos';
import { buildGatewayTableResult, buildGatewayTableRows } from './gateway-table';

function createQuery(overrides: Partial<CwTableQuery> = {}): CwTableQuery {
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

function gateway(overrides: Partial<GatewayDto>): GatewayDto {
	return {
		id: 1,
		gateway_id: 'gw-1',
		gateway_name: 'North Gateway',
		is_online: true,
		is_public: false,
		created_at: '2026-04-22T00:00:00.000Z',
		updated_at: null,
		...overrides
	};
}

describe('gateway table helpers', () => {
	it('builds unique table row keys even when API ids are duplicated or missing', () => {
		const rows = buildGatewayTableRows([
			gateway({ id: 7, gateway_id: 'shared' }),
			gateway({ id: 7, gateway_id: 'shared' }),
			gateway({ id: undefined as unknown as number, gateway_id: '' }),
			gateway({ id: undefined as unknown as number, gateway_id: '' })
		]);

		expect(rows.map((row) => row.tableRowKey)).toEqual([
			'gateway:shared:0',
			'gateway:shared:1',
			'gateway:row-2:0',
			'gateway:row-3:0'
		]);
		expect(new Set(rows.map((row) => row.tableRowKey)).size).toBe(rows.length);
	});

	it('filters, sorts, and paginates while preserving unique row keys', () => {
		const result = buildGatewayTableResult(
			[
				gateway({ gateway_id: 'gw-2', gateway_name: 'Beta', is_online: false }),
				gateway({ gateway_id: 'gw-1', gateway_name: 'Alpha', is_online: true }),
				gateway({ gateway_id: 'gw-3', gateway_name: 'Alpine', is_online: true })
			],
			createQuery({
				page: 1,
				pageSize: 2,
				search: 'Al',
				sort: { column: 'gateway_name', direction: 'desc' }
			})
		);

		expect(result.total).toBe(2);
		expect(result.rows.map((row) => row.gateway_name)).toEqual(['Alpine', 'Alpha']);
		expect(new Set(result.rows.map((row) => row.tableRowKey)).size).toBe(result.rows.length);
	});
});
