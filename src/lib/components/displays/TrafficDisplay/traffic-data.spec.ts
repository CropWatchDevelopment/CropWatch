import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatNumber } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import {
	buildDailyTrafficSummaries,
	buildHourlyTrafficRows,
	computeTrafficKpis,
	formatDay,
	formatHour,
	formatMeasurement,
	formatTrafficValue,
	getDayBounds,
	getMonthBounds,
	isRecord,
	metricEmoji,
	metricLabel,
	metricLabelText,
	normalizeTrafficRows,
	parseDate,
	readNumber,
	readString,
	resolveTrafficClassKeys,
	rowHourStart,
	shiftDayKey,
	sumTrafficValues,
	toDayKey,
	toHourKey,
	toHourStart,
	trafficClassColor,
	TRAFFIC_CLASS_KEYS,
	type TrafficRow
} from './traffic-data';

// Every fixture is built from local-time dates, as the display buckets in the
// viewer's time zone: the expectations hold in any time zone.
const local = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);
const at = (day: number, hour: number, minute = 0) => local(day, hour, minute).toISOString();

function row(overrides: Record<string, unknown>): TrafficRow {
	return { id: 'r', created_at: at(21, 9), dev_eui: 'CAM-1', ...overrides } as TrafficRow;
}

describe('value guards', () => {
	it('recognises plain objects only', () => {
		expect(isRecord({ a: 1 })).toBe(true);
		expect(isRecord([])).toBe(false);
		expect(isRecord(null)).toBe(false);
		expect(isRecord('row')).toBe(false);
	});

	it('reads finite numbers from numbers and numeric strings', () => {
		expect(readNumber(4)).toBe(4);
		expect(readNumber(' 12.5 ')).toBe(12.5);
		expect(readNumber(Number.NaN)).toBeNull();
		expect(readNumber(Infinity)).toBeNull();
		expect(readNumber('')).toBeNull();
		expect(readNumber('   ')).toBeNull();
		expect(readNumber('12 cars')).toBeNull();
		expect(readNumber(null)).toBeNull();
		expect(readNumber(true)).toBeNull();
	});

	it('reads trimmed, non-blank strings', () => {
		expect(readString('  north  ')).toBe('north');
		expect(readString('   ')).toBeNull();
		expect(readString(7)).toBeNull();
	});

	it('parses dates from strings, rejecting blanks and garbage', () => {
		expect(parseDate(at(21, 9))?.getTime()).toBe(local(21, 9).getTime());
		expect(parseDate('yesterday')).toBeNull();
		expect(parseDate('')).toBeNull();
		expect(parseDate(local(21, 9))).toBeNull();
	});
});

