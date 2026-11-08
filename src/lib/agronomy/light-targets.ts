import { nextSunset, solarElevation, type Coordinates } from './solar';

/**
 * Spreading a daily light goal (DLI) over the day. Daylight follows the sun's
 * course: each moment's share of the day's light is proportional to the sine
 * of the sun's elevation at the location. Without coordinates the day's light
 * is taken to fall between 06:00 and 16:00 local time, on the same rise and
 * fall (a half-sine).
 */

/** Light window used when the location has no latitude/longitude. */
export const FALLBACK_LIGHT_START_HOUR = 6;
export const FALLBACK_LIGHT_END_HOUR = 16;

/** Resolution of a day's light profile. */
export const LIGHT_PROFILE_STEP_MS = 5 * 60 * 1000;

const RAD = Math.PI / 180;

/** Relative sunlight at `t` (0 at night, 1 with the sun overhead). */
export function sunlightWeight(t: Date, coordinates: Coordinates | null): number {
	if (coordinates) return Math.max(0, Math.sin(solarElevation(t, coordinates) * RAD));
	const hours = t.getHours() + t.getMinutes() / 60 + t.getSeconds() / 3600;
	if (hours <= FALLBACK_LIGHT_START_HOUR || hours >= FALLBACK_LIGHT_END_HOUR) return 0;
	return Math.sin(
		(Math.PI * (hours - FALLBACK_LIGHT_START_HOUR)) /
			(FALLBACK_LIGHT_END_HOUR - FALLBACK_LIGHT_START_HOUR)
	);
}

/** One local day's sunlight, sampled every LIGHT_PROFILE_STEP_MS. */
export interface DayLightProfile {
	/** Local midnight that starts the day (ms). */
	start: number;
	/** The next local midnight (ms); a DST day is shorter or longer than 24 h. */
	end: number;
	/** Sunlight weight at the midpoint of each step. */
	weights: number[];
	/** Sum of the weights; 0 on a day without sun (polar night). */
	total: number;
}

export function dayLightProfile(day: Date, coordinates: Coordinates | null): DayLightProfile {
	const startDate = new Date(day);
	startDate.setHours(0, 0, 0, 0);
	const endDate = new Date(startDate);
	endDate.setDate(endDate.getDate() + 1);
	const start = startDate.getTime();
	const end = endDate.getTime();

	const weights: number[] = [];
	let total = 0;
	for (let t = start; t < end; t += LIGHT_PROFILE_STEP_MS) {
		const weight = sunlightWeight(new Date(t + LIGHT_PROFILE_STEP_MS / 2), coordinates);
		weights.push(weight);
		total += weight;
	}
	return { start, end, weights, total };
}

/** Share (0–1) of the day's light that falls between `from` and `to`. */
export function lightShareBetween(profile: DayLightProfile, from: number, to: number): number {
	if (profile.total <= 0) return 0;
	let share = 0;
	profile.weights.forEach((weight, i) => {
		const midpoint = profile.start + i * LIGHT_PROFILE_STEP_MS + LIGHT_PROFILE_STEP_MS / 2;
		if (midpoint >= from && midpoint < to) share += weight;
	});
	return share / profile.total;
}

/** A daily light goal in mol/m²/day; either end may be open. */
export interface DliBand {
	min: number | null;
	max: number | null;
}

export interface PpfdHourTarget {
	/** The clock hour the target is for. */
	from: Date;
	to: Date;
	/** Mean PPFD (µmol/m²/s) this hour needs for the day to reach the band's ends. */
	min: number | null;
	max: number | null;
}

/**
 * The PPFD the current clock hour needs, on average, for the day's light to
 * reach the DLI band: the hour's share of the day's sunlight × the daily goal,
 * spread over the hour. Null when the hour has no daylight (night) or the band
 * has no ends.
 */
export function ppfdTargetForHour(
	now: Date,
	dli: DliBand,
	profile: DayLightProfile
): PpfdHourTarget | null {
	if (dli.min === null && dli.max === null) return null;
	const from = new Date(now);
	from.setMinutes(0, 0, 0);
	const to = new Date(from);
	to.setHours(to.getHours() + 1);

	const share = lightShareBetween(profile, from.getTime(), to.getTime());
	if (share <= 0) return null;
	const seconds = (to.getTime() - from.getTime()) / 1000;
	const perHour = (molPerDay: number | null) =>
		molPerDay === null ? null : (molPerDay * 1_000_000 * share) / seconds;
	return { from, to, min: perHour(dli.min), max: perHour(dli.max) };
}

/** Share (0–1) of the day's light that has already fallen by `now`. */
export function lightShareSoFar(now: Date, profile: DayLightProfile): number {
	return lightShareBetween(profile, profile.start, now.getTime());
}

/** Whether `now` is in daylight (the sun is up, or inside the fallback window). */
export function isDaylight(now: Date, coordinates: Coordinates | null): boolean {
	return sunlightWeight(now, coordinates) > 0;
}

/** When the day's light ends: the next sunset, or the end of the fallback window. */
export function lightEndsAt(now: Date, coordinates: Coordinates | null): Date | null {
	if (coordinates) return nextSunset(now, coordinates);
	const end = new Date(now);
	end.setHours(FALLBACK_LIGHT_END_HOUR, 0, 0, 0);
	return end;
}
