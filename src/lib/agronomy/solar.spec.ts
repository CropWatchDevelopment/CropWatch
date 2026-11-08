import { describe, expect, it } from 'vitest';
import { nextSunset, solarElevation, toCoordinates } from './solar';

const TOKYO = { lat: 35.68, long: 139.69 };

describe('solarElevation', () => {
	it('puts the summer-solstice noon sun over Tokyo at 90° − latitude + tilt', () => {
		// Solar noon in Tokyo ≈ 11:43 JST = 02:43 UTC.
		const noon = new Date(Date.UTC(2026, 5, 21, 2, 43));
		expect(solarElevation(noon, TOKYO)).toBeCloseTo(90 - 35.68 + 23.44, 0);
	});

	it('puts the winter-solstice noon sun lower by twice the tilt', () => {
		const noon = new Date(Date.UTC(2026, 11, 21, 2, 39));
		expect(solarElevation(noon, TOKYO)).toBeCloseTo(90 - 35.68 - 23.44, 0);
	});

	it('is below the horizon at midnight and near it at sunrise', () => {
		expect(solarElevation(new Date(Date.UTC(2026, 5, 21, 15, 0)), TOKYO)).toBeLessThan(-20);
		// Tokyo sunrise on 21 June ≈ 04:25 JST = 19:25 UTC the day before.
		expect(Math.abs(solarElevation(new Date(Date.UTC(2026, 5, 20, 19, 25)), TOKYO))).toBeLessThan(
			1.5
		);
	});

	it('follows longitude: the same UTC instant is morning further west', () => {
		const instant = new Date(Date.UTC(2026, 2, 20, 0, 0)); // 09:00 JST
		expect(solarElevation(instant, TOKYO)).toBeGreaterThan(
			solarElevation(instant, { lat: TOKYO.lat, long: TOKYO.long - 30 })
		);
	});

	it('handles a leap year', () => {
		const noon = new Date(Date.UTC(2028, 11, 31, 12, 0));
		expect(solarElevation(noon, { lat: 0, long: 0 })).toBeGreaterThan(60);
	});
});

describe('toCoordinates', () => {
	it('reads numbers and numeric strings', () => {
		expect(toCoordinates(35.68, 139.69)).toEqual(TOKYO);
		expect(toCoordinates('35.68', '139.69')).toEqual(TOKYO);
	});

	it('rejects missing, unreadable and impossible positions', () => {
		expect(toCoordinates(null, 139.69)).toBeNull();
		expect(toCoordinates(35.68, undefined)).toBeNull();
		expect(toCoordinates('', '')).toBeNull();
		expect(toCoordinates('north', 'east')).toBeNull();
		expect(toCoordinates(91, 0)).toBeNull();
		expect(toCoordinates(0, -181)).toBeNull();
		expect(toCoordinates({}, [])).toBeNull();
	});
});

describe('nextSunset', () => {
	const MIYAZAKI = { lat: 31.9077, long: 131.4202 };

	it('finds the published sunset, to the minute', () => {
		// Miyazaki on 8 November 2026: sunset 17:21 JST (08:21 UTC), asked at 15:20 JST.
		expect(nextSunset(new Date(Date.UTC(2026, 10, 8, 6, 20)), MIYAZAKI)?.toISOString()).toBe(
			'2026-11-08T08:21:00.000Z'
		);
	});

	it('looks ahead to the next day after dark', () => {
		const sunset = nextSunset(new Date(Date.UTC(2026, 10, 8, 12, 0)), MIYAZAKI);
		expect(sunset?.toISOString().slice(0, 10)).toBe('2026-11-09');
	});

	it('has none when the sun does not set (polar night)', () => {
		expect(nextSunset(new Date(Date.UTC(2026, 11, 21, 12, 0)), { lat: 80, long: 0 })).toBeNull();
	});
});
