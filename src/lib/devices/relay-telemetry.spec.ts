import { describe, expect, it } from 'vitest';
import {
	coerceRelayValue,
	compareRelayCreatedAt,
	getRelayState,
	mergeRelayTelemetryRows,
	normalizeRelayTelemetryRow,
	normalizeRelayTelemetryRows
} from './relay-telemetry';
import type { RelayTelemetryRow } from './relay-types';

const row = (overrides: Partial<RelayTelemetryRow> = {}): RelayTelemetryRow => ({
	created_at: '2026-04-05T10:00:00.000Z',
	id: 'row-1',
	relay_1: false,
	relay_2: false,
	...overrides
});

describe('coerceRelayValue', () => {
	it('reads booleans and 1/0, and nothing else', () => {
		expect(coerceRelayValue(true)).toBe(true);
		expect(coerceRelayValue(false)).toBe(false);
		expect(coerceRelayValue(1)).toBe(true);
		expect(coerceRelayValue(0)).toBe(false);
		for (const value of ['1', 'on', 2, null, undefined]) {
			expect(coerceRelayValue(value), String(value)).toBeNull();
		}
	});
});

describe('normalizeRelayTelemetryRow', () => {
	it('keeps the other fields and coerces the relays', () => {
		expect(
			normalizeRelayTelemetryRow({
				id: 7,
				created_at: '2026-04-05T10:00:00.000Z',
				relay_1: 1,
				relay_2: 'unknown',
				rssi: -90
			})
		).toEqual({
			id: '7',
			created_at: '2026-04-05T10:00:00.000Z',
			relay_1: true,
			relay_2: null,
			rssi: -90
		});
	});

	it('prefers last_update over created_at, trimmed', () => {
		expect(
			normalizeRelayTelemetryRow({
				last_update: ' 2026-04-05T10:05:00.000Z ',
				created_at: '2026-04-05T10:00:00.000Z',
				id: 'a'
			})?.created_at
		).toBe('2026-04-05T10:05:00.000Z');
		expect(
			normalizeRelayTelemetryRow({ last_update: '  ', created_at: ' 2026-04-05T10:00:00.000Z ' })
				?.created_at
		).toBe('2026-04-05T10:00:00.000Z');
	});

	it('falls back to data_id, then to the time and states, for the id', () => {
		expect(
			normalizeRelayTelemetryRow({ data_id: 12, created_at: '2026-04-05T10:00:00.000Z' })?.id
		).toBe('12');
		expect(
			normalizeRelayTelemetryRow({
				created_at: '2026-04-05T10:00:00.000Z',
				relay_1: true,
				relay_2: 0
			})?.id
		).toBe('2026-04-05T10:00:00.000Z:true:false');
	});

	it('rejects rows without a time, and anything that is not a row', () => {
		expect(normalizeRelayTelemetryRow({ id: 1, relay_1: true })).toBeNull();
		expect(normalizeRelayTelemetryRow({ created_at: 42 })).toBeNull();
		expect(normalizeRelayTelemetryRow(null)).toBeNull();
		expect(normalizeRelayTelemetryRow([row()])).toBeNull();
		expect(normalizeRelayTelemetryRow('row')).toBeNull();
	});
});

describe('normalizeRelayTelemetryRows', () => {
	it('drops unusable rows, keeps the last copy of an id, and sorts newest first', () => {
		const rows = normalizeRelayTelemetryRows([
			{ id: 'old', created_at: '2026-04-05T09:00:00.000Z', relay_1: false },
			{ id: 'broken' },
			{ id: 'new', created_at: '2026-04-05T11:00:00.000Z', relay_1: false },
			{ id: 'new', created_at: '2026-04-05T11:00:00.000Z', relay_1: true }
		]);

		expect(rows.map(({ id, relay_1 }) => [id, relay_1])).toEqual([
			['new', true],
			['old', false]
		]);
	});

	it('orders rows of the same time by id', () => {
		const at = '2026-04-05T10:00:00.000Z';
		expect(
			normalizeRelayTelemetryRows([
				{ id: 'b', created_at: at },
				{ id: 'a', created_at: at }
			]).map((entry) => entry.id)
		).toEqual(['a', 'b']);
	});
});

describe('compareRelayCreatedAt', () => {
	it('compares times, ranking missing or invalid times oldest', () => {
		expect(compareRelayCreatedAt('2026-04-05T10:00:01Z', '2026-04-05T10:00:00Z')).toBe(1000);
		expect(compareRelayCreatedAt('2026-04-05T10:00:00Z', '2026-04-05T10:00:01Z')).toBe(-1000);
		expect(compareRelayCreatedAt(null, '2026-04-05T10:00:00Z')).toBe(-Infinity);
		expect(compareRelayCreatedAt('2026-04-05T10:00:00Z', 'soon')).toBe(Infinity);
		expect(compareRelayCreatedAt(undefined, '')).toBeNaN();
	});
});

describe('mergeRelayTelemetryRows', () => {
	it('merges collections, later copies of an id winning', () => {
		const merged = mergeRelayTelemetryRows(
			[row({ id: 'a', relay_1: false })],
			[row({ id: 'a', relay_1: true }), row({ id: 'b', created_at: '2026-04-05T09:00:00.000Z' })],
			[]
		);

		expect(merged.map(({ id, relay_1 }) => [id, relay_1])).toEqual([
			['a', true],
			['b', false]
		]);
	});
});

describe('getRelayState', () => {
	it('reads the requested relay of a row', () => {
		const reported = row({ relay_1: true, relay_2: null });
		expect(getRelayState(reported, 1)).toBe(true);
		expect(getRelayState(reported, 2)).toBeNull();
		expect(getRelayState(null, 1)).toBeNull();
		expect(getRelayState(undefined, 2)).toBeNull();
	});
});
