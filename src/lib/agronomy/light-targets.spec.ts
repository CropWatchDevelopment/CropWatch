import { describe, expect, it } from 'vitest';
import {
	dayLightProfile,
	isDaylight,
	lightEndsAt,
	lightShareBetween,
	lightShareSoFar,
	ppfdTargetForHour,
	sunlightWeight
} from './light-targets';

const TOKYO = { lat: 35.68, long: 139.69 };
const HOUR = 3_600_000;

/** Every local clock hour of the profile's day. */
function hoursOf(profile: ReturnType<typeof dayLightProfile>): Date[] {
	const hours: Date[] = [];
	for (let t = profile.start; t < profile.end; t += HOUR) hours.push(new Date(t));
	return hours;
}

describe('sunlightWeight', () => {
	it('without coordinates rises and falls between 06:00 and 16:00 local time', () => {
		expect(sunlightWeight(new Date(2026, 10, 7, 5, 59), null)).toBe(0);
		expect(sunlightWeight(new Date(2026, 10, 7, 6, 0), null)).toBe(0);
		expect(sunlightWeight(new Date(2026, 10, 7, 11, 0), null)).toBeCloseTo(1, 6);
		expect(sunlightWeight(new Date(2026, 10, 7, 8, 30), null)).toBeCloseTo(
			Math.sin(Math.PI / 4),
			6
		);
		expect(sunlightWeight(new Date(2026, 10, 7, 16, 0), null)).toBe(0);
		expect(sunlightWeight(new Date(2026, 10, 7, 22, 0), null)).toBe(0);
	});

	it('with coordinates follows the sun: nothing at night, most at noon', () => {
		expect(sunlightWeight(new Date(Date.UTC(2026, 5, 21, 15, 0)), TOKYO)).toBe(0);
		expect(sunlightWeight(new Date(Date.UTC(2026, 5, 21, 2, 43)), TOKYO)).toBeGreaterThan(0.95);
	});
});

