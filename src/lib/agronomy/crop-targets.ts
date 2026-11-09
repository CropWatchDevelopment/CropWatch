import type { CropTargetDto, CropTypeDetailDto } from '$lib/api/api.dtos';

/**
 * Reading a crop's growing targets: the row that applies now (a day or night
 * row before the all-day one) and where a reading sits against it.
 */

export type DayPeriod = 'day' | 'night';

/** The crop's target for a metric in this part of the day, if it has one. */
export function cropTarget(
	crop: CropTypeDetailDto | null | undefined,
	metric: string,
	period: DayPeriod
): CropTargetDto | null {
	const rows = crop?.targets.filter((target) => target.metric === metric) ?? [];
	return (
		rows.find((target) => target.period === period) ??
		rows.find((target) => target.period === 'all') ??
		null
	);
}

/**
 * Where a reading sits against its target, on a seven-step scale so that being a little
 * off reads as a little off: inside the optimal band it is `optimal`; outside it, the
 * distance past the nearest bound, as a share of that bound, picks the step (up to 10 %
 * `slightly_*`, up to 25 % `low` / `high`, beyond that `very_*`). Past a stress limit
 * (min_value / max_value, where the crop takes damage) is always `very_*`. A target with
 * only stress limits judges only those. Null without a reading or anything to judge it by.
 */
export type TargetStatus =
	| 'very_low'
	| 'low'
	| 'slightly_low'
	| 'optimal'
	| 'slightly_high'
	| 'high'
	| 'very_high';

/** Largest share past the band that is still `slightly_*`, and still `low` / `high`. */
export const SLIGHTLY_OFF_SHARE = 0.1;
export const OFF_SHARE = 0.25;

export function judgeReading(
	value: number | null | undefined,
	target: CropTargetDto | null
): TargetStatus | null {
	if (value === null || value === undefined || !Number.isFinite(value) || !target) return null;
	if (target.min_value !== null && value < target.min_value) return 'very_low';
	if (target.max_value !== null && value > target.max_value) return 'very_high';
	const { optimal_min: low, optimal_max: high } = target;
	if (low === null && high === null) return null;
	if (low !== null && value < low) return step('low', (low - value) / shareBase(low, low, high));
	if (high !== null && value > high)
		return step('high', (value - high) / shareBase(high, low, high));
	return 'optimal';
}

/** A bound of 0 has no share: measure against the band's width instead (or 1). */
function shareBase(bound: number, low: number | null, high: number | null): number {
	if (bound !== 0) return Math.abs(bound);
	return low !== null && high !== null && high > low ? high - low : 1;
}

// Floating point puts e.g. 26.4 against 24 a hair over 10 %: count the edges as inside.
const EDGE = 1e-9;

function step(side: 'low' | 'high', share: number): TargetStatus {
	if (share <= SLIGHTLY_OFF_SHARE + EDGE) return side === 'low' ? 'slightly_low' : 'slightly_high';
	if (share <= OFF_SHARE + EDGE) return side;
	return side === 'low' ? 'very_low' : 'very_high';
}

/** The crop's name in the UI language (Japanese for `ja`, else English). */
export function cropDisplayName(
	crop: Pick<CropTypeDetailDto, 'name_en' | 'name_ja'>,
	locale: string
): string {
	return locale.toLowerCase().startsWith('ja') ? crop.name_ja : crop.name_en;
}

/**
 * Leaf-to-air vapour pressure deficit (kPa) with the leaf at air temperature
 * (Tetens' saturation vapour pressure). Null without both readings.
 */
export function vaporPressureDeficit(
	airTemperatureC: number | null | undefined,
	relativeHumidity: number | null | undefined
): number | null {
	if (
		airTemperatureC === null ||
		airTemperatureC === undefined ||
		relativeHumidity === null ||
		relativeHumidity === undefined ||
		!Number.isFinite(airTemperatureC) ||
		!Number.isFinite(relativeHumidity)
	) {
		return null;
	}
	const saturation = 0.6108 * Math.exp((17.27 * airTemperatureC) / (airTemperatureC + 237.3));
	const humidity = Math.min(100, Math.max(0, relativeHumidity));
	return saturation * (1 - humidity / 100);
}
