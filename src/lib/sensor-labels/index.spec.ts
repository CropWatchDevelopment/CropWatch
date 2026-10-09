import { describe, expect, it } from 'vitest';
import { isDisplayableColumn, sensorStateIcon } from './index';

describe('isDisplayableColumn', () => {
	it('hides battery telemetry columns from all displays', () => {
		expect(isDisplayableColumn('battery')).toBe(false);
		expect(isDisplayableColumn('battery_level')).toBe(false);
	});

	it('keeps voltage and regular sensor columns visible', () => {
		expect(isDisplayableColumn('voltage')).toBe(true);
		expect(isDisplayableColumn('temperature_c')).toBe(true);
	});

	it('hides metadata columns', () => {
		expect(isDisplayableColumn('dev_eui')).toBe(false);
		expect(isDisplayableColumn('is_simulated')).toBe(false);
	});
});

describe('sensorStateIcon', () => {
	it('shows 🟢 for an on relay and 🔴 for an off relay, however the value is encoded', () => {
		for (const on of [true, 1, '1', 'true', 'on']) {
			expect(sensorStateIcon('relay_1', on)).toBe('🟢');
		}
		for (const off of [false, 0, '0', 'false', 'off']) {
			expect(sensorStateIcon('relay_2', off)).toBe('🔴');
		}
	});

	it('shows nothing for a relay without a reading', () => {
		expect(sensorStateIcon('relay_1', null)).toBeUndefined();
		expect(sensorStateIcon('relay_1', undefined)).toBeUndefined();
	});

	it('never colours smoke/vape detection or numeric readings', () => {
		expect(sensorStateIcon('smoke_detected', true)).toBeUndefined();
		expect(sensorStateIcon('vape_detected', false)).toBeUndefined();
		expect(sensorStateIcon('temperature_c', 21.5)).toBeUndefined();
	});
});
