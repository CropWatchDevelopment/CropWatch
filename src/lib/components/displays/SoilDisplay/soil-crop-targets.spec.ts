import { describe, expect, it } from 'vitest';
import type { CropTargetDto, CropTypeDetailDto, PreferencesDto } from '$lib/api/api.dtos';
import { formatNumber } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { formatSensorMeasurement } from '$lib/units';
import { buildCropTargetRows, targetStatusLabel, targetStatusTone } from './soil-crop-targets';

function target(
	metric: string,
	period: CropTargetDto['period'],
	band: [number | null, number | null, number | null, number | null]
): CropTargetDto {
	const [min_value, optimal_min, optimal_max, max_value] = band;
	return {
		metric,
		period,
		unit: '',
		min_value,
		optimal_min,
		optimal_max,
		max_value,
		notes: null,
		sources: []
	};
}

const crop: CropTypeDetailDto = {
	id: 1,
	code: 'tomato',
	name_en: 'Tomato',
	name_ja: 'トマト',
	category: 'fruiting_vegetable',
	cultivation: 'both',
	sort_order: 10,
	notes: null,
	is_active: true,
	targets: [
		target('soil_moisture', 'all', [12, 19, 24, 35]),
		target('soil_temperature', 'all', [13, 15, 20, 30]),
		target('soil_ec', 'all', [null, null, null, null]),
		target('soil_ec_1to5', 'all', [null, 0.2, 0.5, null]),
		target('air_temperature', 'day', [8, 20, 25, 35]),
		target('air_temperature', 'night', [8, 10, 15, 22]),
		target('air_humidity', 'day', [null, 60, null, null]),
		target('vpd', 'day', [0.2, 0.5, 1.0, 1.6]),
		target('co2', 'day', [null, null, 900, null]),
		target('air_humidity', 'night', [null, null, null, 93])
	]
};

const readings = {
	moisture: 22,
	temperature_c: 12,
	ec: 0.4,
	ph: null,
	air_temperature_c: 18,
	air_humidity: 70,
	co2: 1200,
	ppfd: 500
};

const keyed = (rows: ReturnType<typeof buildCropTargetRows>) =>
	Object.fromEntries(rows.map((row) => [row.key, row]));

