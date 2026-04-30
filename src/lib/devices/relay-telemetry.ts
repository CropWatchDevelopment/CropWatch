import type { RelayNumber, RelayTargetState, RelayTelemetryRow } from './relay-types';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function coerceRelayValue(value: unknown): boolean | null {
	if (typeof value === 'boolean') return value;
	if (value === 1) return true;
	if (value === 0) return false;
	return null;
}

export function normalizeRelayTelemetryRow(value: unknown): RelayTelemetryRow | null {
	if (!isRecord(value)) return null;

	const createdAt =
		(typeof value.last_update === 'string' && value.last_update.trim()) ||
		(typeof value.created_at === 'string' && value.created_at.trim()) ||
		'';
	if (!createdAt) return null;

	const relay1 = coerceRelayValue(value.relay_1);
	const relay2 = coerceRelayValue(value.relay_2);
	const id = String(value.id ?? value.data_id ?? `${createdAt}:${relay1}:${relay2}`);

	return { ...value, created_at: createdAt, id, relay_1: relay1, relay_2: relay2 };
}

export function normalizeRelayTelemetryRows(
	values: Record<string, unknown>[]
): RelayTelemetryRow[] {
	return dedupeAndSort(
		values.reduce<RelayTelemetryRow[]>((acc, value) => {
			const row = normalizeRelayTelemetryRow(value);
			if (row) acc.push(row);
			return acc;
		}, [])
	);
}

function parseTime(value: string | null | undefined): number {
	if (!value) return -Infinity;
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? -Infinity : parsed;
}

export function compareRelayCreatedAt(
	left: string | null | undefined,
	right: string | null | undefined
): number {
	return parseTime(left) - parseTime(right);
}

function dedupeAndSort(rows: RelayTelemetryRow[]): RelayTelemetryRow[] {
	const byId = new Map<string, RelayTelemetryRow>();
	for (const row of rows) byId.set(row.id, row);
	return [...byId.values()].sort(
		(a, b) => compareRelayCreatedAt(b.created_at, a.created_at) || a.id.localeCompare(b.id)
	);
}

export function mergeRelayTelemetryRows(
	...collections: Array<ReadonlyArray<RelayTelemetryRow>>
): RelayTelemetryRow[] {
	return dedupeAndSort(collections.flat());
}

export function getRelayState(
	row: RelayTelemetryRow | null | undefined,
	relay: RelayNumber
): boolean | null {
	if (!row) return null;
	return relay === 1 ? row.relay_1 : row.relay_2;
}

export function relayStateMatchesTarget(
	row: RelayTelemetryRow | null | undefined,
	relay: RelayNumber,
	targetState: RelayTargetState
): boolean {
	const value = getRelayState(row, relay);
	if (value === null) return false;
	return targetState === 'on' ? value : !value;
}
