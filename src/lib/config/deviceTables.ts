/**
 * Central registry for device data table names and their display components.
 *
 * ## How to add a new table type
 *
 * 1. Create a display component in `$lib/components/displays/` that accepts
 *    {@link DeviceDisplayProps} (see `$lib/interfaces/deviceDisplay.ts`).
 * 2. Add an entry to {@link TABLE_REGISTRY} below mapping the table name
 *    (as stored in `cw_device_type.data_table`) to the component.
 * 3. Done — the device page dispatcher will automatically pick it up.
 *
 * This registry is intentionally synchronous. The route only has a handful of
 * displays, and avoiding async component resolution keeps the page render path
 * simpler and easier to debug.
 */

import AirDisplay from '$lib/components/displays/AirDisplay/AirDisplay.svelte';
import DefaultDisplay from '$lib/components/displays/DefaultDisplay.svelte';
import PowerDisplay from '$lib/components/displays/PowerDisplay/PowerDisplay.svelte';
import RelayDisplay from '$lib/components/displays/RelayDisplay/RelayDisplay.svelte';
import SoilDisplay from '$lib/components/displays/SoilDisplay/SoilDisplay.svelte';
import TrafficDisplay from '$lib/components/displays/TrafficDisplay/TrafficDisplay.svelte';
import WaterDisplay from '$lib/components/displays/WaterDisplay/WaterDisplay.svelte';
import type { DeviceDisplayComponent } from '$lib/interfaces/deviceDisplay';

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/** Maps a `data_table` name to the component that renders that telemetry. */
export const TABLE_REGISTRY: Record<string, DeviceDisplayComponent> = {
	cw_air_data: AirDisplay,
	cw_soil_data: SoilDisplay,
	cw_traffic2: TrafficDisplay,
	traffic_v2: TrafficDisplay,
	cw_water_data: WaterDisplay,
	cw_relay_data: RelayDisplay,
	cw_power_data: PowerDisplay
};

/**
 * Resolve the display component for a given data-table name.
 *
 * Returns the `DefaultDisplay` component when the table is unknown or null,
 * so every device always has *some* renderable view.
 */
export function resolveDisplayComponent(table: string | null | undefined): DeviceDisplayComponent {
	if (!table) {
		return DefaultDisplay;
	}

	return TABLE_REGISTRY[table] ?? DefaultDisplay;
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
