import { CW_EMPTY_VALUE, type CwTone } from '@cropwatchdevelopment/cwui';
import type { CropTargetDto, CropTypeDetailDto, PreferencesDto } from '$lib/api/api.dtos';
import {
	cropTarget,
	judgeReading,
	type DayPeriod,
	type TargetStatus
} from '$lib/agronomy/crop-targets';
import { formatNumber } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { formatSensorMeasurement, resolveDisplayUnit } from '$lib/units';
import type { SoilField } from './soil-readings';

/** One line of the crop targets card: the reading now, its target and where it sits. */
export interface CropTargetRow {
	key: string;
	label: string;
	/** The reading with its unit, in the user's units. */
	now: string;
	/** The optimal band with its unit, in the user's units ("—" when the crop has none). */
	target: string;
	status: TargetStatus | null;
	/** A daytime-only target (CO₂, VPD) at night: shown for reference, not judged. */
	daytimeOnly: boolean;
}

/** A target with at least one bound. */
export function hasBounds(target: CropTargetDto | null): target is CropTargetDto {
	return (
		target !== null &&
		[target.min_value, target.optimal_min, target.optimal_max, target.max_value].some(
			(bound) => bound !== null
		)
	);
}

interface RowSpec {
	key: string;
	metric: string;
	/** The reading's field; VPD is derived instead. */
	field?: SoilField;
	label: () => string;
	digits: number;
	daytimeOnly?: boolean;
	/**
	 * Shown, never judged, when the crop has no target the sensor can be
	 * compared with: soil EC falls back to the lab soil test (1:5 extract),
	 * which an in-soil probe does not read directly.
	 */
	referenceMetric?: string;
}

const ROWS: RowSpec[] = [
	{
		key: 'moisture',
		metric: 'soil_moisture',
		field: 'moisture',
		label: () => m.rule_subject_soil_moisture(),
		digits: 1
	},
	{
		key: 'temperature_c',
		metric: 'soil_temperature',
		field: 'temperature_c',
		label: () => m.display_soil_temperature(),
		digits: 1
	},
	{
		key: 'ec',
		metric: 'soil_ec',
		field: 'ec',
		label: () => m.sensor_ec(),
		digits: 2,
		referenceMetric: 'soil_ec_1to5'
	},
	{ key: 'ph', metric: 'soil_ph', field: 'ph', label: () => m.rule_subject_ph(), digits: 1 },
	{
		key: 'air_temperature_c',
		metric: 'air_temperature',
		field: 'air_temperature_c',
		label: () => m.sensor_air_temperature(),
		digits: 1
	},
	{
		key: 'air_humidity',
		metric: 'air_humidity',
		field: 'air_humidity',
		label: () => m.sensor_air_humidity(),
		digits: 0
	},
	{ key: 'vpd', metric: 'vpd', label: () => 'VPD', digits: 2, daytimeOnly: true },
	{
		key: 'co2',
		metric: 'co2',
		field: 'co2',
		label: () => m.sensor_co2(),
		digits: 0,
		daytimeOnly: true
	}
];

/**
 * "19.3–24.2 %", "≥ 20 %", "≤ 900 ppm", or "—" without a band. A target with
 * only stress limits (e.g. night humidity ≤ 93 %) shows those limits.
 */
export function formatBand(
	target: CropTargetDto | null,
	format: (value: number) => string,
	unit: string
): string {
	const hasBand = target?.optimal_min != null || target?.optimal_max != null;
	const low = (hasBand ? target?.optimal_min : target?.min_value) ?? null;
	const high = (hasBand ? target?.optimal_max : target?.max_value) ?? null;
	const withUnit = (text: string) => (unit ? `${text} ${unit}` : text);
	if (low !== null && high !== null) return withUnit(`${format(low)}–${format(high)}`);
	if (low !== null) return withUnit(`≥ ${format(low)}`);
	if (high !== null) return withUnit(`≤ ${format(high)}`);
	return CW_EMPTY_VALUE;
}

/**
 * The crop targets card's rows for the readings this board reports. Readings
 * are judged in their stored units (the targets' units) and shown in the
 * user's preferred ones.
 */
export function buildCropTargetRows(input: {
	crop: CropTypeDetailDto;
	period: DayPeriod;
	readings: Partial<Record<SoilField, number | null>>;
	vpd: number | null;
	preferences?: PreferencesDto | null;
}): CropTargetRow[] {
	const { crop, period, readings, vpd, preferences } = input;
	const rows: CropTargetRow[] = [];

	for (const spec of ROWS) {
		const value = spec.field ? (readings[spec.field] ?? null) : vpd;
		if (value === null) continue; // the board does not measure it

		const ownTarget = cropTarget(
			crop,
			spec.metric,
			period === 'night' && spec.daytimeOnly ? 'day' : period
		);
		// Without a target the sensor can be compared with, show the reference one.
		const reference =
			!hasBounds(ownTarget) && spec.referenceMetric
				? cropTarget(crop, spec.referenceMetric, period)
				: null;
		const isReference = hasBounds(reference);
		const target = isReference ? reference : ownTarget;
		const daytimeOnly = period === 'night' && spec.daytimeOnly === true;
		const digits = { maximumFractionDigits: spec.digits };
		const field = spec.field;

		const band = field
			? formatBand(
					target,
					(bound) =>
						formatSensorMeasurement(field, bound, preferences, { ...digits, withUnit: false })
							.valueDisplay,
					resolveDisplayUnit(field, preferences)
				)
			: formatBand(target, (bound) => formatNumber(bound, digits), 'kPa');

		rows.push({
			key: spec.key,
			label: spec.label(),
			now: field
				? formatSensorMeasurement(field, value, preferences, digits).display
				: `${formatNumber(value, digits)} kPa`,
			target: isReference ? m.soil_crop_targets_lab_reference({ band }) : band,
			status: daytimeOnly || isReference ? null : judgeReading(value, target),
			daytimeOnly
		});
	}
	return rows;
}

/** The status chip's text. */
export function targetStatusLabel(status: TargetStatus): string {
	switch (status) {
		case 'too_low':
			return m.soil_target_status_too_low();
		case 'low':
			return m.soil_target_status_low();
		case 'optimal':
			return m.soil_target_status_optimal();
		case 'high':
			return m.soil_target_status_high();
		case 'too_high':
			return m.soil_target_status_too_high();
	}
}

/** The status chip's tone: in band, outside it, or past a stress limit. */
export function targetStatusTone(status: TargetStatus): CwTone {
	if (status === 'optimal') return 'success';
	return status === 'too_low' || status === 'too_high' ? 'danger' : 'warning';
}