describe('dates', () => {
	it('builds local day and hour keys', () => {
		expect(toDayKey(local(1, 0))).toBe('2026-10-01');
		expect(toDayKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
		expect(toHourKey(local(21, 7, 45))).toBe('2026-10-21 07:00');
		expect(toHourKey(local(21, 23, 1))).toBe('2026-10-21 23:00');
	});

	it('shifts day keys across month and year ends', () => {
		expect(shiftDayKey('2026-10-21', -1)).toBe('2026-10-20');
		expect(shiftDayKey('2026-10-31', 1)).toBe('2026-11-01');
		expect(shiftDayKey('2027-01-01', -1)).toBe('2026-12-31');
	});

	it('floors to the hour and spans whole days and months', () => {
		expect(toHourStart(local(21, 9, 41))).toEqual(local(21, 9));
		expect(getDayBounds(local(21, 9, 41))).toEqual({
			start: local(21, 0),
			end: new Date(2026, 9, 21, 23, 59, 59, 999)
		});
		expect(getMonthBounds(2026, 1)).toEqual({
			start: new Date(2026, 1, 1),
			end: new Date(2026, 1, 28, 23, 59, 59, 999)
		});
		expect(getMonthBounds(2026, 11).end).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
	});
});

describe('formatting', () => {
	const HOUR_FORMAT: Intl.DateTimeFormatOptions = {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	};

	it('formats an hour from a timestamp or a date string, leaving garbage as is', () => {
		const expected = formatDateTime(local(21, 9), HOUR_FORMAT);
		expect(formatHour(local(21, 9).getTime())).toBe(expected);
		expect(formatHour(at(21, 9))).toBe(expected);
		expect(formatHour('later')).toBe('later');
	});

	it('formats a day with its year', () => {
		expect(formatDay(local(21, 9))).toBe(
			formatDate(local(21, 9), { month: 'short', day: 'numeric', year: 'numeric' })
		);
	});

	it('formats a measurement, with a placeholder when missing', () => {
		expect(formatMeasurement(2.345, 'mm', 1)).toBe('2.3 mm');
		expect(formatMeasurement(12.6, 'km/h')).toBe('13 km/h');
		expect(formatMeasurement(null, 'mm', 1)).toBe('-- mm');
	});

	it('formats traffic counts, treating anything unreadable as 0', () => {
		expect(formatTrafficValue(12345)).toBe(formatNumber(12345));
		expect(formatTrafficValue('7')).toBe(formatNumber(7));
		expect(formatTrafficValue(undefined)).toBe('0');
		expect(formatTrafficValue('n/a')).toBe('0');
	});
});

describe('traffic classes', () => {
	it('pins each class to a chart colour, cycling after eight', () => {
		expect(trafficClassColor(0)).toBe('var(--cw-chart-cat-1)');
		expect(trafficClassColor(6)).toBe('var(--cw-chart-cat-7)');
		expect(trafficClassColor(9)).toBe('var(--cw-chart-cat-2)');
	});

	it('picks an emoji by what the class counts', () => {
		expect(
			[
				'truck_count',
				'bus_count',
				'bike_lane',
				'bicycle_count',
				'pedestrians',
				'person_total',
				'people_count',
				'train_count',
				'car_count',
				'Vehicle_Total',
				'motorcycle_count',
				'misc'
			].map(metricEmoji)
		).toEqual(['🚚', '🚌', '🚲', '🚲', '🚶', '🚶', '🚶', '🚆', '🚗', '🚗', '🏍️', '🚦']);
	});

	it('translates the known classes and prettifies the rest', () => {
		expect(TRAFFIC_CLASS_KEYS.map(metricLabelText)).toEqual([
			m.traffic_metric_car_count(),
			m.traffic_metric_people_count(),
			m.traffic_metric_truck_count(),
			m.traffic_metric_bicycle_count(),
			m.traffic_metric_bus_count(),
			m.traffic_metric_motorcycle_count(),
			m.traffic_metric_train_count()
		]);
		expect(metricLabelText('north_bound_total')).toBe('North Bound Total');
		expect(metricLabel('car_count')).toBe(`🚗 ${m.traffic_metric_car_count()}`);
		expect(metricLabel('lane_2')).toBe('🚦 Lane 2');
	});
});

describe('normalizeTrafficRows', () => {
	it('keeps dated rows once, with an id and a device, oldest first', () => {
		const rows = [
			{ id: 2, created_at: ` ${at(21, 10)} `, car_count: 3 },
			{ data_id: 'd-1', created_at: at(21, 9), dev_eui: 'CAM-2' },
			{ created_at: at(21, 8) },
			{ id: 2, created_at: at(21, 10), car_count: 99 },
			{ id: 3, created_at: '   ' },
			{ id: 4, created_at: 'yesterday' },
			{ id: 5 },
			'not a row',
			null,
			[1, 2]
		];

		expect(normalizeTrafficRows(rows, 'CAM-1', { id: 'latest', created_at: at(21, 11) })).toEqual([
			{ id: `${at(21, 8)}-2`, created_at: at(21, 8), dev_eui: 'CAM-1' },
			{ data_id: 'd-1', id: 'd-1', created_at: at(21, 9), dev_eui: 'CAM-2' },
			{ id: '2', created_at: at(21, 10), car_count: 3, dev_eui: 'CAM-1' },
			{ id: 'latest', created_at: at(21, 11), dev_eui: 'CAM-1' }
		]);
	});

	it('ignores an extra row that is not a record, and tolerates a missing device id', () => {
		expect(
			normalizeTrafficRows([{ id: 1, created_at: at(21, 9) }], undefined as unknown as string, null)
		).toEqual([{ id: '1', created_at: at(21, 9), dev_eui: '' }]);
	});
});

describe('resolveTrafficClassKeys', () => {
	it('lists the known classes present, in their fixed order', () => {
		expect(
			resolveTrafficClassKeys([
				row({ people_count: 2, bus_count: null }),
				row({ car_count: '5', train_count: 'n/a' })
			])
		).toEqual(['car_count', 'people_count']);
	});

	it('discovers traffic-like numeric columns of an unknown schema', () => {
		expect(
			resolveTrafficClassKeys([
				row({
					traffic_hour: at(21, 9),
					line_number: 2,
					temperature: 21,
					weather_code: 3,
					north_count: 4,
					lane_2: 1,
					misc_value: 7,
					label: 'gate'
				})
			])
		).toEqual(['lane_2', 'north_count']);
	});

	it('falls back to every numeric column when none looks like traffic', () => {
		expect(resolveTrafficClassKeys([row({ zeta: 1, alpha: '2', note: 'x' })])).toEqual([
			'alpha',
			'zeta'
		]);
		expect(resolveTrafficClassKeys([])).toEqual([]);
	});
});

describe('bucketing', () => {
	const KEYS = ['car_count', 'people_count'];
	// Hourly accumulator rows: two lines share 09:00, one row has no traffic_hour.
	const ROWS = [
		row({ id: 'c', created_at: at(21, 10, 30), car_count: 1, people_count: 4 }),
		row({
			id: 'a',
			traffic_hour: at(21, 9),
			created_at: at(21, 9, 5),
			car_count: 2,
			people_count: 1
		}),
		row({ id: 'b', traffic_hour: at(21, 9), created_at: at(21, 9, 6), car_count: '3' }),
		row({ id: 'x', created_at: 'garbage' })
	];

	it('sums a row over its classes, or counts it once without classes', () => {
		expect(sumTrafficValues(row({ car_count: 2, people_count: '3' }), KEYS)).toBe(5);
		expect(sumTrafficValues(row({ car_count: 2 }), KEYS)).toBe(2);
		expect(sumTrafficValues(row({ car_count: 2 }), [])).toBe(1);
	});

	it('buckets a row by its traffic hour, else by its creation hour', () => {
		expect(rowHourStart(row({ traffic_hour: at(21, 9), created_at: at(21, 11, 5) }))).toEqual(
			local(21, 9)
		);
		expect(rowHourStart(row({ created_at: at(21, 11, 5) }))).toEqual(local(21, 11));
		expect(rowHourStart(row({ created_at: 'garbage' }))).toBeNull();
	});

	it('builds one hourly row per hour, summing the lines that share it', () => {
		expect(buildHourlyTrafficRows(ROWS, KEYS)).toEqual([
			{
				id: '2026-10-21 09:00',
				traffic_hour: at(21, 9),
				day_key: '2026-10-21',
				hour_timestamp: local(21, 9).getTime(),
				total_traffic: 6,
				samples: 2,
				car_count: 5,
				people_count: 1
			},
			{
				id: '2026-10-21 10:00',
				traffic_hour: at(21, 10),
				day_key: '2026-10-21',
				hour_timestamp: local(21, 10).getTime(),
				total_traffic: 5,
				samples: 1,
				car_count: 1,
				people_count: 4
			}
		]);
		// Without classes each row counts once.
		expect(buildHourlyTrafficRows(ROWS, []).map((hour) => hour.total_traffic)).toEqual([2, 1]);
	});

	it('summarises each day', () => {
		const rows = [
			row({ id: 'n', created_at: at(22, 8, 15), car_count: 7 }),
			...ROWS,
			row({ id: 'd', created_at: at(21, 10, 45), people_count: 1 })
		];

		expect(buildDailyTrafficSummaries(rows, KEYS)).toEqual([
			{
				dayKey: '2026-10-21',
				date: local(21, 10),
				totalTraffic: 12,
				hourCount: 2,
				sampleCount: 4,
				classTotals: { car_count: 6, people_count: 6 }
			},
			{
				dayKey: '2026-10-22',
				date: local(22, 8),
				totalTraffic: 7,
				hourCount: 1,
				sampleCount: 1,
				classTotals: { car_count: 7, people_count: 0 }
			}
		]);
		expect(buildDailyTrafficSummaries([], KEYS)).toEqual([]);
	});
});

describe('computeTrafficKpis', () => {
	const KEYS = ['car_count', 'people_count', 'bus_count'];
	const hourly = buildHourlyTrafficRows(
		[
			row({ created_at: at(21, 8, 10), car_count: 1, people_count: 1 }),
			row({ created_at: at(21, 9, 10), car_count: 6, people_count: 2 }),
			row({ created_at: at(21, 10, 10), car_count: 3, people_count: 6 })
		],
		KEYS
	);

	it("totals today's traffic and finds the current, peak and busiest class", () => {
		const kpis = computeTrafficKpis(hourly, KEYS, local(21, 10, 30));

		expect(kpis).toEqual({
			todayTotal: 19,
			trackedHours: 3,
			sampleCount: 3,
			currentHourRow: hourly[2],
			isCurrentHour: true,
			peakHourRow: hourly[2],
			topClassKey: 'car_count',
			classTotals: { car_count: 10, people_count: 9, bus_count: 0 }
		});
	});

	it('falls back to the latest hour when the current one has no data yet', () => {
		const kpis = computeTrafficKpis(hourly, KEYS, local(21, 13));

		expect(kpis.currentHourRow).toBe(hourly[2]);
		expect(kpis.isCurrentHour).toBe(false);
	});

	it('keeps the first of equal peaks, and names no class when nothing was counted', () => {
		const flat = buildHourlyTrafficRows(
			[row({ created_at: at(21, 8), bus_count: 0 }), row({ created_at: at(21, 9), bus_count: 0 })],
			['bus_count']
		);
		const kpis = computeTrafficKpis(flat, ['bus_count'], local(21, 9));

		expect(kpis.peakHourRow).toBe(flat[0]);
		expect(kpis.topClassKey).toBeNull();
		expect(kpis.classTotals).toEqual({ bus_count: 0 });
	});

	it('counts a class that the hourly rows do not carry as 0', () => {
		const kpis = computeTrafficKpis(hourly, [...KEYS, 'truck_count'], local(21, 10));

		expect(kpis.classTotals.truck_count).toBe(0);
		expect(kpis.topClassKey).toBe('car_count');
	});

	it('reports an empty day', () => {
		expect(computeTrafficKpis([], [], local(21, 9))).toEqual({
			todayTotal: 0,
			trackedHours: 0,
			sampleCount: 0,
			currentHourRow: null,
			isCurrentHour: false,
			peakHourRow: null,
			topClassKey: null,
			classTotals: {}
		});
	});
});
