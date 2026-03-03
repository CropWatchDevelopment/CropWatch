/**
 * Central registry for device data table names and their display behaviour.
 *
 * Adding a new table here is the only change needed to give it a display view:
 *  - Traffic tables  → WeatherCalendar component
 *  - Relay tables    → RelayControl component (handled separately in the layout)
 *  - Everything else → generic DataTable component
 */

/** Tables that contain time-bucketed traffic / counting data. */
export const TRAFFIC_TABLES = ['cw_traffic2', 'traffic_v2'] as const;

/** Tables that represent relay / actuator state (no scrollable history table). */
export const RELAY_TABLES = ['cw_relay_data'] as const;

/**
 * Sensor data tables that are rendered with the generic DataTable component.
 * This list is kept for documentation purposes; the helper `hasDataTableView`
 * will also return `true` for any table not in TRAFFIC_TABLES or RELAY_TABLES.
 */
export const SENSOR_DATA_TABLES = [
	'cw_air_data',
	'cw_soil_data',
	'cw_water_data',
	'cw_power_data'
] as const;

export type TrafficTable = (typeof TRAFFIC_TABLES)[number];
export type RelayTable = (typeof RELAY_TABLES)[number];
export type SensorDataTable = (typeof SENSOR_DATA_TABLES)[number];

/** Returns true when the table contains time-bucketed traffic / counting data. */
export function isTrafficTable(table: string | null | undefined): table is TrafficTable {
	return TRAFFIC_TABLES.includes(table as TrafficTable);
}

/** Returns true when the table represents relay / actuator state. */
export function isRelayTable(table: string | null | undefined): table is RelayTable {
	return RELAY_TABLES.includes(table as RelayTable);
}

/**
 * Returns true when the table should be displayed with the generic DataTable component.
 * This is true for every non-null table that is neither a traffic table nor a relay table.
 */
export function hasDataTableView(table: string | null | undefined): boolean {
	return table != null && !isTrafficTable(table) && !isRelayTable(table);
}
