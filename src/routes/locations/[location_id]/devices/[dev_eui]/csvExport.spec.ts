import { describe, expect, it } from 'vitest';
import {
	formatCsvRangeLabel,
	formatTimestampForTimeZone,
	resolveCsvRequestRange,
	resolveExportTimeZone
} from './csvExport';

describe('csvExport timezone helpers', () => {
	it('resolves the export timezone from nested device location data', () => {
		expect(
			resolveExportTimeZone({
				cw_locations: {
					timezone: 'America/New_York'
				}
			})
		).toBe('America/New_York');
	});

	it('converts selected wall-clock range values into UTC request bounds', () => {
		const range = resolveCsvRequestRange(
			{
				start: new Date(2026, 2, 8),
				end: new Date(2026, 2, 8),
				startTime: { hours: 8, minutes: 0 },
				endTime: { hours: 9, minutes: 30 }
			},
			'America/New_York'
		);

		expect(range).toEqual({
			start: '2026-03-08T12:00:00.000Z',
			end: '2026-03-08T13:30:59.999Z'
		});
	});

	it('formats API timestamps in the resolved export timezone', () => {
		expect(formatTimestampForTimeZone('2026-03-08T12:00:00.000Z', 'America/New_York')).toBe(
			'2026-03-08T08:00:00.000-04:00'
		);
	});
});

/** Runs `run` while `Intl.DateTimeFormat()` (the browser's own zone) reports `timeZone`. */
function withBrowserTimeZone(timeZone: string | undefined | Error, run: () => void) {
	const RealDateTimeFormat = Intl.DateTimeFormat;
	Intl.DateTimeFormat = function (...args: ConstructorParameters<typeof Intl.DateTimeFormat>) {
		if (args.length > 0) return new RealDateTimeFormat(...args);
		if (timeZone instanceof Error) throw timeZone;
		return { resolvedOptions: () => ({ timeZone }) };
	} as unknown as typeof Intl.DateTimeFormat;
	try {
		run();
	} finally {
		Intl.DateTimeFormat = RealDateTimeFormat;
	}
}

describe('resolveExportTimeZone', () => {
	it("reads the device's own zone under any of its field names, trimmed", () => {
		expect(resolveExportTimeZone({ timezone: ' Asia/Tokyo ' })).toBe('Asia/Tokyo');
		expect(resolveExportTimeZone({ time_zone: 'Europe/Paris' })).toBe('Europe/Paris');
		expect(resolveExportTimeZone({ iana_timezone: 'Asia/Seoul' })).toBe('Asia/Seoul');
		expect(resolveExportTimeZone({ ianaTimeZone: 'Australia/Sydney' })).toBe('Australia/Sydney');
	});

	it('falls back to the location (joined list or object), then the browser zone', () => {
		expect(
			resolveExportTimeZone({
				timezone: ' ',
				cw_locations: [{ name: 'No zone' }, { timezone: 'Asia/Tokyo' }]
			})
		).toBe('Asia/Tokyo');
		expect(resolveExportTimeZone({ cw_locations: [{}], location: { timezone: 'UTC' } })).toBe(
			'UTC'
		);
		withBrowserTimeZone('Europe/Berlin', () => {
			expect(resolveExportTimeZone(null)).toBe('Europe/Berlin');
			expect(resolveExportTimeZone([{ timezone: 'Asia/Tokyo' }])).toBe('Asia/Tokyo');
			// An unknown zone is not used.
			expect(resolveExportTimeZone({ timezone: 'Mars/Olympus' })).toBe('Europe/Berlin');
		});
	});

	it('uses UTC when neither the device nor the browser has a valid zone', () => {
		for (const browserZone of ['Mars/Olympus', undefined, new Error('no Intl')]) {
			withBrowserTimeZone(browserZone, () => {
				expect(resolveExportTimeZone({ timezone: 'Nowhere/Land' })).toBe('UTC');
				expect(resolveExportTimeZone(undefined)).toBe('UTC');
			});
		}
	});
});

describe('resolveCsvRequestRange', () => {
	it('covers whole days when no times were picked', () => {
		expect(
			resolveCsvRequestRange(
				{ start: new Date(2026, 9, 1), end: new Date(2026, 9, 2) },
				'Asia/Tokyo'
			)
		).toEqual({ start: '2026-09-30T15:00:00.000Z', end: '2026-10-02T14:59:59.999Z' });
	});

	it('resolves a wall-clock time just after a daylight-saving jump', () => {
		expect(
			resolveCsvRequestRange(
				{
					start: new Date(2026, 2, 8),
					end: new Date(2026, 2, 8),
					startTime: { hours: 3, minutes: 0 },
					endTime: { hours: 3, minutes: 0 }
				},
				'America/New_York'
			)
		).toEqual({ start: '2026-03-08T07:00:00.000Z', end: '2026-03-08T07:00:59.999Z' });
	});
});

describe('formatCsvRangeLabel', () => {
	it('names the file after the range in the export zone', () => {
		expect(
			formatCsvRangeLabel(
				{ start: '2026-10-21T00:00:00.000Z', end: new Date('2026-10-21T14:59:59.999Z') },
				'Asia/Tokyo'
			)
		).toBe('20261021-0900_to_20261021-2359_Asia-Tokyo');
	});

	it('names it after the zone alone when the range is not a valid date range', () => {
		expect(formatCsvRangeLabel({ start: 'not a date', end: new Date() }, 'Asia/Tokyo')).toBe(
			'Asia-Tokyo'
		);
		expect(formatCsvRangeLabel({ start: new Date(Number.NaN), end: '' }, ' ')).toBe('device');
	});
});

describe('formatTimestampForTimeZone', () => {
	it('reads timestamps without a zone as UTC', () => {
		expect(formatTimestampForTimeZone('2026-10-21', 'Asia/Tokyo')).toBe(
			'2026-10-21T09:00:00.000+09:00'
		);
		expect(formatTimestampForTimeZone('2026-10-21 03:04:05', 'Asia/Tokyo')).toBe(
			'2026-10-21T12:04:05.000+09:00'
		);
		expect(formatTimestampForTimeZone('2026-10-21T03:04:05.006', 'UTC')).toBe(
			'2026-10-21T03:04:05.006+00:00'
		);
		expect(formatTimestampForTimeZone('2026-10-21T12:00:00+09:00', 'America/New_York')).toBe(
			'2026-10-20T23:00:00.000-04:00'
		);
	});

	it('keeps a value that is not a timestamp as it is', () => {
		expect(formatTimestampForTimeZone('soon', 'UTC')).toBe('soon');
		expect(formatTimestampForTimeZone('  ', 'UTC')).toBe('  ');
	});
});
