import { describe, expect, it } from 'vitest';
import { computeDewPoint } from './dewPoint';

describe('computeDewPoint', () => {
	it('equals the air temperature at 100% humidity', () => {
		expect(computeDewPoint(20, 100)).toBeCloseTo(20, 5);
		expect(computeDewPoint(-5, 100)).toBeCloseTo(-5, 5);
	});

	it('matches reference values from the Magnus approximation', () => {
		// 25 °C / 60% RH ≈ 16.7 °C, 30 °C / 40% RH ≈ 14.9 °C
		expect(computeDewPoint(25, 60)).toBeCloseTo(16.69, 1);
		expect(computeDewPoint(30, 40)).toBeCloseTo(14.92, 1);
	});

	it('is always at or below the air temperature', () => {
		expect(computeDewPoint(15, 50)!).toBeLessThan(15);
		expect(computeDewPoint(0, 80)!).toBeLessThan(0);
	});

	it('returns null for humidity outside (0, 100]', () => {
		expect(computeDewPoint(20, 0)).toBeNull();
		expect(computeDewPoint(20, -10)).toBeNull();
		expect(computeDewPoint(20, 101)).toBeNull();
	});

	it('returns null for non-finite inputs', () => {
		expect(computeDewPoint(NaN, 50)).toBeNull();
		expect(computeDewPoint(20, NaN)).toBeNull();
		expect(computeDewPoint(Infinity, 50)).toBeNull();
	});
});
