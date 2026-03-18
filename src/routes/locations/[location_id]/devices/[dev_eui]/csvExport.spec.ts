import { describe, expect, it } from 'vitest';
import {
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
