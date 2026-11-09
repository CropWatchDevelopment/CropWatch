import { cwDliCardText, formatCwNumber } from '@cropwatchdevelopment/cwui';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
	AiRecommendationDto,
	CropTargetDto,
	CropTypeDetailDto,
	PreferencesDto
} from '$lib/api/api.dtos';
import { cropDisplayName } from '$lib/agronomy/crop-targets';
import { dayLightProfile, lightShareSoFar, ppfdTargetForHour } from '$lib/agronomy/light-targets';
import { formatNumber, getIntlLocale } from '$lib/i18n/format';
import { createMockServices } from '$lib/testing/mock-services';
import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import { labelFor } from '$lib/sensor-labels';
import { convertSensorValue, formatSensorMeasurement, resolveDisplayUnit } from '$lib/units';
import SoilDisplay from './SoilDisplay.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto }));

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
		target('soil_moisture', 'all', [12, 19, 24, 35]),
		target('soil_temperature', 'all', [13, 15, 20, 30]),
		target('air_temperature', 'day', [8, 20, 25, 35]),
		target('air_temperature', 'night', [8, 10, 15, 22]),
		target('air_humidity', 'day', [null, 60, 80, null]),
		target('vpd', 'day', [0.2, 0.5, 1.0, 1.6]),
		target('dli', 'all', [null, 20, 30, null]),
		target('ppfd', 'day', [null, 463, 1300, null])
	]
};
const tomatoName = () => cropDisplayName(TOMATO, getIntlLocale());

/** Newest first, as the device page passes it. */
const HISTORY = [
	{
		id: 2,
		created_at: '2026-10-21T03:00:00.000Z',
		temperature_c: 18.5,
		moisture: 31.2,
		ec: 1.234,
		ph: 6.8
	},
	{ created_at: '2026-10-21T02:00:00.000Z', temperature_c: 17, moisture: 'n/a', ec: 1.1 }
];

function displayProps(overrides: Partial<DeviceDisplayProps> = {}): DeviceDisplayProps {
	return {
		devEui: 'SOIL-001',
		locationId: '8',
		locationName: 'North field',
		latestData: HISTORY[0],
		historicalData: HISTORY,
		loading: false,
		permissionLevel: 1,
		...overrides
	};
}

let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	overrides: Partial<DeviceDisplayProps> | DeviceDisplayProps = {},
	preferences?: PreferencesDto,
	services = createMockServices()
) {
	view = renderWithServices(SoilDisplay, {
		props: 'devEui' in overrides ? (overrides as DeviceDisplayProps) : displayProps(overrides),
		app: { accessToken: 'jwt-token', preferences },
		services
	});
	return view.target;
}

/** A reading of the above / below ground panel, as shown. */
function panelReading(target: HTMLElement, label: string) {
	const cell = [...target.querySelectorAll('.cw-ab__metric')].find(
		(item) => item.querySelector('.cw-ab__metric-label')?.textContent === label
	);
	if (!cell) return null;
	const text = (selector: string) => cell.querySelector(selector)?.textContent?.trim() ?? null;
	return {
		now: text('.cw-ab__metric-number'),
		unit: text('.cw-ab__metric-unit'),
		/** Low, average and high. */
		stats: [...cell.querySelectorAll('.cw-ab__stats dd')].map((dd) => dd.textContent?.trim()),
		status: text('.cw-ab__metric-status'),
		target: text('.cw-ab__target')
	};
}
const panelLabels = (target: HTMLElement) =>
	[...target.querySelectorAll('.cw-ab__metric-label')].map((label) => label.textContent);
const fixed = (value: number, decimals: number) =>
	formatCwNumber(value, { decimals, locale: getIntlLocale() });
const tableRows = (target: HTMLElement) =>
	[...target.querySelectorAll('.cw-data-table tbody tr')].map((tr) =>
		[...tr.querySelectorAll('td')].map((td) => td.textContent?.trim())
	);

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
	vi.useRealTimers();
});

