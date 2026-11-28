import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { m } from '#lib/paraglide/messages.js';
import { getLocale, overwriteGetLocale } from '#lib/paraglide/runtime.js';
import {
	DATE_TIME_SUBJECT,
	ISO_WEEKDAYS,
	describeSchedule,
	formatTimeOfDay,
	parseTimeOfDay,
	weekdayLabel
} from './rule-schedule-text.ts';

const originalGetLocale = getLocale;
beforeEach(() => overwriteGetLocale(() => 'en'));
afterEach(() => overwriteGetLocale(originalGetLocale));

describe('weekdays', () => {
	it('are ISO: Monday is 1, Sunday is 7', () => {
		expect([...ISO_WEEKDAYS]).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(ISO_WEEKDAYS.map(weekdayLabel)).toEqual([
			m.common_day_monday(),
			m.common_day_tuesday(),
			m.common_day_wednesday(),
			m.common_day_thursday(),
			m.common_day_friday(),
			m.common_day_saturday(),
			m.common_day_sunday()
		]);
	});
});

describe('describeSchedule', () => {
	it('lists the days in week order, with the time and the zone', () => {
		expect(
			describeSchedule({ timeOfDay: '09:00', daysOfWeek: [5, 1, 3, 1], timezone: 'Asia/Tokyo' })
		).toBe(m.rules_dt_summary({ days: 'Mon, Wed, Fri', time: '09:00', zone: 'Asia/Tokyo' }));
	});

	it('says "every day" for all seven', () => {
		expect(
			describeSchedule({ timeOfDay: '18:30', daysOfWeek: [7, 6, 5, 4, 3, 2, 1], timezone: 'UTC' })
		).toBe(m.rules_dt_summary({ days: m.rules_dt_every_day(), time: '18:30', zone: 'UTC' }));
	});

	it('puts Sunday last and names days in the reader language', () => {
		expect(describeSchedule({ timeOfDay: '06:00', daysOfWeek: [7, 6], timezone: 'UTC' })).toContain(
			'Sat, Sun'
		);

		overwriteGetLocale(() => 'ja');
		expect(
			describeSchedule({ timeOfDay: '06:00', daysOfWeek: [1], timezone: 'Asia/Tokyo' })
		).toContain('月');
	});
});

describe('time of day', () => {
	it('is written as HH:mm', () => {
		expect(formatTimeOfDay({ hours: 9, minutes: 5 })).toBe('09:05');
		expect(formatTimeOfDay({ hours: 23, minutes: 59 })).toBe('23:59');
		expect(formatTimeOfDay({ hours: 0, minutes: 0 })).toBe('00:00');
	});

	it('is read from HH:mm and from a database time', () => {
		expect(parseTimeOfDay('09:05')).toEqual({ hours: 9, minutes: 5 });
		expect(parseTimeOfDay('23:59:00')).toEqual({ hours: 23, minutes: 59 });
		expect(parseTimeOfDay('7:30')).toEqual({ hours: 7, minutes: 30 });
	});

	it.each([undefined, null, '', 'noon', '24:00', '12:60'])(
		'falls back to 09:00 for %j',
		(value) => {
			expect(parseTimeOfDay(value)).toEqual({ hours: 9, minutes: 0 });
		}
	);

	it('round-trips', () => {
		expect(formatTimeOfDay(parseTimeOfDay('18:45'))).toBe('18:45');
	});
});

describe('DATE_TIME_SUBJECT', () => {
	it('cannot be mistaken for a sensor field', () => {
		expect(DATE_TIME_SUBJECT).toMatch(/^__.+__$/);
	});
});
