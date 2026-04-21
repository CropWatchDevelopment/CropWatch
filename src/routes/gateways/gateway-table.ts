import type { CwTableQuery, CwTableResult } from '@cropwatchdevelopment/cwui';
import type { GatewayDto } from '$lib/api/api.dtos';

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

export function sortGatewayRows(
	rows: GatewayTableRow[],
	column: string,
	direction: 'asc' | 'desc'
): GatewayTableRow[] {
	const dir = direction === 'asc' ? 1 : -1;

	return [...rows].sort((left, right) => {
		const leftValue = (left as unknown as Record<string, unknown>)[column];
		const rightValue = (right as unknown as Record<string, unknown>)[column];

		if (leftValue == null && rightValue == null) return 0;
		if (leftValue == null) return dir;
		if (rightValue == null) return -dir;

		if (typeof leftValue === 'boolean' && typeof rightValue === 'boolean') {
			return (Number(leftValue) - Number(rightValue)) * dir;
		}

		if (typeof leftValue === 'number' && typeof rightValue === 'number') {
			return (leftValue - rightValue) * dir;
		}

		return (
			getGatewayText(leftValue).localeCompare(getGatewayText(rightValue), undefined, {
				numeric: true,
				sensitivity: 'base'
			}) * dir
		);
	});
}

export function buildGatewayTableResult(
	gateways: GatewayDto[],
	query: CwTableQuery
): CwTableResult<GatewayTableRow> {
	let rows = filterGatewayRows(buildGatewayTableRows(gateways), query.search ?? '');

	if (query.sort) {
		rows = sortGatewayRows(rows, query.sort.column, query.sort.direction);
	}

	const total = rows.length;
	const skip = (query.page - 1) * query.pageSize;

	return {
		rows: rows.slice(skip, skip + query.pageSize),
		total
	};
}
