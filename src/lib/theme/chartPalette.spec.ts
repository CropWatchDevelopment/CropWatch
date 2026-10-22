import { describe, expect, it } from 'vitest';
import { appChartPalette } from './chartPalette';

describe('appChartPalette', () => {
	it('maps each chart tone to its CWUI design token so charts follow the theme', () => {
		expect(appChartPalette).toEqual({
			danger: 'var(--cw-danger-500)',
			info: 'var(--cw-info-500)',
			primary: 'var(--cw-primary-500)',
			success: 'var(--cw-success-500)',
			warning: 'var(--cw-warning-500)'
		});
	});
});
