import type { PaginatedResponse } from '../api.dtos';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

/** Finds the row array in a bare array, `{data|result|items}`, or one level deeper. */
function extractListPayload<T>(payload: unknown): T[] | null {
	if (Array.isArray(payload)) {
		return payload as T[];
	}

	if (!isRecord(payload)) {
		return null;
	}

	const candidates = [
		payload.data,
		payload.result,
		payload.items,
		isRecord(payload.data) ? payload.data.data : undefined,
		isRecord(payload.data) ? payload.data.items : undefined,
		isRecord(payload.result) ? payload.result.data : undefined,
		isRecord(payload.result) ? payload.result.items : undefined
	];

	for (const candidate of candidates) {
		if (Array.isArray(candidate)) {
			return candidate as T[];
		}
	}

	return null;
}

function resolvePaginatedTotal(payload: unknown, fallback: number): number {
	if (!isRecord(payload)) {
		return fallback;
	}

	const candidates = [
		payload.total,
		payload.count,
		payload.totalItems,
		isRecord(payload.data) ? payload.data.total : undefined,
		isRecord(payload.data) ? payload.data.count : undefined,
		isRecord(payload.result) ? payload.result.total : undefined,
		isRecord(payload.result) ? payload.result.count : undefined
	];

	for (const candidate of candidates) {
		if (isFiniteNumber(candidate)) {
			return Math.max(0, candidate);
		}
	}

	return fallback;
}

/** Normalizes any list-shaped API payload to `{ data, total }`. */
export function normalizePaginatedListResponse<T>(payload: unknown): PaginatedResponse<T> {
	const items = extractListPayload<T>(payload) ?? [];
	return {
		data: items,
		total: resolvePaginatedTotal(payload, items.length)
	};
}