/** A light board's readings at a fixed local time (the clock is set to it). */
function lightBoardAt(when: Date) {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(when);
	const reading = {
		id: 2,
		created_at: when.toISOString(),
		temperature_c: 21,
		moisture: 22,
		ec: 0.4,
		air_temperature_c: 18,
		air_humidity: 70,
		co2: 800,
		ppfd: 600
	};
	const earlier = {
		...reading,
		id: 1,
		created_at: new Date(when.getTime() - 15 * 60_000).toISOString()
	};
	return { latestData: reading, historicalData: [reading, earlier] };
}
const cardText = (target: HTMLElement, selector: string) =>
	target.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

describe('SoilDisplay', () => {
	it('summarises each soil reading over the range from the newest one, in the display unit', () => {
		const target = render({}, FAHRENHEIT);
		const toF = (value: number) => convertSensorValue('temperature_c', value, FAHRENHEIT);

		// The history is newest-first: its first reading is the latest.
		expect(panelReading(target, m.display_soil_temperature())).toMatchObject({
			now: fixed(toF(18.5), 1),
			unit: resolveDisplayUnit('temperature_c', FAHRENHEIT),
			stats: [fixed(toF(17), 1), fixed(toF(17.75), 1), fixed(toF(18.5), 1)]
		});
		// The older moisture is unreadable and not counted (it used to count as 0),
		// so the only reading is also the low, the average and the high.
		expect(panelReading(target, m.rule_subject_soil_moisture())?.stats).toEqual([
			fixed(31.2, 1),
			fixed(31.2, 1),
			fixed(31.2, 1)
		]);
		// No air readings from this probe: no air layer.
		expect(target.querySelector('.cw-ab__layer--air')).toBeNull();
	});

	it('leaves a missing or unreadable reading out of the figures instead of counting it as 0', () => {
		const target = render({
			latestData: null,
			historicalData: [
				{ created_at: '2026-10-21T03:00:00.000Z', temperature_c: null, moisture: 'n/a' },
				{ created_at: '2026-10-21T02:00:00.000Z', temperature_c: 17, moisture: 30 }
			]
		});

		// The newest reading carried neither value: "now" is the one before.
		expect(panelReading(target, m.rule_subject_soil_moisture())?.now).toBe(fixed(30, 1));
		expect(panelReading(target, m.display_soil_temperature())?.now).toBe(fixed(17, 1));
	});

	it('shows EC and pH with their low, average and high', () => {
		const target = render();

		expect(panelReading(target, m.sensor_ec())).toMatchObject({
			now: fixed(1.234, 2),
			unit: resolveDisplayUnit('ec'),
			stats: [fixed(1.1, 2), fixed(1.167, 2), fixed(1.234, 2)]
		});
		expect(panelReading(target, m.rule_subject_ph())?.now).toBe(fixed(6.8, 1));
	});

	it('leaves out the readings a probe does not report, such as pH', () => {
		for (const latestData of [{ temperature_c: 18 }, null]) {
			const target = render({ latestData, historicalData: [{ temperature_c: 18 }] });
			expect(panelLabels(target)).toEqual([m.display_soil_temperature()]);
			view?.unmount();
			view = null;
		}
	});

	it('takes a value the latest row lacks from the newest reading that has it', () => {
		const target = render({ latestData: { created_at: '2026-10-21T04:00:00.000Z', moisture: 30 } });

		expect(panelReading(target, m.sensor_ec())?.now).toBe(fixed(1.234, 2));
		expect(panelReading(target, m.rule_subject_soil_moisture())?.now).toBe(fixed(30, 1));
	});

	it("judges each reading against the crop's targets and shows the light strip", () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(new Date(2026, 9, 21, 12, 0));
		const target = render({
			crop: TOMATO,
			latestData: null,
			historicalData: [
				{
					created_at: new Date(2026, 9, 21, 11, 45).toISOString(),
					temperature_c: 22,
					moisture: 20,
					air_temperature_c: 23,
					air_humidity: 55,
					ppfd: 600
				}
			]
		});

		expect(panelReading(target, m.sensor_air_temperature())).toMatchObject({
			status: m.soil_target_status_optimal(),
			target: m.cwui_above_below_target({
				range: `20–25${resolveDisplayUnit('air_temperature_c')}`
			})
		});
		expect(panelReading(target, m.sensor_air_humidity())?.status).toBe(m.soil_target_status_low());
		expect(panelReading(target, m.display_soil_temperature())?.status).toBe(
			m.soil_target_status_high()
		);
		expect(target.querySelector('.cw-ab__light')?.textContent).toContain(
			m.cwui_above_below_dli_goal_crop({ crop: tomatoName() })
		);
		expect(cardText(target, '.cw-ab__legend')).toContain(
			m.cwui_above_below_legend_target_crop({ crop: tomatoName() })
		);
	});

	it("shows in the DLI card what today's light still needs, with a crop", () => {
		const target = render({ ...lightBoardAt(new Date(2026, 10, 7, 15, 20)), crop: TOMATO });
		const dliCard = cardText(target, '.cw-dli-card');
		// The card brings its own text, in the page's language.
		const text = cwDliCardText(getIntlLocale());

		expect(dliCard).toContain(text.outlookNeeded);
		expect(dliCard).toContain(text.outlookBehind);
		// The location has no coordinates: the end of the day is assumed, which a
		// CwTooltip on the light line says.
		expect(
			target.querySelector('.cw-dli-card__outlook-line [role="tooltip"]')?.textContent?.trim()
		).toBe(text.outlookAssumedHint);
		// No separate card any more.
		expect(target.querySelectorAll('.cw-dli-card')).toHaveLength(1);
		view?.unmount();
		view = null;

		const withoutCrop = render(lightBoardAt(new Date(2026, 10, 7, 15, 20)));
		expect(cardText(withoutCrop, '.cw-dli-card')).not.toContain(text.outlookNeeded);
	});

	it('lists a reading the probe sent only partly with dashes for the rest', async () => {
		const target = render({ historicalData: [{ moisture: 12 }] });

		await expect.poll(() => tableRows(target).length).toBe(1);
		expect(tableRows(target)).toEqual([
			[
				new Date('').toLocaleString(),
				formatSensorMeasurement('temperature_c', null).display,
				formatSensorMeasurement('moisture', 12).display,
				formatSensorMeasurement('ec', null).display
			]
		]);
		expect(formatSensorMeasurement('temperature_c', null).display).not.toContain('0');
	});

	it('shows the VPD and light charts as awaiting data, with no separate air chart', () => {
		const target = render();
		const overlays = [...target.querySelectorAll('.cw-no-data-overlay')];

		// The air readings over time are in the device page's main chart.
		expect(target.textContent).not.toContain(m.display_air_quality());
		expect(overlays).toHaveLength(3);
		for (const overlay of overlays) {
			expect(overlay.textContent).toContain(m.display_awaiting_sensor_data());
		}
	});

	it('shows the AI growing advice directly above the history table', async () => {
		const report: AiRecommendationDto = {
			id: 3,
			dev_eui: 'DEV-1',
			report_type: 'daily',
			period_start: '2026-11-08',
			period_end: '2026-11-08',
			timezone: 'Asia/Tokyo',
			status: 'action',
			max_severity: 3,
			headline_ja: '夜間の保温が必要です',
			body_ja: '夜間の気温が目標より低めです。',
			headline_en: 'Keep the nights warmer',
			body_en: 'Night-time air temperature is below target.',
			findings: [],
			details: [],
			text_source: 'llm',
			created_at: '2026-11-08T16:32:49.779Z',
			updated_at: '2026-11-08T16:32:49.779Z'
		};
		const target = render({ aiReport: report });

		await expect.poll(() => target.querySelectorAll('.cw-data-table tbody tr').length).toBe(2);
		const advice = target.querySelector('.ai-report');
		expect(advice?.textContent).toContain(report.headline_ja);
		const below = advice?.nextElementSibling;
		expect(below?.querySelector('.cw-data-table')).not.toBeNull();
		expect(below?.textContent).toContain(m.display_history());
	});

	it('shows no AI card without a report', async () => {
		const target = render();
		await expect.poll(() => target.querySelectorAll('.cw-data-table tbody tr').length).toBe(2);
		expect(target.querySelector('.ai-report')).toBeNull();
	});

	it('lists the readings in a searchable table', async () => {
		const target = render({}, FAHRENHEIT);

		await expect.poll(() => target.querySelectorAll('.cw-data-table tbody tr').length).toBe(2);
		expect(target.textContent).toContain(m.display_history());
		expect(target.textContent).toContain(m.display_searchable_sortable());
		expect(
			[...target.querySelectorAll('.cw-data-table th')].map((th) => th.textContent?.trim())
		).toEqual([
			m.display_timestamp(),
			m.display_soil_temperature(),
			m.rule_subject_soil_moisture(),
			`EC (${resolveDisplayUnit('ec', FAHRENHEIT)})`
		]);
		// Newest first, like the history.
		expect(tableRows(target)).toEqual([
			[
				new Date('2026-10-21T03:00:00.000Z').toLocaleString(),
				formatSensorMeasurement('temperature_c', 18.5, FAHRENHEIT).display,
				formatSensorMeasurement('moisture', 31.2, FAHRENHEIT).display,
				formatSensorMeasurement('ec', 1.234, FAHRENHEIT, { maximumFractionDigits: 2 }).display
			],
			[
				new Date('2026-10-21T02:00:00.000Z').toLocaleString(),
				formatSensorMeasurement('temperature_c', 17, FAHRENHEIT).display,
				formatSensorMeasurement('moisture', null, FAHRENHEIT).display,
				formatSensorMeasurement('ec', 1.1, FAHRENHEIT, { maximumFractionDigits: 2 }).display
			]
		]);

		const search = target.querySelector<HTMLInputElement>('.cw-data-table__search-wrapper input')!;
		search.value = '6.8';
		search.dispatchEvent(new Event('input', { bubbles: true }));
		await expect.poll(() => target.querySelectorAll('.cw-data-table tbody tr').length).toBe(1);
		expect(tableRows(target)[0][0]).toBe(new Date('2026-10-21T03:00:00.000Z').toLocaleString());
	});

	it('fills the air quality, VPD, PPFD and DLI panels and their columns for a board that reports them', async () => {
		// Two wakes; the newest lost its CO₂ frame. Timestamps are "now" so the DLI counts them as today.
		const now = Date.now();
		const board = [
			{
				id: 2,
				created_at: new Date(now).toISOString(),
				temperature_c: 21.35,
				moisture: 47.5,
				ec: 0.22,
				ppfd: 614
			},
			{
				id: 1,
				created_at: new Date(now - 60_000).toISOString(),
				temperature_c: 20.64,
				moisture: 47.9,
				ec: 0.23,
				air_temperature_c: '25.32',
				air_humidity: '63',
				co2: 463,
				ppfd: 590
			}
		];
		const target = render({ latestData: board[0], historicalData: board });

		expect(target.querySelectorAll('.cw-no-data-overlay')).toHaveLength(0);
		expect(target.textContent).toContain(
			formatCwNumber(614, { maximumFractionDigits: 0, locale: getIntlLocale() })
		);

		await expect.poll(() => tableRows(target).length).toBe(2);
		expect(
			[...target.querySelectorAll('.cw-data-table th')].map((th) => th.textContent?.trim())
		).toEqual([
			m.display_timestamp(),
			m.display_soil_temperature(),
			m.rule_subject_soil_moisture(),
			`EC (${resolveDisplayUnit('ec')})`,
			labelFor('co2').label(),
			labelFor('air_temperature_c').label(),
			labelFor('air_humidity').label(),
			labelFor('ppfd').label()
		]);
		expect(tableRows(target)[0].slice(4)).toEqual([
			formatSensorMeasurement('co2', null).display,
			formatSensorMeasurement('air_temperature_c', null).display,
			formatSensorMeasurement('air_humidity', null).display,
			formatSensorMeasurement('ppfd', 614).display
		]);
		expect(tableRows(target)[1].slice(4)).toEqual([
			formatSensorMeasurement('co2', 463).display,
			formatSensorMeasurement('air_temperature_c', 25.32).display,
			formatSensorMeasurement('air_humidity', 63).display,
			formatSensorMeasurement('ppfd', 590).display
		]);
	});

	it('reloads the table when a new range arrives', async () => {
		const props = $state(displayProps());
		const target = render(props);
		await expect.poll(() => target.querySelectorAll('.cw-data-table tbody tr').length).toBe(2);

		props.historicalData = [
			{ id: 9, created_at: '2026-10-22T03:00:00.000Z', temperature_c: 12, moisture: 20, ec: 0.5 }
		];

		await expect
			.poll(() => tableRows(target).map((row) => row[0]))
			.toEqual([new Date('2026-10-22T03:00:00.000Z').toLocaleString()]);
	});

	it('says when the selected range has no data, and stays quiet while loading', () => {
		let target = render({ historicalData: [] });
		expect(target.textContent).toContain(m.display_no_data());
		expect(target.textContent).toContain(m.display_no_soil_data_selected_range());
		view?.unmount();

		target = render({ loading: true });
		expect(target.querySelector('.cw-data-table')).toBeNull();
		expect(target.textContent).not.toContain(m.display_no_soil_data_selected_range());
	});

	describe('with a crop', () => {
		it("judges the readings against the crop's day targets", () => {
			const target = render({ ...lightBoardAt(new Date(2026, 10, 7, 10, 30)), crop: TOMATO });

			const card = [...target.querySelectorAll('.cw-card')].find((element) =>
				element.textContent?.includes(m.soil_crop_targets_title({ crop: tomatoName() }))
			) as HTMLElement;
			expect(card.textContent).toContain(m.soil_crop_targets_day_fallback());
			const rows = [...card.querySelectorAll('tbody tr')].map((row) => [
				row.querySelector('th')?.textContent?.trim(),
				row.querySelector('td:last-child')?.textContent?.trim()
			]);
			expect(rows).toEqual([
				[m.rule_subject_soil_moisture(), m.soil_target_status_optimal()],
				// 21 °C against 15–20 is 5 % over; 18 °C against 20–25 is 10 % under.
				[m.display_soil_temperature(), m.soil_target_level_slightly_high()],
				[m.sensor_ec(), '—'],
				[m.sensor_air_temperature(), m.soil_target_level_slightly_low()],
				[m.sensor_air_humidity(), m.soil_target_status_optimal()],
				['VPD', m.soil_target_status_optimal()],
				[m.sensor_co2(), '—']
			]);
		});

		it('switches to the night targets after dark, and only shows the daytime ones', () => {
			const target = render({ ...lightBoardAt(new Date(2026, 10, 7, 21, 0)), crop: TOMATO });

			expect(target.textContent).toContain(m.soil_crop_targets_night_fallback());
			const airRow = [...target.querySelectorAll('.crop-targets tbody tr')].find(
				(row) => row.querySelector('th')?.textContent?.trim() === m.sensor_air_temperature()
			);
			expect(airRow?.textContent).toContain(m.soil_target_level_high()); // 18 against 15: 20 %
			expect(target.querySelector('.crop-targets')?.textContent).toContain(
				m.soil_crop_targets_daytime_only()
			);
		});

		it('says the targets follow the sun when the location has a position', () => {
			const target = render({
				...lightBoardAt(new Date(2026, 10, 7, 12, 0)),
				crop: TOMATO,
				coordinates: { lat: 35.68, long: 139.69 }
			});
			const note =
				target.textContent?.includes(m.soil_crop_targets_day()) ||
				target.textContent?.includes(m.soil_crop_targets_night());
			expect(note).toBe(true);
		});

		it("sets the PPFD target to what this hour needs for the crop's daily light goal", () => {
			const when = new Date(2026, 10, 7, 10, 30);
			const target = render({ ...lightBoardAt(when), crop: TOMATO });

			const hour = ppfdTargetForHour(when, { min: 20, max: 30 }, dayLightProfile(when, null));
			const ppfd = new Intl.NumberFormat(getIntlLocale(), { maximumFractionDigits: 0 });
			const clock = new Intl.DateTimeFormat(getIntlLocale(), {
				hour: '2-digit',
				minute: '2-digit'
			});
			const chart = cardText(target, '.cw-ppfd-chart');
			expect(chart).toContain(m.cwui_ppfd_heading_plant({ plant: tomatoName() }));
			expect(chart).toContain(
				m.soil_ppfd_target_hour({
					from: clock.format(new Date(2026, 10, 7, 10)),
					to: clock.format(new Date(2026, 10, 7, 11))
				})
			);
			expect(chart).toContain(`${ppfd.format(hour?.min ?? 0)}–${ppfd.format(hour?.max ?? 0)}`);
			expect(target.querySelector('.cw-ppfd-chart__zone--optimal')).not.toBeNull();
		});

		it('has no PPFD target at night', () => {
			const target = render({ ...lightBoardAt(new Date(2026, 10, 7, 21, 0)), crop: TOMATO });

			expect(cardText(target, '.cw-ppfd-chart')).toContain(m.soil_ppfd_target_night());
			expect(target.querySelector('.cw-ppfd-chart__zone--optimal')).toBeNull();
		});

		it("tops an open-ended light goal out at the crop's light saturation", () => {
			const when = new Date(2026, 10, 7, 10, 30);
			const openGoal = {
				...TOMATO,
				targets: TOMATO.targets.map((row) =>
					row.metric === 'dli' ? { ...row, optimal_max: null } : row
				)
			};
			const target = render({ ...lightBoardAt(when), crop: openGoal });

			const hour = ppfdTargetForHour(when, { min: 20, max: null }, dayLightProfile(when, null));
			const ppfd = new Intl.NumberFormat(getIntlLocale(), { maximumFractionDigits: 0 });
			expect(cardText(target, '.cw-ppfd-chart')).toContain(
				`${ppfd.format(hour?.min ?? 0)}–${ppfd.format(1300)}`
			);
		});

		it("gives the DLI card the crop's goal, what should have fallen by now, and the week's history", async () => {
			const when = new Date(2026, 10, 7, 10, 30);
			const services = createMockServices();
			const yesterday = (hours: number) => new Date(2026, 10, 6, hours).toISOString();
			services.telemetry.getDeviceDataWithinRange.mockResolvedValue([
				{ created_at: yesterday(11), ppfd: 500 },
				{ created_at: yesterday(10), ppfd: 500 }
			] as never);
			const target = render({ ...lightBoardAt(when), crop: TOMATO }, undefined, services);

			const share = lightShareSoFar(when, dayLightProfile(when, null));
			const expected = [20, 30]
				.map((bound) => formatNumber(bound * share, { maximumFractionDigits: 1 }))
				.join('–');
			expect(cardText(target, '.cw-dli-card__target')).toContain(expected);
			expect(cardText(target, '.cw-dli-card__target')).toContain(tomatoName());
			// Still collecting light: no verdict on today's total yet.
			expect(target.querySelector('.cw-dli-card__status')).toBeNull();
			await expect.poll(() => target.querySelectorAll('.cw-dli-card__history-item').length).toBe(1);
		});

		it("judges today's DLI once the day's light is over", () => {
			const target = render({ ...lightBoardAt(new Date(2026, 10, 7, 21, 0)), crop: TOMATO });

			expect(target.querySelector('.cw-dli-card__status')).not.toBeNull();
			expect(cardText(target, '.cw-dli-card__target')).not.toContain('·');
		});

		it("outlines the crop's VPD band", () => {
			const target = render({ ...lightBoardAt(new Date(2026, 10, 7, 10, 30)), crop: TOMATO });

			expect(target.querySelectorAll('.cw-vpd-chart__cell--target').length).toBeGreaterThan(0);
		});
	});

	describe('without a crop', () => {
		it('asks for one, with a way to the settings for a manager', () => {
			const target = render({ permissionLevel: 2 });

			expect(target.textContent).toContain(m.soil_crop_not_set());
			const button = [...target.querySelectorAll('button')].find(
				(element) => element.textContent?.trim() === m.soil_crop_not_set_action()
			);
			button?.click();
			expect(goto).toHaveBeenCalledWith('/locations/8/devices/SOIL-001/settings');
		});

		it('offers no settings link to a user who cannot change them, and stays quiet while loading', () => {
			const target = render({ permissionLevel: 3 });
			expect(target.textContent).toContain(m.soil_crop_not_set());
			expect(
				[...target.querySelectorAll('button')].some(
					(element) => element.textContent?.trim() === m.soil_crop_not_set_action()
				)
			).toBe(false);
			view?.unmount();

			const loading = render({ loading: true });
			expect(loading.textContent).not.toContain(m.soil_crop_not_set());
		});

		it('shows the light panels without targets', () => {
			const target = render(lightBoardAt(new Date(2026, 10, 7, 10, 30)));

			expect(cardText(target, '.cw-ppfd-chart')).not.toContain(m.soil_ppfd_target_night());
			expect(target.querySelector('.cw-ppfd-chart__zone--optimal')).toBeNull();
			expect(target.querySelectorAll('.cw-vpd-chart__cell--target')).toHaveLength(0);
		});
	});
});
