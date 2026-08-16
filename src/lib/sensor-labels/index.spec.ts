import { describe, expect, it } from 'vitest';
import { isDisplayableColumn } from './index';

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
