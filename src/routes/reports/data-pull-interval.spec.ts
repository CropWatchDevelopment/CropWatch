import { describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { getLocale, overwriteGetLocale } from '$lib/paraglide/runtime.js';
import {
	buildReportDataPullIntervalOptions,
	DEFAULT_REPORT_DATA_PULL_INTERVAL,
	normalizeReportDataPullInterval,
	parseReportDataPullInterval
} from './data-pull-interval';

const baseOptions = () => [
	{ label: m.reports_data_pull_interval_minutes_other({ count: 30 }), value: '30' },
	{ label: m.reports_data_pull_interval_hours_one(), value: '60' }
];
const labels = (value: unknown) =>
	buildReportDataPullIntervalOptions(value).map((option) => option.label);

describe('parseReportDataPullInterval', () => {
	it.each([
		[30, 30],
		['45', 45],
		[' 60 ', 60],
		// parseInt semantics: leading digits count.
		['90min', 90],
		['1.5', 1]
	])('reads %j as %j minutes', (value, minutes) => {
		expect(parseReportDataPullInterval(value)).toBe(minutes);
	});

	it.each([
		[0],
		[-5],
		[1.5],
		[Number.NaN],
		['0'],
		['-3'],
		[''],
		['   '],
		['abc'],
		[null],
		[undefined],
		[{}],
		[[30]]
	])('has no interval for %j', (value) => {
		expect(parseReportDataPullInterval(value)).toBeUndefined();
	});
});

describe('normalizeReportDataPullInterval', () => {
	it('keeps a positive interval as a string', () => {
		expect(normalizeReportDataPullInterval(120)).toBe('120');
		expect(normalizeReportDataPullInterval('15')).toBe('15');
	});

	it('falls back to the default, or to the given fallback', () => {
		expect(DEFAULT_REPORT_DATA_PULL_INTERVAL).toBe('30');
		expect(normalizeReportDataPullInterval(null)).toBe('30');
		expect(normalizeReportDataPullInterval(0, '60')).toBe('60');
	});
});

describe('buildReportDataPullIntervalOptions', () => {
	it('offers 30 minutes and 1 hour', () => {
		expect(buildReportDataPullIntervalOptions(undefined)).toEqual(baseOptions());
		expect(buildReportDataPullIntervalOptions('abc')).toEqual(baseOptions());
	});

	it('does not repeat an interval that is already offered', () => {
		expect(buildReportDataPullIntervalOptions('30')).toEqual(baseOptions());
		expect(buildReportDataPullIntervalOptions(60)).toEqual(baseOptions());
	});

	it.each([
		['120', () => m.reports_data_pull_interval_hours_other({ count: 2 })],
		[180, () => m.reports_data_pull_interval_hours_other({ count: 3 })],
		['45', () => m.reports_data_pull_interval_minutes_other({ count: 45 })],
		[90, () => m.reports_data_pull_interval_minutes_other({ count: 90 })],
		[1, () => m.reports_data_pull_interval_minutes_one()]
	])('puts a saved custom interval (%j) first, labelled in minutes or hours', (value, label) => {
		expect(buildReportDataPullIntervalOptions(value)).toEqual([
			{ label: label(), value: String(value) },
			...baseOptions()
		]);
	});

	it('labels the intervals in the language of the request', () => {
		const originalGetLocale = getLocale;
		try {
			overwriteGetLocale(() => 'en');
			expect(labels('120')).toEqual(['2 hours', '30 minutes', '1 hour']);
			expect(labels(1)[0]).toBe('1 minute');

			overwriteGetLocale(() => 'ja');
			expect(labels('120')).toEqual(['2 時間', '30 分', '1 時間']);
		} finally {
			overwriteGetLocale(originalGetLocale);
		}
	});
});
