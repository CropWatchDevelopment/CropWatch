import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CropTargetDto, CropTypeDetailDto, PreferencesDto } from '$lib/api/api.dtos';
import { formatDateTime } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { convertSensorValue, resolveDisplayUnit } from '$lib/units';
import { buildSoilLight, buildSoilPanel, soilPanelSubtitle } from './soil-panel';
import { latestReading, SOIL_FIELDS, toSoilRows, type SoilRow } from './soil-readings';

const FAHRENHEIT = { temperature_unit: 'fahrenheit' } as PreferencesDto;

function target(
	metric: string,
	period: CropTargetDto['period'],
	[min_value, optimal_min, optimal_max, max_value]: (number | null)[]
): CropTargetDto {
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

const TOMATO: CropTypeDetailDto = {
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
		target('soil_moisture', 'all', [12.5, 19.3, 24.2, null]),
		target('soil_temperature', 'all', [14, 15, 20, null]),
		target('soil_ec', 'all', [null, null, null, null]),
		target('soil_ec_1to5', 'all', [null, 0.2, 0.5, null]),
		target('air_temperature', 'day', [12, 20, 25, 35]),
		target('air_temperature', 'night', [12, 13, 18, null]),
		target('air_humidity', 'day', [null, 60, 80, null]),
		target('co2', 'day', [null, 600, 900, null]),
		target('dli', 'all', [null, 20, 30, null])
	]
};

/** Oldest first, as the panel reads them. */
const ROWS: SoilRow[] = toSoilRows([
	{
		created_at: '2026-11-08T04:17:00.000Z',
		temperature_c: 21,
		moisture: 46.2,
		ec: 0.23,
		air_temperature_c: 24.4,
		air_humidity: 66,
		co2: 452
	},
	{
		created_at: '2026-11-08T04:52:00.000Z',
		temperature_c: 20.9,
		moisture: 47,
		ec: 0.22,
		air_temperature_c: 23.6,
		air_humidity: 73,
		co2: 508,
		ppfd: 242
	}
]);

const newestFirst = () => [...ROWS].reverse();
const latestOf = (rows: SoilRow[] = newestFirst()) =>
	Object.fromEntries(SOIL_FIELDS.map((field) => [field, latestReading(rows, field)]));

afterEach(() => {
	vi.useRealTimers();
});

