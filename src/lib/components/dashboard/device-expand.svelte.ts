/**
 * device-expand.svelte.ts
 *
 * Manages the fetch lifecycle for sensor card expanded detail rows.
 *
 * Each device moves through these states:
 *   (absent)  → not yet requested — card shows its built-in default rows
 *   loading   → API call in flight — card shows placeholder rows
 *   loaded    → rows ready — card shows live sensor readings
 *   error     → fetch failed — rate-limited until next interval; user can
 *               retry by collapsing and re-expanding the device slot
 */

import type { CwSensorCardDetailRow } from '@cropwatchdevelopment/cwui';
import { ApiService } from '$lib/api/api.service';
import type { IDevice } from '$lib/interfaces/device.interface';
import { buildDeviceExpandedDetailRows } from './device-cards';
import { resolveDeviceTypeConfig, type DeviceTypeLookup } from './dashboard-device-data';
import { DASHBOARD_DEVICE_REFRESH_INTERVAL_MS } from './dashboard-device-refresh';

type ExpandStatus = 'loading' | 'loaded' | 'error';

interface ExpandEntry {
	status: ExpandStatus;
	rows: CwSensorCardDetailRow[] | null;
	/** Coerced raw payload from /latest-data — numeric strings already converted to numbers. */
	rawData: Record<string, unknown> | null;
}

/**
 * Some sensor fields arrive as string-encoded numbers from the API
 * (e.g. ec, moisture, pH, deapth_cm). Coerce them so numeric comparisons work correctly.
 */
function coerceStringNumbers(raw: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(raw).map(([k, v]) => [
			k,
			typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : v
		])
	);
}

export function createDeviceExpandManager() {
	let entries = $state<Record<string, ExpandEntry>>({});

	/**
	 * Tracks the last fetch-attempt timestamp per device.
	 * Kept separate from the reactive `entries` so that `clear()` (called on
	 * collapse, including component-destruction collapses) cannot reset it.
	 * This prevents the re-creation of {#key renderKey} cards from bypassing
	 * the rate limiter and spamming the API.
	 */
	const rateLimitMs: Record<string, number> = {};

	/** True when rows should be rendered for this device (loading or loaded). */
	function isActive(devEui: string): boolean {
		const e = entries[devEui];
		return e?.status === 'loading' || e?.status === 'loaded';
	}

	/** Returns the loaded detail rows, or null while still loading. */
	function getRows(devEui: string): CwSensorCardDetailRow[] | null {
		const e = entries[devEui];
		return e?.status === 'loaded' ? (e.rows ?? null) : null;
	}

	/**
	 * Returns the fresh primary sensor value for this device, applying the type-config
	 * multiplier/divider if present. Returns null if not yet loaded or the key is missing.
	 * Used to keep the card header in sync with the expanded data.
	 */
	function getPrimaryValue(
		devEui: string,
		sourceDevice: IDevice,
		deviceTypeLookup: DeviceTypeLookup | undefined
	): number | null {
		const e = entries[devEui];
		if (e?.status !== 'loaded' || !e.rawData) return null;

		const typeConfig = resolveDeviceTypeConfig(sourceDevice, deviceTypeLookup);
		const primaryKey = typeConfig?.primary_data_key;
		if (!primaryKey) return null;

		const raw = e.rawData[primaryKey];
		if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;

		let value = raw;
		if (typeConfig?.primary_multiplier != null && typeConfig.primary_multiplier !== 0) {
			value *= typeConfig.primary_multiplier;
		}
		if (typeConfig?.primary_divider != null && typeConfig.primary_divider !== 0) {
			value /= typeConfig.primary_divider;
		}
		return value;
	}

	/**
	 * Start fetching expanded data for a device.
	 * Safe to call multiple times — skips if already active or rate-limited.
	 */
	async function load(
		devEui: string,
		accessToken: string,
		sourceDevice: IDevice,
		deviceTypeLookup: DeviceTypeLookup | undefined,
		label: string
	): Promise<void> {
		if (isActive(devEui)) return;

		// Rate-limit check uses the separate non-reactive record so that collapse
		// (including component-destruction via {#key renderKey}) never resets it.
		if (Date.now() - (rateLimitMs[devEui] ?? 0) < DASHBOARD_DEVICE_REFRESH_INTERVAL_MS) return;

		rateLimitMs[devEui] = Date.now();
		entries[devEui] = { status: 'loading', rows: null, rawData: null };

		try {
			const raw = await new ApiService({ authToken: accessToken }).getDeviceLatestData(devEui);
			const coerced = coerceStringNumbers(raw);
			const typeConfig = resolveDeviceTypeConfig(sourceDevice, deviceTypeLookup);
			const uploadIntervalMinutes =
				(sourceDevice.upload_interval != null && sourceDevice.upload_interval > 0
					? sourceDevice.upload_interval
					: null) ?? typeConfig?.default_upload_interval ?? undefined;
			entries[devEui] = {
				status: 'loaded',
				rows: buildDeviceExpandedDetailRows(coerced, typeConfig, label, uploadIntervalMinutes),
				rawData: coerced
			};
		} catch {
			// Rate limit is preserved in rateLimitMs regardless of collapse/re-expand,
			// so this error state blocks retries for the full interval window.
			entries[devEui] = { status: 'error', rows: null, rawData: null };
		}
	}

	/** Remove a device's entry entirely (called when the user collapses a slot). */
	function clear(devEui: string): void {
		delete entries[devEui];
	}

	/**
	 * Drop loaded rows without touching the rate-limit timestamp.
	 * Used after a background refresh so the next expand fetches fresh data,
	 * but without opening the door to a rapid re-fetch loop.
	 */
	function invalidate(devEui: string): void {
		if (entries[devEui]?.status === 'loaded') {
			delete entries[devEui];
		}
	}

	return { isActive, getRows, getPrimaryValue, load, clear, invalidate };
}
