import { ApiServiceError } from '$lib/api/api.service';
import type { RelayStateSnapshot, RelayVerificationResult } from '$lib/devices/relay-control';
import { getRelayState, normalizeRelayTelemetryRow } from '$lib/devices/relay-telemetry';
import type { RelayNumber, RelayTargetState } from '$lib/devices/relay-types';
import { m } from '$lib/paraglide/messages.js';
import { SvelteDate } from 'svelte/reactivity';

export type RangeSelection = 'today' | 24 | 48 | 72;
export type TelemetryRow = Record<string, unknown>;

export interface TimeRangeOptions {
	label: string;
	value: RangeSelection;
}

export interface RouteState {
	requestedHistoricalData: TelemetryRow[] | null;
	activeRange: RangeSelection | null;
	fetching: boolean;
	fetchError: string | null;
}

const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
export const DEFAULT_RANGE_SELECTION: RangeSelection = 'today';
export const MAX_RANGE_RECORDS = 1500;

export function isTelemetryRow(value: unknown): value is TelemetryRow {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeTelemetryRows(value: unknown): TelemetryRow[] {
	if (Array.isArray(value)) {
		return value.filter(isTelemetryRow);
	}

	if (isTelemetryRow(value) && Array.isArray(value.data)) {
		return value.data.filter(isTelemetryRow);
	}

	return [];
}

export function readLocationName(value: unknown): string {
	if (!isTelemetryRow(value)) {
		return m.devices_unknown_location();
	}

	const locationRecord = value.cw_locations;
	if (
		isTelemetryRow(locationRecord) &&
		typeof locationRecord.name === 'string' &&
		locationRecord.name.trim()
	) {
		return locationRecord.name;
	}

	if (typeof value.location_name === 'string' && value.location_name.trim()) {
		return value.location_name;
	}

	return m.devices_unknown_location();
}

export function readCreatedAt(value: TelemetryRow | null | undefined): string | null {
	return value && typeof value.created_at === 'string' ? value.created_at : null;
}

export function readRelayTelemetryRow(value: unknown): TelemetryRow | null {
	const normalizedRow = normalizeRelayTelemetryRow(value);
	if (normalizedRow) {
		return normalizedRow;
	}

	if (isTelemetryRow(value)) {
		const nestedRow = normalizeRelayTelemetryRow(value.data);
		if (nestedRow) {
			return nestedRow;
		}
	}

	const [firstRow] = normalizeTelemetryRows(value);
	return firstRow ?? null;
}

export function getRangeOptions(): TimeRangeOptions[] {
	return [
		{ label: m.devices_range_today_only(), value: DEFAULT_RANGE_SELECTION },
		{ label: m.devices_range_last_hours({ hours: '24' }), value: 24 },
		{ label: m.devices_range_last_hours({ hours: '48' }), value: 48 },
		{ label: m.devices_range_last_hours({ hours: '72' }), value: 72 }
	];
}

export function toIsoString(value: Date | string): string {
	return new Date(value).toISOString();
}

export function createRouteState(): RouteState {
	return {
		requestedHistoricalData: null,
		activeRange: null,
		fetching: false,
		fetchError: null
	};
}

export function createEmptyRelaySnapshot(): RelayStateSnapshot {
	return {
		historicalData: [],
		latestData: null,
		pendingRelayStates: {}
	};
}

export function getRangeBounds(selection: RangeSelection): { start: string; end: string } {
	const end = new SvelteDate();
	const endTime = end.getTime();
	if (selection === 'today') {
		const start = new SvelteDate(endTime);
		start.setHours(0, 0, 0, 0);
		return {
			start: start.toISOString(),
			end: end.toISOString()
		};
	}

	return {
		start: new SvelteDate(endTime - selection * MILLISECONDS_PER_HOUR).toISOString(),
		end: end.toISOString()
	};
}

export function getRelayTargetStateLabel(targetState: RelayTargetState): string {
	return targetState === 'on' ? m.display_on() : m.display_off();
}

export function getVerifiedRelayStateLabel(
	relay: RelayNumber,
	row: Record<string, unknown> | null
): string {
	const value = getRelayState(normalizeRelayTelemetryRow(row), relay);
	if (value === null) {
		return m.display_unknown();
	}

	return value ? m.display_on() : m.display_off();
}

export function mapRelayApiErrorMessage(error: unknown): string {
	if (!(error instanceof ApiServiceError)) {
		return m.devices_relay_command_failed();
	}

	switch (error.status) {
		case 401:
		case 403:
			return m.devices_relay_downlink_not_authorized();
		case 404:
			return m.devices_relay_downlink_target_not_found();
		case 429:
			return m.devices_relay_downlink_rate_limited();
		default:
			return m.devices_relay_command_failed();
	}
}

export type RelayConfirmationHandler = (result: RelayVerificationResult) => void;
