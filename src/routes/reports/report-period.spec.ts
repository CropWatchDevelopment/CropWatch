import { describe, expect, it } from 'vitest';
import { isReportPeriodEditable, parseReportPeriod } from './report-period';

describe('parseReportPeriod', () => {
	it('parses a canonical report object name', () => {
		expect(parseReportPeriod('2026_07_12-2026_07_18.pdf')).toEqual({
			start: '2026-07-12',
			end: '2026-07-18',
			isUpdated: false
		});
	});

	it('parses a regenerated (_updated_) object name', () => {
		expect(parseReportPeriod('2026_07_12-2026_07_18_updated_20260725_0130.pdf')).toEqual({
			start: '2026-07-12',
			end: '2026-07-18',
			isUpdated: true
		});
	});

	it('tolerates surrounding whitespace', () => {
		expect(parseReportPeriod(' 2026_07_12-2026_07_18.pdf ')).not.toBeNull();
	});

	it.each([
		['legacy free-form name', 'Weekly Report June.pdf'],
		['missing extension', '2026_07_12-2026_07_18'],
		['wrong extension', '2026_07_12-2026_07_18.csv'],
		['hyphenated dates (local filename style)', '2026-07-12_2026-07-18.pdf'],
		['garbage', '.emptyFolderPlaceholder'],
		['inverted period', '2026_07_18-2026_07_12.pdf'],
		['impossible date', '2026_13_40-2026_13_41.pdf']
	])('returns null for %s', (_label, name) => {
		expect(parseReportPeriod(name)).toBeNull();
	});
});

describe('isReportPeriodEditable', () => {
	const now = new Date('2026-07-25T12:00:00Z');

	it('allows a recent period', () => {
		expect(isReportPeriodEditable('2026-07-18', now)).toBe(true);
	});

	it('allows a period just inside the 23-month cutoff', () => {
		// 23 months before 2026-07-25 is 2024-08-25; a period ending after that is editable.
		expect(isReportPeriodEditable('2024-08-26', now)).toBe(true);
	});

	it('rejects a period just past the 23-month cutoff', () => {
		expect(isReportPeriodEditable('2024-08-24', now)).toBe(false);
	});

	it('rejects a period a full two years old', () => {
		expect(isReportPeriodEditable('2024-07-18', now)).toBe(false);
	});

	it('rejects an unparsable date', () => {
		expect(isReportPeriodEditable('not-a-date', now)).toBe(false);
	});
});
