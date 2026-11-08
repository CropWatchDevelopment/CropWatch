import type {
	CwAboveBelowLight,
	CwAboveBelowMetric,
	CwAboveBelowTarget
} from '@cropwatchdevelopment/cwui';
import type { CropTargetDto, CropTypeDetailDto, PreferencesDto } from '$lib/api/api.dtos';
import { cropTarget, type DayPeriod } from '$lib/agronomy/crop-targets';
import { formatDateTime } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { convertSensorValue, formatSensorMeasurement, resolveDisplayUnit } from '$lib/units';
import { formatBand, hasBounds } from './soil-crop-targets';
import { fieldSeries, type LatestReading, type SoilField, type SoilRow } from './soil-readings';

/** One reading of the soil board's above / below ground panel. */
interface PanelReading {
	field: SoilField;
	/** CWUI metric key: picks the reading's colour and icon. */
	key: string;
	/** The crop target metric it is judged against. */
	metric: string;
	label: () => string;
	decimals: number;
	/** A daytime target (CO₂): at night the reading is shown without one. */
	daytimeOnly?: boolean;
	/**
	 * A lab-test target shown as a note, never judged, when the crop has no
	 * target the sensor can be compared with (soil EC → the 1:5 extract).
	 */
	referenceMetric?: string;
}

const AIR: PanelReading[] = [
	{
		field: 'air_temperature_c',
		key: 'air_temperature',
		metric: 'air_temperature',
		label: () => m.sensor_air_temperature(),
		decimals: 1
	},
	{
		field: 'air_humidity',
		key: 'air_humidity',
		metric: 'air_humidity',
		label: () => m.sensor_air_humidity(),
		decimals: 0
	},
	{
		field: 'co2',
		key: 'co2',
		metric: 'co2',
		label: () => m.sensor_co2(),
		decimals: 0,
		daytimeOnly: true
	}
];

const GROUND: PanelReading[] = [
	{
		field: 'temperature_c',
		key: 'soil_temperature',
		metric: 'soil_temperature',
		label: () => m.display_soil_temperature(),
		decimals: 1
	},
	{
		field: 'moisture',
		key: 'soil_moisture',
		metric: 'soil_moisture',
		label: () => m.rule_subject_soil_moisture(),
		decimals: 1
	},
	{
		field: 'ec',
		key: 'soil_ec',
		metric: 'soil_ec',
		label: () => m.sensor_ec(),
		decimals: 2,
		referenceMetric: 'soil_ec_1to5'
	},
	{ field: 'ph', key: 'soil_ph', metric: 'soil_ph', label: () => m.rule_subject_ph(), decimals: 1 }
];

export interface SoilPanelInput {
	/** The range's readings, oldest first. */
	rows: SoilRow[];
	/** Newest value of each field (it may come from the device's latest reading). */
	latest: Partial<Record<SoilField, LatestReading | null>>;
	crop: CropTypeDetailDto | null;
	period: DayPeriod;
	preferences?: PreferencesDto | null;
}

/** A crop target in the user's units (conversions keep the order of the bounds). */
function toDisplayTarget(
	target: CropTargetDto,
	convert: (value: number) => number
): CwAboveBelowTarget {
	const bound = (value: number | null) => (value === null ? null : convert(value));
	return {
		min: bound(target.min_value),
		optimalMin: bound(target.optimal_min),
		optimalMax: bound(target.optimal_max),
		max: bound(target.max_value)
	};
}

function toMetric(reading: PanelReading, input: SoilPanelInput): CwAboveBelowMetric {
	const { rows, latest, crop, period, preferences } = input;
	const convert = (value: number) => convertSensorValue(reading.field, value, preferences);
	const unit = resolveDisplayUnit(reading.field, preferences);
	const current = latest[reading.field]?.value;
	const metric: CwAboveBelowMetric = {
		key: reading.key,
		label: reading.label(),
		unit,
		decimals: reading.decimals,
		data: fieldSeries(rows, reading.field, convert),
		current: current === undefined ? null : convert(current)
	};
	if (!crop) return metric;

	if (reading.daytimeOnly && period === 'night') {
		return { ...metric, note: m.soil_crop_targets_daytime_only() };
	}
	const own = cropTarget(crop, reading.metric, period);
	if (hasBounds(own)) return { ...metric, target: toDisplayTarget(own, convert) };

	const reference = reading.referenceMetric
		? cropTarget(crop, reading.referenceMetric, period)
		: null;
	if (!hasBounds(reference)) return metric;
	const band = formatBand(
		reference,
		(bound) =>
			formatSensorMeasurement(reading.field, bound, preferences, {
				maximumFractionDigits: reading.decimals,
				withUnit: false
			}).valueDisplay,
		unit
	);
	return { ...metric, note: m.soil_crop_targets_lab_reference({ band }) };
}

/**
 * The air and ground readings for the panel, in the user's units, with the
 * crop's targets for this time of day. Readings the board does not report are
 * left out by the panel itself.
 */
export function buildSoilPanel(input: SoilPanelInput): {
	air: CwAboveBelowMetric[];
	ground: CwAboveBelowMetric[];
} {
	return {
		air: AIR.map((reading) => toMetric(reading, input)),
		ground: GROUND.map((reading) => toMetric(reading, input))
	};
}

/** The panel's light strip; null for boards without a light sensor. */
export function buildSoilLight(input: {
	rows: SoilRow[];
	latest: Partial<Record<SoilField, LatestReading | null>>;
	/** DLI so far today (mol/m²). */
	dli: number | null;
	/** The crop's daily light goal. */
	dliTarget: CropTargetDto | null;
}): CwAboveBelowLight | null {
	const now = input.latest.ppfd;
	if (!now) return null;
	return {
		data: fieldSeries(input.rows, 'ppfd'),
		current: now.value,
		dli: input.dli,
		dliTarget: input.dliTarget
			? { min: input.dliTarget.optimal_min, max: input.dliTarget.optimal_max }
			: null
	};
}

/** "84 readings · latest 13:52" (the date too when the newest reading is not from today). */
export function soilPanelSubtitle(rows: SoilRow[], now: Date): string | undefined {
	let newest: number | null = null;
	for (const row of rows) {
		const time = Date.parse(row.created_at);
		if (Number.isFinite(time) && (newest === null || time > newest)) newest = time;
	}
	if (newest === null) return undefined;
	const sameDay = new Date(newest).toDateString() === now.toDateString();
	const time = formatDateTime(
		newest,
		sameDay
			? { hour: '2-digit', minute: '2-digit' }
			: { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
	);
	return rows.length === 1
		? m.soil_panel_subtitle_one({ time })
		: m.soil_panel_subtitle({ count: rows.length, time });
}
