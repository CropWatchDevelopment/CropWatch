/**
 * Central registry for device data table names and their display components.
 *
 * ## How to add a new table type
 *
 * 1. Create a display component in `$lib/components/displays/` that accepts
 *    {@link DeviceDisplayProps} (see `$lib/interfaces/deviceDisplay.ts`).
 * 2. Add an entry to {@link TABLE_REGISTRY} below mapping the table name
 *    (as stored in `cw_device_type.data_table` / returned by the API) to
 *    a lazy `() => import(...)` of your new component.
 * 3. Done — the dispatcher page in `[dev_eui]/+page.svelte` will
 *    automatically pick up the new component at runtime.
 */

import type { DeviceDisplayComponent } from '$lib/interfaces/deviceDisplay';

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/**
 * Maps a `data_table` name (as stored on the device / returned by the API) to
 * a **lazy import** of the Svelte display component that renders that table's
 * data.
 *
 * Using dynamic `import()` means only the component for the current device is
 * ever bundled on a given page load.
 */
export const TABLE_REGISTRY: Record<string, () => Promise<{ default: DeviceDisplayComponent }>> = {
	cw_air_data:   () => import('$lib/components/displays/AirDisplay.svelte'),
	cw_soil_data:  () => import('$lib/components/displays/SoilDisplay.svelte'),
	cw_traffic2:   () => import('$lib/components/displays/TrafficDisplay.svelte'),
	traffic_v2:    () => import('$lib/components/displays/TrafficDisplay.svelte'),
	cw_water_data: () => import('$lib/components/displays/WaterDisplay.svelte'),
	cw_relay_data: () => import('$lib/components/displays/RelayDisplay.svelte'),
	cw_power_data: () => import('$lib/components/displays/PowerDisplay.svelte'),
};

/**
 * Resolve the display component for a given data-table name.
 *
 * Returns the `DefaultDisplay` component when the table is unknown or null,
 * so every device always has *some* renderable view.
 */
export async function resolveDisplayComponent(
	table: string | null | undefined
): Promise<DeviceDisplayComponent> {
	debugger;
	const loader = table ? TABLE_REGISTRY[table] : undefined;
	if (loader) {
		const mod = await loader();
		return mod.default;
	}
	// Fallback — generic auto-discovery display
	const fallback = await import('$lib/components/displays/DefaultDisplay.svelte');
	return fallback.default;
}

// ---------------------------------------------------------------------------
// Convenience helpers (kept for backward-compat / guards in shared code)
// ---------------------------------------------------------------------------

/** All table names known to the registry. */
export const KNOWN_TABLES = Object.keys(TABLE_REGISTRY);

/** Tables that contain time-bucketed traffic / counting data. */
export const TRAFFIC_TABLES = ['cw_traffic2', 'traffic_v2'] as const;

/** Tables that represent relay / actuator state. */
export const RELAY_TABLES = ['cw_relay_data'] as const;

/** Sensor data tables rendered with dedicated or generic display components. */
export const SENSOR_DATA_TABLES = [
	'cw_air_data',
	'cw_soil_data',
	'cw_water_data',
	'cw_power_data'
] as const;

export type TrafficTable = (typeof TRAFFIC_TABLES)[number];
export type RelayTable = (typeof RELAY_TABLES)[number];
export type SensorDataTable = (typeof SENSOR_DATA_TABLES)[number];

export function isTrafficTable(table: string | null | undefined): table is TrafficTable {
	return TRAFFIC_TABLES.includes(table as TrafficTable);
}

export function isRelayTable(table: string | null | undefined): table is RelayTable {
	return RELAY_TABLES.includes(table as RelayTable);
}

export function hasDataTableView(table: string | null | undefined): boolean {
	return table != null && !isTrafficTable(table) && !isRelayTable(table);
}