describe('dayLightProfile', () => {
	it('covers one local day in 5-minute steps', () => {
		const profile = dayLightProfile(new Date(2026, 10, 7, 13, 20), null);
		expect(profile.start).toBe(new Date(2026, 10, 7).getTime());
		expect(profile.end).toBe(new Date(2026, 10, 8).getTime());
		expect(profile.weights).toHaveLength((profile.end - profile.start) / (5 * 60_000));
		expect(profile.total).toBeGreaterThan(0);
	});

	it('shares out the whole day: the hours add up to all of its light', () => {
		for (const coordinates of [null, TOKYO]) {
			const profile = dayLightProfile(new Date(2026, 5, 21, 12), coordinates);
			const shares = hoursOf(profile).map((hour) =>
				lightShareBetween(profile, hour.getTime(), hour.getTime() + HOUR)
			);
			expect(shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(1, 6);
		}
	});

	it('has no light to share on a day without sun', () => {
		const polarNight = dayLightProfile(new Date(2026, 11, 21, 12), { lat: 89, long: 0 });
		expect(polarNight.total).toBe(0);
		expect(lightShareBetween(polarNight, polarNight.start, polarNight.end)).toBe(0);
	});
});

describe('ppfdTargetForHour', () => {
	const dli = { min: 20, max: 30 };

	it('needs no light at night', () => {
		const night = new Date(2026, 10, 7, 2, 30);
		expect(ppfdTargetForHour(night, dli, dayLightProfile(night, null))).toBeNull();
		const tokyoMidnight = new Date(Date.UTC(2026, 5, 21, 15, 10));
		expect(ppfdTargetForHour(tokyoMidnight, dli, dayLightProfile(tokyoMidnight, TOKYO))).toBeNull();
	});

	it('spreads the goal over the 06:00–16:00 fallback on the sun’s curve', () => {
		const tenAm = new Date(2026, 10, 7, 10, 25);
		const target = ppfdTargetForHour(tenAm, dli, dayLightProfile(tenAm, null));
		// Hour 10–11 holds (cos 0.4π − cos 0.5π) / 2 of the window's light.
		const share = (Math.cos(0.4 * Math.PI) - Math.cos(0.5 * Math.PI)) / 2;
		expect(target?.from).toEqual(new Date(2026, 10, 7, 10));
		expect(target?.to).toEqual(new Date(2026, 10, 7, 11));
		expect(target?.min).toBeCloseTo((20e6 * share) / 3600, -1);
		expect(target?.max).toBeCloseTo((30e6 * share) / 3600, -1);
		// The early hour gets less than the late-morning one.
		const sevenAm = new Date(2026, 10, 7, 7, 0);
		const early = ppfdTargetForHour(sevenAm, dli, dayLightProfile(sevenAm, null));
		expect(early?.min ?? 0).toBeLessThan(target?.min ?? 0);
	});

	it('over the whole day delivers exactly the daily goal', () => {
		const profile = dayLightProfile(new Date(2026, 5, 21, 12), TOKYO);
		let molMin = 0;
		let molMax = 0;
		for (const hour of hoursOf(profile)) {
			const target = ppfdTargetForHour(hour, dli, profile);
			if (!target) continue;
			molMin += ((target.min ?? 0) * 3600) / 1e6;
			molMax += ((target.max ?? 0) * 3600) / 1e6;
		}
		expect(molMin).toBeCloseTo(20, 6);
		expect(molMax).toBeCloseTo(30, 6);
	});

	it('asks for a plausible noon level from the location’s sun', () => {
		const noon = new Date(Date.UTC(2026, 5, 21, 2, 43));
		const target = ppfdTargetForHour(noon, dli, dayLightProfile(noon, TOKYO));
		expect(target?.min).toBeGreaterThan(450);
		expect(target?.min).toBeLessThan(750);
	});

	it('keeps an open end open, and needs a band', () => {
		const tenAm = new Date(2026, 10, 7, 10);
		const profile = dayLightProfile(tenAm, null);
		expect(ppfdTargetForHour(tenAm, { min: 20, max: null }, profile)?.max).toBeNull();
		expect(ppfdTargetForHour(tenAm, { min: null, max: null }, profile)).toBeNull();
	});
});

describe('lightShareSoFar and isDaylight', () => {
	it('runs from nothing at midnight to all of it by the end of the light', () => {
		const profile = dayLightProfile(new Date(2026, 10, 7, 12), null);
		expect(lightShareSoFar(new Date(2026, 10, 7, 0), profile)).toBe(0);
		expect(lightShareSoFar(new Date(2026, 10, 7, 11), profile)).toBeCloseTo(0.5, 2);
		expect(lightShareSoFar(new Date(2026, 10, 7, 17), profile)).toBeCloseTo(1, 6);
	});

	it('knows day from night', () => {
		expect(isDaylight(new Date(2026, 10, 7, 12), null)).toBe(true);
		expect(isDaylight(new Date(2026, 10, 7, 20), null)).toBe(false);
		expect(isDaylight(new Date(Date.UTC(2026, 5, 21, 2, 43)), TOKYO)).toBe(true);
		expect(isDaylight(new Date(Date.UTC(2026, 5, 21, 15, 0)), TOKYO)).toBe(false);
	});
});

describe('lightEndsAt', () => {
	it('is the next sunset with coordinates, else the end of the fallback window', () => {
		const miyazaki = { lat: 31.9077, long: 131.4202 };
		expect(lightEndsAt(new Date(Date.UTC(2026, 10, 8, 6, 20)), miyazaki)?.toISOString()).toBe(
			'2026-11-08T08:21:00.000Z'
		);
		expect(lightEndsAt(new Date(2026, 10, 8, 15, 20), null)).toEqual(new Date(2026, 10, 8, 16, 0));
	});
});