describe('buildCropTargetRows', () => {
	it('judges each reading the board reports against its day target', () => {
		const rows = buildCropTargetRows({ crop, period: 'day', readings, vpd: 0.62 });

		expect(rows.map((row) => row.key)).toEqual([
			'moisture',
			'temperature_c',
			'ec',
			'air_temperature_c',
			'air_humidity',
			'vpd',
			'co2'
		]);
		const row = keyed(rows);
		expect(row.moisture).toMatchObject({
			label: m.rule_subject_soil_moisture(),
			now: formatSensorMeasurement('moisture', 22, null, { maximumFractionDigits: 1 }).display,
			status: 'optimal',
			daytimeOnly: false
		});
		expect(row.moisture.target).toBe(`${formatNumber(19)}–${formatNumber(24)} %`);
		expect(row.temperature_c.status).toBe('too_low');
		// No probe-basis EC band: the lab soil-test band is shown for reference, not judged.
		const ec = (value: number) => formatNumber(value, { maximumFractionDigits: 2 });
		expect(row.ec).toMatchObject({
			target: m.soil_crop_targets_lab_reference({ band: `${ec(0.2)}–${ec(0.5)} mS/cm` }),
			status: null
		});
		expect(row.air_temperature_c.status).toBe('low');
		expect(row.air_humidity).toMatchObject({
			target: `≥ ${formatNumber(60)} %`,
			status: 'optimal'
		});
		expect(row.vpd).toMatchObject({
			now: `${formatNumber(0.62, { maximumFractionDigits: 2 })} kPa`,
			target: `${formatNumber(0.5, { maximumFractionDigits: 2 })}–${formatNumber(1, { maximumFractionDigits: 2 })} kPa`,
			status: 'optimal'
		});
		expect(row.co2).toMatchObject({ target: `≤ ${formatNumber(900)} ppm`, status: 'high' });
	});

	it('uses the night targets at night, and only shows the daytime-only ones', () => {
		const row = keyed(buildCropTargetRows({ crop, period: 'night', readings, vpd: 0.62 }));

		expect(row.air_temperature_c).toMatchObject({ status: 'high', daytimeOnly: false });
		expect(row.air_temperature_c.target).toBe(`${formatNumber(10)}–${formatNumber(15)} °C`);
		expect(row.co2).toMatchObject({ status: null, daytimeOnly: true });
		expect(row.vpd).toMatchObject({ status: null, daytimeOnly: true });
		// Night humidity has only a disease-risk limit: shown as that limit.
		expect(row.air_humidity).toMatchObject({ target: `≤ ${formatNumber(93)} %`, status: null });
		expect(
			keyed(
				buildCropTargetRows({
					crop,
					period: 'night',
					readings: { ...readings, air_humidity: 96 },
					vpd: null
				})
			).air_humidity.status
		).toBe('too_high');
		// A day row does not apply at night: without a night or all-day row, no target.
		const dayOnly = { ...crop, targets: crop.targets.filter((t) => t.period !== 'night') };
		expect(
			keyed(buildCropTargetRows({ crop: dayOnly, period: 'night', readings, vpd: null }))
				.air_humidity
		).toMatchObject({ target: '—', status: null });
	});

	it("shows readings and targets in the user's units, judged in stored units", () => {
		const fahrenheit = { temperature_unit: 'fahrenheit' } as PreferencesDto;
		const row = keyed(
			buildCropTargetRows({ crop, period: 'day', readings, vpd: null, preferences: fahrenheit })
		);

		expect(row.temperature_c.now).toBe(
			formatSensorMeasurement('temperature_c', 12, fahrenheit, { maximumFractionDigits: 1 }).display
		);
		expect(row.temperature_c.target).toBe(`${formatNumber(59)}–${formatNumber(68)} °F`);
		expect(row.temperature_c.status).toBe('too_low');
		expect(row.vpd).toBeUndefined();
	});
});

describe('targetStatusLabel / targetStatusTone', () => {
	it('names and colours every status', () => {
		expect(
			(['too_low', 'low', 'optimal', 'high', 'too_high'] as const).map((status) => [
				targetStatusLabel(status),
				targetStatusTone(status)
			])
		).toEqual([
			[m.soil_target_status_too_low(), 'danger'],
			[m.soil_target_status_low(), 'warning'],
			[m.soil_target_status_optimal(), 'success'],
			[m.soil_target_status_high(), 'warning'],
			[m.soil_target_status_too_high(), 'danger']
		]);
	});
});

describe('buildCropTargetRows EC', () => {
	const ecCrop = (targets: CropTargetDto[]): CropTypeDetailDto => ({ ...crop, targets });

	it('judges the probe reading against a probe-basis band, ignoring the lab one', () => {
		const [row] = buildCropTargetRows({
			crop: ecCrop([
				target('soil_ec', 'all', [null, 0.5, 0.7, null]),
				target('soil_ec_1to5', 'all', [null, 0.5, 1, null])
			]),
			period: 'day',
			readings: { ec: 0.4 },
			vpd: null
		});
		const ec = (value: number) => formatNumber(value, { maximumFractionDigits: 2 });
		expect(row).toMatchObject({ key: 'ec', target: `${ec(0.5)}–${ec(0.7)} mS/cm`, status: 'low' });
	});

	it('shows a dash with neither band', () => {
		const [row] = buildCropTargetRows({
			crop: ecCrop([]),
			period: 'day',
			readings: { ec: 0.4 },
			vpd: null
		});
		expect(row).toMatchObject({ key: 'ec', target: '—', status: null });
	});
});
