import type { CwTableQuery, CwTableResult } from '@cropwatchdevelopment/cwui';
import type { GatewayDto } from '$lib/api/api.dtos';
import { sortByColumn } from '$lib/utils/sortByColumn';

export interface GatewayTableRow extends GatewayDto {
	tableRowKey: string;
}

function getGatewayText(value: unknown): string {
	if (typeof value === 'string') {
		return value;
	}

	if (value == null) {
		return '';
	}

	return String(value);
}

function getGatewayRowBaseKey(gateway: GatewayDto, index: number): string {
	const gatewayId = getGatewayText(gateway.gateway_id).trim();
	if (gatewayId) {
		return gatewayId;
	}

	const id = getGatewayText(gateway.id).trim();
	return id || `row-${index}`;
}

export function buildGatewayTableRows(gateways: GatewayDto[]): GatewayTableRow[] {
	const keyCounts = new Map<string, number>();

	return gateways.map((gateway, index) => {
		const baseKey = getGatewayRowBaseKey(gateway, index);
		const duplicateIndex = keyCounts.get(baseKey) ?? 0;
		keyCounts.set(baseKey, duplicateIndex + 1);

		return {
			...gateway,
			gateway_id: getGatewayText(gateway.gateway_id),
			gateway_name: getGatewayText(gateway.gateway_name),
			tableRowKey: `gateway:${baseKey}:${duplicateIndex}`
		};
	});
}

export function filterGatewayRows(rows: GatewayTableRow[], search: string): GatewayTableRow[] {
	const normalizedSearch = search.trim().toLowerCase();
	if (!normalizedSearch) {
		return rows;
	}

	return rows.filter(
		(row) =>
			row.gateway_name.toLowerCase().includes(normalizedSearch) ||
			row.gateway_id.toLowerCase().includes(normalizedSearch)
	);
}

export function buildGatewayTableResult(
	gateways: GatewayDto[],
	query: CwTableQuery
): CwTableResult<GatewayTableRow> {
	let rows = filterGatewayRows(buildGatewayTableRows(gateways), query.search ?? '');

	if (query.sort) {
		rows = sortByColumn(rows, query.sort.column, query.sort.direction, {
			nullsLast: true,
			collator: { numeric: true, sensitivity: 'base' }
		});
	}

	const total = rows.length;
	const skip = (query.page - 1) * query.pageSize;

	return {
		rows: rows.slice(skip, skip + query.pageSize),
		total
	};
}
