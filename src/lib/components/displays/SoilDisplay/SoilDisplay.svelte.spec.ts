import { formatCwNumber } from '@cropwatchdevelopment/cwui';
import { afterEach, describe, expect, it } from 'vitest';
import type { PreferencesDto } from '$lib/api/api.dtos';
import { getIntlLocale } from '$lib/i18n/format';
import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import { labelFor } from '$lib/sensor-labels';
import { convertSensorValue, formatSensorMeasurement, resolveDisplayUnit } from '$lib/units';
import SoilDisplay from './SoilDisplay.svelte';

const FAHRENHEIT = { temperature_unit: 'fahrenheit' } as PreferencesDto;

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
	preferences?: PreferencesDto
) {
	view = renderWithServices(SoilDisplay, {
		props: 'devEui' in overrides ? (overrides as DeviceDisplayProps) : displayProps(overrides),
		app: { accessToken: 'jwt-token', preferences }
	});
	return view.target;
}

const statCard = (target: HTMLElement, title: string) =>
	[...target.querySelectorAll('.cw-stat-card')].find(
		(card) => card.querySelector('.cw-stat-card__title')?.textContent === title
	);
const heroValue = (value: number, unit: string) =>
	`${formatCwNumber(value, { maximumFractionDigits: 2, locale: getIntlLocale() })}${unit}`;
const tableRows = (target: HTMLElement) =>
	[...target.querySelectorAll('.cw-data-table tbody tr')].map((tr) =>
		[...tr.querySelectorAll('td')].map((td) => td.textContent?.trim())
	);

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('SoilDisplay', () => {
	it('summarises temperature and moisture over the range from the newest reading, in the display unit', () => {
		const target = render({}, FAHRENHEIT);
		const temperature = statCard(target, m.display_soil_temperature());
		const moisture = statCard(target, m.rule_subject_soil_moisture());

		// The history is newest-first: its first reading is the latest, here above the average.
		expect(temperature?.querySelector('.cw-stat-card__hero-value')?.textContent).toBe(
			heroValue(convertSensorValue('temperature_c', 18.5, FAHRENHEIT), '°F')
		);
		expect(temperature?.querySelector('.cw-stat-card__comparison--above')).not.toBeNull();
		expect(moisture?.querySelector('.cw-stat-card__hero-value')?.textContent).toBe(
			heroValue(31.2, '%')
		);
		// The older moisture is unreadable and not counted (it used to count as 0),
		// so the only reading is also the average.
		expect(moisture?.querySelector('.cw-stat-card__comparison--above')).toBeNull();
	});

	it('leaves a missing or unreadable reading out of the stats instead of counting it as 0', () => {
		const target = render({
			historicalData: [
				{ created_at: '2026-10-21T03:00:00.000Z', temperature_c: null, moisture: 'n/a' },
				{ created_at: '2026-10-21T02:00:00.000Z', temperature_c: 17, moisture: 30 }
			]
		});

		// The newest reading carried neither value: the latest stat is the one before.
		expect(
			statCard(target, m.rule_subject_soil_moisture())?.querySelector('.cw-stat-card__hero-value')
				?.textContent
		).toBe(heroValue(30, '%'));
		expect(
			statCard(target, m.display_soil_temperature())?.querySelector('.cw-stat-card__hero-value')
				?.textContent
		).toBe(heroValue(17, '°C'));
	});

	it('shows the latest EC and pH', () => {
		const target = render();
		const ec = formatSensorMeasurement('ec', 1.234, undefined, { maximumFractionDigits: 2 });
		const ph = formatSensorMeasurement('ph', 6.8, undefined, { maximumFractionDigits: 1 });

		expect([...target.querySelectorAll('.kpi-value')].map((value) => value.textContent)).toEqual([
			`${ec.valueDisplay}${ec.unit}`,
			ph.valueDisplay
		]);
		expect(target.textContent).toContain(m.rule_subject_ph());
		expect(target.textContent).toContain(m.display_latest_reading());
	});

	it('hides the pH tile for a probe without pH, and dashes a missing EC', () => {
		const ec = formatSensorMeasurement('ec', null, undefined, { maximumFractionDigits: 2 });

		for (const latestData of [{ temperature_c: 18 }, null]) {
			const target = render({ latestData, historicalData: [{ temperature_c: 18 }] });
			expect([...target.querySelectorAll('.kpi-value')].map((value) => value.textContent)).toEqual([
				`${ec.valueDisplay}${ec.unit}`
			]);
			expect(target.textContent).not.toContain(m.rule_subject_ph());
			view?.unmount();
			view = null;
		}
	});

	it('takes a value the latest row lacks from the newest reading that has it', () => {
		const target = render({ latestData: { created_at: '2026-10-21T04:00:00.000Z', moisture: 30 } });
		const ec = formatSensorMeasurement('ec', 1.234, undefined, { maximumFractionDigits: 2 });

		expect(target.querySelector('.kpi-value')?.textContent).toBe(`${ec.valueDisplay}${ec.unit}`);
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

	it('shows the combined-sensor charts as awaiting data', () => {
		const target = render();
		const overlays = [...target.querySelectorAll('.cw-no-data-overlay')];

		expect(target.textContent).toContain(m.display_air_quality());
		expect(overlays).toHaveLength(4);
		for (const overlay of overlays) {
			expect(overlay.textContent).toContain(m.display_awaiting_sensor_data());
		}
	});

	it('lists the readings in a searchable table', async () => {
		const target = render({}, FAHRENHEIT);

		await expect.poll(() => target.querySelectorAll('.cw-data-table tbody tr').length).toBe(2);
		expect(target.textContent).toContain(m.display_soil_telemetry());
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
});
