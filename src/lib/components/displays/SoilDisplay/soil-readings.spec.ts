import { describe, expect, it } from 'vitest';
import {
	DLI_MAX_GAP_MS,
	dailyDli,
	dliToday,
	previousDays,
	fieldSeries,
	latestReading,
	readingOrNull,
	toSoilRows
} from './soil-readings';

describe('readingOrNull', () => {
	it('keeps finite numbers, numeric strings included', () => {
		expect(readingOrNull(18.5)).toBe(18.5);
		expect(readingOrNull(0)).toBe(0);
		expect(readingOrNull('25.32')).toBe(25.32);
	});

	it('turns a missing or unreadable value into null, never 0', () => {
		for (const value of [null, undefined, '', 'n/a', Number.NaN, Infinity, {}]) {
			expect(readingOrNull(value)).toBeNull();
		}
	});
});

describe('toSoilRows', () => {
	it('maps every soil field, null where the reading lacks it', () => {
		expect(
			toSoilRows([
				{
					id: 7,
					created_at: '2026-11-07T02:21:00Z',
					temperature_c: 21.35,
					moisture: 47.5,
					ppfd: '614'
				},
				{ created_at: '2026-11-07T02:04:00Z' }
			])
		).toEqual([
			{
				id: '7',
				created_at: '2026-11-07T02:21:00Z',
				temperature_c: 21.35,
				moisture: 47.5,
				ec: null,
				ph: null,
				air_temperature_c: null,
				air_humidity: null,
				co2: null,
				ppfd: 614
			},
			{
				id: '2026-11-07T02:04:00Z-1',
				created_at: '2026-11-07T02:04:00Z',
				temperature_c: null,
				moisture: null,
				ec: null,
				ph: null,
				air_temperature_c: null,
				air_humidity: null,
				co2: null,
				ppfd: null
			}
		]);
		expect(toSoilRows([{}])[0].created_at).toBe('');
	});
});

describe('latestReading', () => {
	// Newest first, as the device page passes the history.
	const rows = toSoilRows([
		{ created_at: '2026-11-07T02:21:00Z', temperature_c: 21.35, ppfd: null },
		{ created_at: '2026-11-07T02:04:00Z' },
		{ created_at: '2026-11-07T02:03:00Z', temperature_c: 20.64, ppfd: 590 }
	]);

	it('takes the newest reading that carries the field', () => {
		expect(latestReading(rows, 'temperature_c')).toEqual({
			value: 21.35,
			at: '2026-11-07T02:21:00Z'
		});
		// The newest reading lost its light frame: fall back to the one before.
		expect(latestReading(rows, 'ppfd')).toEqual({ value: 590, at: '2026-11-07T02:03:00Z' });
		expect(latestReading(rows, 'co2')).toBeNull();
	});

	it("prefers the device's latest row when it has the field", () => {
		const latestData = { created_at: '2026-11-07T02:38:00Z', temperature_c: 22, ppfd: null };
		expect(latestReading(rows, 'temperature_c', latestData)).toEqual({
			value: 22,
			at: '2026-11-07T02:38:00Z'
		});
		expect(latestReading(rows, 'ppfd', latestData)).toEqual({
			value: 590,
			at: '2026-11-07T02:03:00Z'
		});
		expect(latestReading([], 'ec', { ec: 0.3 })).toEqual({ value: 0.3, at: '' });
	});
});

describe('fieldSeries', () => {
	const chronological = toSoilRows([
		{ created_at: '2026-11-07T02:03:00Z', air_temperature_c: 25.32 },
		{ created_at: '2026-11-07T02:04:00Z' },
		{ created_at: 'not a date', air_temperature_c: 30 },
		{ created_at: '2026-11-07T02:21:00Z', air_temperature_c: '25.47' }
	]);

	it('skips readings without the field, oldest first', () => {
		expect(fieldSeries(chronological, 'air_temperature_c')).toEqual([
			{ t: Date.parse('2026-11-07T02:03:00Z'), v: 25.32 },
			{ t: Date.parse('2026-11-07T02:21:00Z'), v: 25.47 }
		]);
	});

	it('converts each value', () => {
		expect(fieldSeries(chronological, 'air_temperature_c', (c) => c * 2).map((p) => p.v)).toEqual([
			50.64, 50.94
		]);
	});
});

