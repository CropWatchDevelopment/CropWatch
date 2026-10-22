import { describe, expect, it, vi } from 'vitest';
import AirDisplay from '$lib/components/displays/AirDisplay/AirDisplay.svelte';
import DefaultDisplay from '$lib/components/displays/DefaultDisplay.svelte';
import PowerDisplay from '$lib/components/displays/PowerDisplay/PowerDisplay.svelte';
import RelayDisplay from '$lib/components/displays/RelayDisplay/RelayDisplay.svelte';
import SoilDisplay from '$lib/components/displays/SoilDisplay/SoilDisplay.svelte';
import TrafficDisplay from '$lib/components/displays/TrafficDisplay/TrafficDisplay.svelte';
import WaterDisplay from '$lib/components/displays/WaterDisplay/WaterDisplay.svelte';
import {
	KNOWN_TABLES,
	RELAY_TABLES,
	SENSOR_DATA_TABLES,
	TABLE_REGISTRY,
	TRAFFIC_TABLES,
	hasDataTableView,
	isRelayTable,
	isTrafficTable,
	resolveDisplayComponent
} from './deviceTables';

// Stand-ins for the component modules: the registry only maps tables to
// components, so this node spec need not compile every display for the server
// (the displays themselves are tested in the browser, next to each one).
vi.mock('$lib/components/displays/AirDisplay/AirDisplay.svelte', () => ({ default: 'AirDisplay' }));
vi.mock('$lib/components/displays/DefaultDisplay.svelte', () => ({ default: 'DefaultDisplay' }));
vi.mock('$lib/components/displays/PowerDisplay/PowerDisplay.svelte', () => ({
	default: 'PowerDisplay'
}));
vi.mock('$lib/components/displays/RelayDisplay/RelayDisplay.svelte', () => ({
	default: 'RelayDisplay'
}));
vi.mock('$lib/components/displays/SoilDisplay/SoilDisplay.svelte', () => ({
	default: 'SoilDisplay'
}));
vi.mock('$lib/components/displays/TrafficDisplay/TrafficDisplay.svelte', () => ({
	default: 'TrafficDisplay'
}));
vi.mock('$lib/components/displays/WaterDisplay/WaterDisplay.svelte', () => ({
	default: 'WaterDisplay'
}));

describe('device display registry', () => {
	it('maps each data table to its display', () => {
		expect(resolveDisplayComponent('cw_air_data')).toBe(AirDisplay);
		expect(resolveDisplayComponent('cw_soil_data')).toBe(SoilDisplay);
		expect(resolveDisplayComponent('cw_traffic2')).toBe(TrafficDisplay);
		expect(resolveDisplayComponent('traffic_v2')).toBe(TrafficDisplay);
		expect(resolveDisplayComponent('cw_water_data')).toBe(WaterDisplay);
		expect(resolveDisplayComponent('cw_relay_data')).toBe(RelayDisplay);
		expect(resolveDisplayComponent('cw_power_data')).toBe(PowerDisplay);
		expect(KNOWN_TABLES).toEqual(Object.keys(TABLE_REGISTRY));
	});

	it('falls back to the generic display for an unknown or missing table', () => {
		expect(resolveDisplayComponent('cw_unknown_data')).toBe(DefaultDisplay);
		expect(resolveDisplayComponent('')).toBe(DefaultDisplay);
		expect(resolveDisplayComponent(null)).toBe(DefaultDisplay);
		expect(resolveDisplayComponent(undefined)).toBe(DefaultDisplay);
	});

	it('tells traffic and relay tables apart from sensor tables', () => {
		for (const table of TRAFFIC_TABLES) {
			expect(isTrafficTable(table)).toBe(true);
			expect(isRelayTable(table)).toBe(false);
			expect(hasDataTableView(table)).toBe(false);
		}
		for (const table of RELAY_TABLES) {
			expect(isRelayTable(table)).toBe(true);
			expect(isTrafficTable(table)).toBe(false);
			expect(hasDataTableView(table)).toBe(false);
		}
		for (const table of [...SENSOR_DATA_TABLES, 'cw_unknown_data']) {
			expect(isTrafficTable(table)).toBe(false);
			expect(isRelayTable(table)).toBe(false);
			expect(hasDataTableView(table)).toBe(true);
		}
	});

	it('treats a missing table as neither, without a data table view', () => {
		for (const table of [null, undefined]) {
			expect(isTrafficTable(table)).toBe(false);
			expect(isRelayTable(table)).toBe(false);
			expect(hasDataTableView(table)).toBe(false);
		}
	});
});
