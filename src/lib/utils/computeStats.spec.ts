import { describe, expect, it } from 'vitest';
import { computeStats } from './computeStats';

describe('computeStats', () => {
	it('computes min/max/avg/median/stdDev/count over a series', () => {
		const stats = computeStats([2, 4, 4, 4, 5, 5, 7, 9]);

		expect(stats.min).toBe(2);
		expect(stats.max).toBe(9);
		expect(stats.avg).toBe(5);
		expect(stats.median).toBe(4.5);
		expect(stats.stdDev).toBe(2);
		expect(stats.count).toBe(8);
		expect(stats.lastReading).toBe(9);
		expect(stats.trend).toBe('up');
	});

	it('uses the middle value as median for odd-length series', () => {
		expect(computeStats([9, 1, 5]).median).toBe(5);
	});

	it('derives the trend from the last two readings', () => {
		expect(computeStats([5, 3]).trend).toBe('down');
		expect(computeStats([3, 5]).trend).toBe('up');
		expect(computeStats([5, 5]).trend).toBe('stable');
	});

	it('handles a single value', () => {
		const stats = computeStats([42]);

		expect(stats).toEqual({
			min: 42,
			max: 42,
			avg: 42,
			median: 42,
			stdDev: 0,
			count: 1,
			lastReading: 42,
			trend: 'stable'
		});
	});

	it('returns an empty object (never NaN/Infinity) for empty input', () => {
		const stats = computeStats([]);

		expect(stats).toEqual({});
		// Regression guard: an empty history must not leak NaN or Infinity stats.
		for (const value of Object.values(stats)) {
			expect(Number.isFinite(value)).toBe(true);
		}
	});
});