describe('dliToday', () => {
	// Local times today, so the test holds in any time zone.
	const at = (hours: number, minutes = 0) => new Date(2026, 10, 7, hours, minutes).getTime();
	const now = new Date(2026, 10, 7, 18, 0);

	it('integrates PPFD (µmol/m²/s) between readings into mol/m²', () => {
		// 500 µmol/m²/s held for one hour = 500 × 3600 / 1e6 = 1.8 mol/m².
		const points = [
			{ t: at(10), v: 500 },
			{ t: at(10, 30), v: 500 },
			{ t: at(11), v: 500 }
		];
		expect(dliToday(points, now)).toBeCloseTo(1.8, 10);
	});

	it('uses the trapezoid between two readings', () => {
		// Ramp 0 → 1000 over 30 min: average 500 × 1800 s = 0.9 mol/m².
		expect(
			dliToday(
				[
					{ t: at(9), v: 0 },
					{ t: at(9, 30), v: 1000 }
				],
				now
			)
		).toBeCloseTo(0.9, 10);
	});

	it('does not bridge a gap longer than an hour, nor count yesterday or the future', () => {
		const points = [
			{ t: at(0) - 30 * 60_000, v: 800 }, // yesterday
			{ t: at(8), v: 400 },
			{ t: at(8) + DLI_MAX_GAP_MS + 60_000, v: 400 }, // outage: not bridged
			{ t: at(9, 31), v: 400 },
			{ t: at(19), v: 900 } // after `now`
		];
		// Only 9:01 → 9:31 counts: 400 × 1800 s = 0.72 mol/m².
		expect(dliToday(points, now)).toBeCloseTo(0.72, 10);
	});

	it('is 0 with a single reading today and null with none', () => {
		expect(dliToday([{ t: at(12), v: 600 }], now)).toBe(0);
		expect(dliToday([{ t: at(12), v: null }], now)).toBeNull();
		expect(dliToday([], now)).toBeNull();
	});
});

describe('dailyDli', () => {
	const at = (day: number, hours: number, minutes = 0) =>
		new Date(2026, 10, day, hours, minutes).getTime();
	/** 500 µmol/m²/s from 10:00 to 11:00 on a day: 1.8 mol/m². */
	const hourOfLight = (day: number) => [
		{ t: at(day, 10), v: 500 },
		{ t: at(day, 10, 30), v: 500 },
		{ t: at(day, 11), v: 500 }
	];

	it('totals each local day, oldest first, leaving out days without readings', () => {
		const points = [...hourOfLight(1), ...hourOfLight(3), { t: at(3, 12), v: null }];

		const days = dailyDli(points, new Date(2026, 10, 1), new Date(2026, 10, 4));

		expect(days.map((day) => day.date)).toEqual(['2026-11-01', '2026-11-03']);
		expect(days[0].value).toBeCloseTo(1.8, 10);
		expect(days[1].value).toBeCloseTo(1.8, 10);
	});

	it('counts a reading at midnight in the day it starts, once', () => {
		const days = dailyDli(
			[
				{ t: at(1, 23, 30), v: 0 },
				{ t: at(2, 0), v: 0 },
				{ t: at(2, 0, 30), v: 0 }
			],
			new Date(2026, 10, 1),
			new Date(2026, 10, 3)
		);
		expect(days).toEqual([
			{ date: '2026-11-01', value: 0 },
			{ date: '2026-11-02', value: 0 }
		]);
	});

	it('is empty for a range without days or readings', () => {
		expect(dailyDli([], new Date(2026, 10, 1), new Date(2026, 10, 8))).toEqual([]);
		expect(dailyDli(hourOfLight(1), new Date(2026, 10, 2), new Date(2026, 10, 2))).toEqual([]);
	});
});

describe('previousDays', () => {
	it('spans the complete local days before today', () => {
		expect(previousDays(new Date(2026, 10, 7, 14, 30), 7)).toEqual({
			start: new Date(2026, 9, 31),
			end: new Date(2026, 10, 7)
		});
	});
});