describe('buildSoilPanel', () => {
	it('gives every reading in the user units, newest value first, with no targets without a crop', () => {
		const { air, ground } = buildSoilPanel({
			rows: ROWS,
			latest: latestOf(),
			crop: null,
			period: 'day',
			preferences: FAHRENHEIT
		});

		expect(air.map((metric) => metric.key)).toEqual(['air_temperature', 'air_humidity', 'co2']);
		expect(ground.map((metric) => metric.key)).toEqual([
			'soil_temperature',
			'soil_moisture',
			'soil_ec',
			'soil_ph'
		]);
		const airTemperature = air[0];
		expect(airTemperature).toMatchObject({
			label: m.sensor_air_temperature(),
			unit: resolveDisplayUnit('air_temperature_c', FAHRENHEIT),
			decimals: 1,
			current: convertSensorValue('air_temperature_c', 23.6, FAHRENHEIT)
		});
		expect(airTemperature.data).toEqual([
			{
				t: Date.parse(ROWS[0].created_at),
				v: convertSensorValue('air_temperature_c', 24.4, FAHRENHEIT)
			},
			{
				t: Date.parse(ROWS[1].created_at),
				v: convertSensorValue('air_temperature_c', 23.6, FAHRENHEIT)
			}
		]);
		expect(airTemperature.target).toBeUndefined();
		expect(airTemperature.note).toBeUndefined();
		// No pH from this probe: the panel leaves an empty reading out.
		expect(ground[3]).toMatchObject({ key: 'soil_ph', data: [], current: null });
	});

	it("judges against the crop's targets for the time of day, converted to the user units", () => {
		const day = buildSoilPanel({
			rows: ROWS,
			latest: latestOf(),
			crop: TOMATO,
			period: 'day',
			preferences: FAHRENHEIT
		});
		const toF = (value: number) => convertSensorValue('air_temperature_c', value, FAHRENHEIT);

		expect(day.air[0].target).toEqual({
			min: toF(12),
			optimalMin: toF(20),
			optimalMax: toF(25),
			max: toF(35)
		});
		expect(day.air[1].target).toEqual({ min: null, optimalMin: 60, optimalMax: 80, max: null });
		expect(day.air[2].target).toEqual({ min: null, optimalMin: 600, optimalMax: 900, max: null });
		expect(day.ground[1].target).toEqual({
			min: 12.5,
			optimalMin: 19.3,
			optimalMax: 24.2,
			max: null
		});

		const night = buildSoilPanel({
			rows: ROWS,
			latest: latestOf(),
			crop: TOMATO,
			period: 'night',
			preferences: FAHRENHEIT
		});
		expect(night.air[0].target).toEqual({
			min: toF(12),
			optimalMin: toF(13),
			optimalMax: toF(18),
			max: null
		});
		// CO₂ is a daytime target: at night it is noted, not judged.
		expect(night.air[2].target).toBeUndefined();
		expect(night.air[2].note).toBe(m.soil_crop_targets_daytime_only());
	});

	it('notes the lab-test EC band instead of judging the probe against it', () => {
		const { ground } = buildSoilPanel({
			rows: ROWS,
			latest: latestOf(),
			crop: TOMATO,
			period: 'day'
		});

		expect(ground[2].target).toBeUndefined();
		expect(ground[2].note).toBe(
			m.soil_crop_targets_lab_reference({ band: `0.2–0.5 ${resolveDisplayUnit('ec')}` })
		);
		// pH has no target for this crop.
		expect(ground[3].target).toBeUndefined();
		expect(ground[3].note).toBeUndefined();
	});
});

describe('buildSoilLight', () => {
	it('is left out for a board without a light sensor', () => {
		const rows = toSoilRows([{ created_at: '2026-11-08T04:52:00.000Z', moisture: 40 }]);
		expect(buildSoilLight({ rows, latest: latestOf(rows), dli: null, dliTarget: null })).toBeNull();
	});

	it('passes the light readings, the DLI so far and the daily goal', () => {
		const goal = target('dli', 'all', [null, 20, 30, null]);
		expect(buildSoilLight({ rows: ROWS, latest: latestOf(), dli: 14, dliTarget: goal })).toEqual({
			data: [{ t: Date.parse(ROWS[1].created_at), v: 242 }],
			current: 242,
			dli: 14,
			dliTarget: { min: 20, max: 30 }
		});
		expect(
			buildSoilLight({ rows: ROWS, latest: latestOf(), dli: null, dliTarget: null })?.dliTarget
		).toBeNull();
	});
});

describe('soilPanelSubtitle', () => {
	it('counts the readings and gives the time of the newest, with its date when not from today', () => {
		const newest = ROWS[1].created_at;
		vi.useFakeTimers({ toFake: ['Date'] });

		vi.setSystemTime(new Date(newest));
		expect(soilPanelSubtitle(ROWS, new Date())).toBe(
			m.soil_panel_subtitle({
				count: 2,
				time: formatDateTime(newest, { hour: '2-digit', minute: '2-digit' })
			})
		);

		const twoDaysLater = new Date(Date.parse(newest) + 2 * 24 * 60 * 60 * 1000);
		expect(soilPanelSubtitle([ROWS[1]], twoDaysLater)).toBe(
			m.soil_panel_subtitle_one({
				time: formatDateTime(newest, {
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				})
			})
		);
	});

	it('has nothing to say without readings', () => {
		expect(soilPanelSubtitle([], new Date())).toBeUndefined();
		expect(
			soilPanelSubtitle(toSoilRows([{ created_at: 'not a date' }]), new Date())
		).toBeUndefined();
	});
});
