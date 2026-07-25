import type { CwStatCardData } from '@cropwatchdevelopment/cwui';

/**
 * Compute the summary statistics a `CwStatCard` renders — min/max/avg/median/
 * stdDev, reading count, last reading, and the trend versus the previous
 * reading — from a series of numeric readings.
 *
 * Empty input returns an empty object (no stats) so callers never render
 * NaN/Infinity: an unguarded `sum / values.length` on an empty history is the
 * bug this guard prevents.
 */
export function computeStats(values: number[]): CwStatCardData {
	if (values.length === 0) return {};
	const sorted = [...values].sort((a, b) => a - b);
	const count = sorted.length;
	const min = sorted[0];
	const max = sorted[count - 1];
	const avg = sorted.reduce((s, v) => s + v, 0) / count;
	const median =
		count % 2 === 1
			? sorted[Math.floor(count / 2)]
			: (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
	const stdDev = Math.sqrt(sorted.reduce((s, v) => s + (v - avg) ** 2, 0) / count);
	const lastReading = values[values.length - 1];
	const trend: CwStatCardData['trend'] =
		values.length >= 2
			? values[values.length - 1] > values[values.length - 2]
				? 'up'
				: values[values.length - 1] < values[values.length - 2]
					? 'down'
					: 'stable'
			: 'stable';
	return { min, max, avg, median, stdDev, count, lastReading, trend };
}
