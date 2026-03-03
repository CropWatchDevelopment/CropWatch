import { describe, it, expect } from 'vitest';
import {
	isTrafficTable,
	isRelayTable,
	hasDataTableView,
	TRAFFIC_TABLES,
	RELAY_TABLES,
	SENSOR_DATA_TABLES
} from '../../config/deviceTables';

describe('deviceTables config', () => {
	describe('isTrafficTable', () => {
		it('returns true for cw_traffic2', () => {
			expect(isTrafficTable('cw_traffic2')).toBe(true);
		});

		it('returns true for traffic_v2', () => {
			expect(isTrafficTable('traffic_v2')).toBe(true);
		});

		it('returns false for cw_air_data', () => {
			expect(isTrafficTable('cw_air_data')).toBe(false);
		});

		it('returns false for null', () => {
			expect(isTrafficTable(null)).toBe(false);
		});

		it('returns false for undefined', () => {
			expect(isTrafficTable(undefined)).toBe(false);
		});
	});

	describe('isRelayTable', () => {
		it('returns true for cw_relay_data', () => {
			expect(isRelayTable('cw_relay_data')).toBe(true);
		});

		it('returns false for cw_air_data', () => {
			expect(isRelayTable('cw_air_data')).toBe(false);
		});

		it('returns false for null', () => {
			expect(isRelayTable(null)).toBe(false);
		});

		it('returns false for undefined', () => {
			expect(isRelayTable(undefined)).toBe(false);
		});
	});

	describe('hasDataTableView', () => {
		it.each(SENSOR_DATA_TABLES)('returns true for sensor table %s', (table) => {
			expect(hasDataTableView(table)).toBe(true);
		});

		it.each(TRAFFIC_TABLES)('returns false for traffic table %s', (table) => {
			expect(hasDataTableView(table)).toBe(false);
		});

		it.each(RELAY_TABLES)('returns false for relay table %s', (table) => {
			expect(hasDataTableView(table)).toBe(false);
		});

		it('returns true for an unknown table (future tables)', () => {
			expect(hasDataTableView('cw_unknown_sensor')).toBe(true);
		});

		it('returns false for null', () => {
			expect(hasDataTableView(null)).toBe(false);
		});

		it('returns false for undefined', () => {
			expect(hasDataTableView(undefined)).toBe(false);
		});
	});
});
