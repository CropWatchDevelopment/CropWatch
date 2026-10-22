import { describe, expect, it } from 'vitest';
import { endOfDayInstant, readIsoInstant } from './invite-expiry';

describe('endOfDayInstant', () => {
	it("is the last second of the day in this machine's time zone, as an ISO instant", () => {
		const instant = endOfDayInstant('2026-12-31');

		expect(instant).toBe(new Date(2026, 11, 31, 23, 59, 59).toISOString());
		const local = new Date(instant);
		expect([local.getFullYear(), local.getMonth(), local.getDate()]).toEqual([2026, 11, 31]);
		expect([local.getHours(), local.getMinutes(), local.getSeconds()]).toEqual([23, 59, 59]);
	});

	it('reads the day as typed, around spaces', () => {
		expect(endOfDayInstant(' 2027-02-28 ')).toBe(new Date(2027, 1, 28, 23, 59, 59).toISOString());
		expect(endOfDayInstant('2028-02-29')).toBe(new Date(2028, 1, 29, 23, 59, 59).toISOString());
	});

	it('gives nothing for text that is not a calendar day', () => {
		for (const day of [
			'',
			'soon',
			'2026-1-5',
			'2026/12/31',
			'2026-12-31T12:00',
			'2026-02-30',
			'2027-02-29',
			'2026-13-01',
			'2026-00-10',
			'2026-12-00',
			// `new Date()` would read a year below 100 as 19xx.
			'0026-12-31'
		]) {
			expect(endOfDayInstant(day), day).toBe('');
		}
	});
});

describe('readIsoInstant', () => {
	it('accepts an instant as the browser writes it', () => {
		expect(readIsoInstant('2026-12-31T14:59:59.000Z')).toBe('2026-12-31T14:59:59.000Z');
		expect(readIsoInstant(endOfDayInstant('2026-12-31'))).toBe(endOfDayInstant('2026-12-31'));
	});

	it('refuses anything else, including dates and times without a zone', () => {
		for (const value of [
			'',
			'soon',
			'2026-12-31',
			'2026-12-31T23:59:59',
			'2026-12-31T14:59:59Z',
			'2026-12-31T23:59:59+09:00',
			'Thu Dec 31 2026'
		]) {
			expect(readIsoInstant(value), value).toBeNull();
		}
	});
});
