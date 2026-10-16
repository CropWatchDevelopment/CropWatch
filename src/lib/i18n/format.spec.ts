import { describe, expect, it } from 'vitest';
import { formatCwDuration } from './format';

describe('formatCwDuration', () => {
	it("matches CwDuration's compact format at each scale", () => {
		expect(formatCwDuration(45_000)).toBe('45s');
		expect(formatCwDuration(6 * 60_000 + 5_000)).toBe('6m 05s');
		expect(formatCwDuration(65 * 60_000)).toBe('1h 05m');
		expect(formatCwDuration((2 * 24 + 3) * 3_600_000)).toBe('2d 03h');
	});

	it('never goes below zero', () => {
		expect(formatCwDuration(-5_000)).toBe('0s');
	});
});
