import { describe, it, expect } from 'vitest';
import { resolveReportDateRanges } from './reportDateRanges';

describe('resolveReportDateRanges', () => {
	it('computes UTC and local windows for JST', () => {
		const start = new Date('2025-11-02T10:00:00Z');
		const end = new Date('2025-11-03T10:00:00Z');
		const result = resolveReportDateRanges(start, end, 'Asia/Tokyo');

		expect(result.startDateUtc.toISOString()).toBe('2025-11-01T15:00:00.000Z');
		expect(result.endDateUtc.toISOString()).toBe('2025-11-03T14:59:59.999Z');

		expect(result.startLabel).toBe('2025-11-02 00:00');
		expect(result.endLabel).toBe('2025-11-03 23:59');

		expect(result.startDateLocal.getFullYear()).toBe(2025);
		expect(result.startDateLocal.getMonth()).toBe(10);
		expect(result.startDateLocal.getDate()).toBe(2);
	});
});
