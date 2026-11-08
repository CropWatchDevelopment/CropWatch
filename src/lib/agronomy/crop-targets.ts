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
 * Where a reading sits: past a stress limit (`too_low` / `too_high`), outside
 * the optimal band (`low` / `high`) or inside it (`optimal`). Null when there
 * is no reading, or nothing to judge it against.
 */
export type TargetStatus = 'too_low' | 'low' | 'optimal' | 'high' | 'too_high';

export function judgeReading(
	value: number | null | undefined,
	target: CropTargetDto | null
): TargetStatus | null {
	if (value === null || value === undefined || !Number.isFinite(value) || !target) return null;
	if (target.min_value !== null && value < target.min_value) return 'too_low';
	if (target.max_value !== null && value > target.max_value) return 'too_high';
	if (target.optimal_min !== null && value < target.optimal_min) return 'low';
	if (target.optimal_max !== null && value > target.optimal_max) return 'high';
	if (target.optimal_min === null && target.optimal_max === null) return null;
	return 'optimal';
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
