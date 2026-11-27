import { describe, expect, it } from 'vitest';
import { browserTimeZone, fromInstant, sameInstant, toInstant } from './rule-auto-dates.ts';

describe('toInstant', () => {
	it('is null when nothing is picked', () => {
		expect(toInstant(undefined)).toBeNull();
		expect(toInstant({ date: new Date(NaN) })).toBeNull();
		// A range value is not a single moment.
		expect(toInstant({ start: new Date(2099, 0, 1), end: new Date(2099, 0, 2) })).toBeNull();
	});

	it('joins the local date and the time of day into one instant', () => {
		expect(toInstant({ date: new Date(2099, 2, 1), time: { hours: 9, minutes: 30 } })).toBe(
			new Date(2099, 2, 1, 9, 30, 0, 0).toISOString()
		);
	});

	it('means midnight when no time is given, whatever time the date object carries', () => {
		expect(toInstant({ date: new Date(2099, 2, 1, 17, 45, 12) })).toBe(
			new Date(2099, 2, 1, 0, 0, 0, 0).toISOString()
		);
	});

	it('does not change the date object it was given', () => {
		const date = new Date(2099, 2, 1, 17, 45);
		toInstant({ date, time: { hours: 9, minutes: 0 } });
		expect(date.getHours()).toBe(17);
	});
});

describe('fromInstant', () => {
	it('is undefined for nothing or for text that is not a date', () => {
		expect(fromInstant(null)).toBeUndefined();
		expect(fromInstant(undefined)).toBeUndefined();
		expect(fromInstant('')).toBeUndefined();
		expect(fromInstant('soon')).toBeUndefined();
	});

	it('gives the picker the local day and time of day', () => {
		const local = new Date(2099, 8, 1, 15, 5);
		expect(fromInstant(local.toISOString())).toEqual({
			date: new Date(2099, 8, 1),
			time: { hours: 15, minutes: 5 }
		});
	});

	it('round-trips an instant, to the minute', () => {
		expect(toInstant(fromInstant('2099-03-01T00:30:00.000Z'))).toBe('2099-03-01T00:30:00.000Z');
		expect(toInstant(fromInstant('2099-03-01T09:30:00+09:00'))).toBe('2099-03-01T00:30:00.000Z');
		expect(toInstant(fromInstant('2099-03-01T00:30:42.500Z'))).toBe('2099-03-01T00:30:00.000Z');
	});
});

describe('sameInstant', () => {
	it('compares moments, not spellings', () => {
		expect(sameInstant(null, null)).toBe(true);
		expect(sameInstant(null, '2099-03-01T00:30:00Z')).toBe(false);
		expect(sameInstant('2099-03-01T00:30:00Z', null)).toBe(false);
		expect(sameInstant('2099-03-01T09:30:00+09:00', '2099-03-01T00:30:00.000Z')).toBe(true);
		expect(sameInstant('2099-03-01T00:30:00Z', '2099-03-01T00:31:00Z')).toBe(false);
	});
});

describe('browserTimeZone', () => {
	it('is the IANA name of the zone the pickers work in', () => {
		expect(browserTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
		expect(browserTimeZone().length).toBeGreaterThan(0);
	});
});
