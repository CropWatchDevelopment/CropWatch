import { formatCwNumber } from '@cropwatchdevelopment/cwui';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { PreferencesDto } from '$lib/api/api.dtos';
import { getIntlLocale } from '$lib/i18n/format';
import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
import { m } from '$lib/paraglide/messages.js';
import { createFakeFetch, jsonResponse } from '$lib/testing/http';
import { renderWithServices } from '$lib/testing/render';
import { convertSensorValue, formatSensorMeasurement, resolveDisplayUnit } from '$lib/units';
import { computeDewPoint } from '$lib/utils/dewPoint';
import AirDisplay from './AirDisplay.svelte';

const { forms } = vi.hoisted(() => ({
	forms: { applyAction: vi.fn(), deserialize: vi.fn((text: string) => JSON.parse(text)) }
}));
// The row's note dialog posts to the device page's own action.
vi.mock('$app/forms', () => ({ applyAction: forms.applyAction, deserialize: forms.deserialize }));

const FAHRENHEIT = { temperature_unit: 'fahrenheit' } as PreferencesDto;
const NEWEST = '2026-10-21T03:00:00.000Z';
const MIDDLE = '2026-10-21T02:00:00.000Z';
const OLDEST = '2026-10-21T01:00:00.000Z';

/**
 * Newest first, as the device page passes it. CO₂ comes on only some uplinks;
 * the middle reading triggered a rule and carries a note.
 */
const HISTORY: Record<string, unknown>[] = [
	{ id: 3, dev_eui: 'AIR-001', created_at: NEWEST, temperature_c: 22.5, humidity: 60, co2: 0 },
	{
		id: 2,
		dev_eui: 'AIR-001',
		created_at: MIDDLE,
		temperature_c: 21,
		humidity: 58,
		co2: 640,
		alerts: [{ id: 5, name: 'Too humid' }],
		cw_air_annotations: [
			{
				id: 7,
				created_at: MIDDLE,
				created_by: 'Kevin',
				title: 'Vent',
				note: 'Opened the vent',
				include_in_report: true
			}
		]
	},
	{ id: 1, created_at: OLDEST, temperature_c: 20, humidity: 55, co2: null }
];

function displayProps(overrides: Partial<DeviceDisplayProps> = {}): DeviceDisplayProps {
	return {
		devEui: 'AIR-001',
		locationId: '8',
		locationName: 'Greenhouse',
		latestData: HISTORY[0],
		historicalData: HISTORY,
		loading: false,
		permissionLevel: 1,
		...overrides
	};
}

let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	props: Partial<DeviceDisplayProps> | DeviceDisplayProps = {},
	preferences?: PreferencesDto
) {
	view = renderWithServices(AirDisplay, {
		props: 'devEui' in props ? (props as DeviceDisplayProps) : displayProps(props),
		app: { accessToken: 'jwt-token', preferences }
	});
	return view.target;
}

const text = () => document.body.textContent ?? '';
const hero = (title: string) =>
	[...document.querySelectorAll('.cw-stat-card')]
		.find((card) => card.querySelector('.cw-stat-card__title')?.textContent === title)
		?.querySelector('.cw-stat-card__hero-value')?.textContent ?? null;
const heroValue = (value: number, unit: string) =>
	`${formatCwNumber(value, { maximumFractionDigits: 2, locale: getIntlLocale() })}${unit}`;
const heatmapTitle = () =>
	document.querySelector('#HeatMapDiv .cw-card__title')?.textContent ?? null;
const metricButtons = () => [
	...document.querySelectorAll<HTMLButtonElement>('.heatmap-metric-toggle button')
];
const metricButton = (label: string) =>
	metricButtons().find((button) => button.textContent?.trim() === label)!;
const tableRows = () => [...document.querySelectorAll('.cw-data-table tbody tr')];
const cells = (row: Element) =>
	[...row.querySelectorAll('td:not(.cw-data-table__td--actions)')].map((td) =>
		td.textContent?.trim()
	);
const iconButton = (root: ParentNode, label: string) =>
	[...root.querySelectorAll('button')].find((button) =>
		button.querySelector(`[aria-label="${label}"]`)
	) ?? null;

let fake: ReturnType<typeof createFakeFetch>;

beforeEach(() => {
	fake = createFakeFetch(() => jsonResponse({ type: 'success', status: 200 }));
	vi.stubGlobal('fetch', fake.fetch);
});

/** Types a note into the open row dialog and saves it. */
function saveNote(body: string) {
	const dialog = document.querySelector<HTMLDialogElement>('dialog[open]')!;
	const textarea = dialog.querySelector('textarea')!;
	textarea.value = body;
	textarea.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
	[...dialog.querySelectorAll('button')]
		.find((button) => button.textContent?.includes(m.display_save_note()))!
		.click();
}

afterEach(() => {
	view?.unmount();
	view = null;
	document.body.innerHTML = '';
	forms.applyAction.mockReset();
	vi.unstubAllGlobals();
});

describe('AirDisplay stats', () => {
	it('summarises the range with the newest reading first', () => {
		render();

		expect(hero(m.display_temperature())).toBe(heroValue(22.5, '°C'));
		expect(hero(m.display_temperature_humidity())).toBe(heroValue(60, '%'));
		expect(hero(m.sensor_dew_point())).toBe(
			heroValue(
				convertSensorValue('dew_point', computeDewPoint(22.5, 60)!, undefined),
				resolveDisplayUnit('dew_point', undefined)
			)
		);
		// CO₂: the newest reading that carries one.
		expect(hero('CO₂')).toContain(
			formatCwNumber(640, { maximumFractionDigits: 2, locale: getIntlLocale() })
		);
	});

	it("converts to the user's units", () => {
		render({}, FAHRENHEIT);

		expect(hero(m.display_temperature())).toBe(
			heroValue(convertSensorValue('temperature_c', 22.5, FAHRENHEIT), '°F')
		);
		expect(hero(m.sensor_dew_point())).toBe(
			heroValue(
				convertSensorValue('dew_point', computeDewPoint(22.5, 60)!, FAHRENHEIT),
				resolveDisplayUnit('dew_point', FAHRENHEIT)
			)
		);
	});

	it('hides CO₂ and dew point when the device does not report them', () => {
		render({
			historicalData: [
				{ id: 1, created_at: NEWEST, temperature_c: 20, humidity: null, co2: 0 },
				{ id: 2, created_at: OLDEST, temperature_c: null, humidity: 50 }
			]
		});

		expect(hero(m.display_temperature())).toBe(heroValue(20, '°C'));
		expect(hero(m.sensor_dew_point())).toBeNull();
		expect(hero('CO₂')).toBeNull();
	});

	it('shows zeroed temperature and humidity before there is any history', () => {
		render({ historicalData: [], latestData: null });

		expect(hero(m.display_temperature())).toBe(heroValue(0, '°C'));
		expect(hero(m.display_temperature_humidity())).toBe(heroValue(0, '%'));
		expect(text()).toContain(m.display_no_data());
		expect(text()).toContain(m.display_no_air_quality_data_selected_range());
		expect(document.querySelector('#HeatMapDiv')).toBeNull();
	});

	it('shows neither the heatmap nor the empty state while loading', () => {
		render({ loading: true });

		expect(document.querySelector('#HeatMapDiv')).toBeNull();
		expect(document.querySelector('.cw-data-table')).toBeNull();
		expect(text()).not.toContain(m.display_no_air_quality_data_selected_range());
		expect(hero(m.display_temperature())).toBe(heroValue(22.5, '°C'));
	});
});

describe('AirDisplay heatmap and wind', () => {
	it('switches the heatmap between the metrics the device reports', () => {
		render();

		expect(heatmapTitle()).toBe(m.rule_subject_temperature());
		expect(text()).toContain(m.display_reading_density());
		expect(metricButtons().map((button) => button.textContent?.trim())).toEqual([
			m.rule_subject_temperature(),
			m.rule_subject_humidity(),
			m.rule_subject_co2()
		]);
		expect(metricButton(m.rule_subject_temperature()).classList).toContain('cw-button--info');

		metricButton(m.rule_subject_humidity()).click();
		flushSync();
		expect(heatmapTitle()).toBe(m.rule_subject_humidity());
		expect(metricButton(m.rule_subject_humidity()).classList).toContain('cw-button--info');
		expect(metricButton(m.rule_subject_temperature()).classList).toContain('cw-button--secondary');

		metricButton(m.rule_subject_co2()).click();
		flushSync();
		expect(heatmapTitle()).toBe(m.rule_subject_co2());
	});

	it('falls back to temperature when the selected CO₂ drops out of the data', async () => {
		const props = $state(displayProps());
		render(props);
		metricButton(m.rule_subject_co2()).click();
		flushSync();

		props.historicalData = [HISTORY[0], HISTORY[2]];

		await expect.poll(heatmapTitle).toBe(m.rule_subject_temperature());
		expect(metricButtons()).toHaveLength(2);
	});

	it('spans the heatmap over the readings that have a time, ignoring any without one', () => {
		/** The heatmap's day columns for a history. */
		const dayColumns = (historicalData: Record<string, unknown>[]) => {
			render({ historicalData });
			const count = document.querySelectorAll('#HeatMapDiv .cw-heatmap__col-header').length;
			view?.unmount();
			view = null;
			return count;
		};
		const unreadable = { id: 9, created_at: 'not a date', temperature_c: 19 };

		const columns = dayColumns(HISTORY);
		expect(columns).toBeGreaterThan(0);
		expect(dayColumns([...HISTORY, unreadable])).toBe(columns);
		// With no readable time at all it shows one day.
		expect(dayColumns([unreadable])).toBe(1);
	});

	it('shows the wind compass beside the heatmap for a weather station', () => {
		render({ latestData: { ...HISTORY[0], wind_direction: '270', wind_speed: '5' } }, {
			wind_speed_unit: 'km_h'
		} as PreferencesDto);

		const compass = document.querySelector('.cw-wind-compass');
		expect(compass).not.toBeNull();
		expect(compass?.textContent).toContain('km/h');
		expect(document.querySelector('#HeatMapDiv')?.classList).toContain('air-wind-row--paired');
	});

	it('shows the wind in m/s by default and for units the compass does not know', () => {
		for (const preferences of [undefined, { wind_speed_unit: 'furlong' } as PreferencesDto]) {
			render({ latestData: { ...HISTORY[0], wind_direction: 90, wind_speed: 3 } }, preferences);
			expect(document.querySelector('.cw-wind-compass')?.textContent).toContain('m/s');
			view?.unmount();
			view = null;
		}
	});

	it('has no compass without both a direction and a speed', () => {
		for (const latestData of [
			HISTORY[0],
			{ ...HISTORY[0], wind_direction: 'north', wind_speed: 3 },
			{ ...HISTORY[0], wind_direction: 90 }
		]) {
			render({ latestData });
			expect(document.querySelector('.cw-wind-compass')).toBeNull();
			expect(document.querySelector('#HeatMapDiv')?.classList).not.toContain(
				'air-wind-row--paired'
			);
			view?.unmount();
			view = null;
		}
	});
});

describe('AirDisplay telemetry table', () => {
	it('lists the readings newest first, with alerts and notes', async () => {
		render();

		await expect.poll(() => tableRows().length).toBe(3);
		expect(text()).toContain(m.display_telemetry_table());
		expect(
			[...document.querySelectorAll('.cw-data-table th')].map((th) => th.textContent?.trim())
		).toEqual([
			m.display_timestamp(),
			m.rule_subject_temperature(),
			m.rule_subject_humidity(),
			m.rule_subject_co2(),
			m.status_alerts(),
			m.common_actions()
		]);
		expect(tableRows().map(cells)).toEqual([
			[
				new Date(NEWEST).toLocaleString(),
				formatSensorMeasurement('temperature_c', 22.5).display,
				formatSensorMeasurement('humidity', 60).display,
				formatSensorMeasurement('co2', 0).display,
				''
			],
			[
				new Date(MIDDLE).toLocaleString(),
				formatSensorMeasurement('temperature_c', 21).display,
				formatSensorMeasurement('humidity', 58).display,
				formatSensorMeasurement('co2', 640).display,
				'❌'
			],
			[
				new Date(OLDEST).toLocaleString(),
				formatSensorMeasurement('temperature_c', 20).display,
				formatSensorMeasurement('humidity', 55).display,
				formatSensorMeasurement('co2', 0).display,
				''
			]
		]);
		const [newest, middle, oldest] = tableRows();
		expect(newest.querySelector(`img[alt="${m.dashboard_no_alerts_alt()}"]`)).not.toBeNull();
		expect(middle.querySelector(`img[alt="${m.dashboard_no_alerts_alt()}"]`)).toBeNull();
		// Every reading can take a note; only the annotated one can show its notes.
		for (const row of [newest, middle, oldest]) {
			expect(iconButton(row, m.display_add_note())).not.toBeNull();
		}
		expect(iconButton(newest, m.display_view_notes())).toBeNull();
		expect(iconButton(middle, m.display_view_notes())).not.toBeNull();
		expect(iconButton(oldest, m.display_view_notes())).toBeNull();
	});

	it('leaves out the CO₂ column for a device without a CO₂ sensor', async () => {
		render({
			historicalData: [
				{ data_id: 'd-1', created_at: NEWEST, temperature_c: 20, humidity: 50, co2: 0 },
				{ created_at: OLDEST, temperature_c: 19, humidity: 51 }
			]
		});

		await expect.poll(() => tableRows().length).toBe(2);
		expect(
			[...document.querySelectorAll('.cw-data-table th')].map((th) => th.textContent?.trim())
		).not.toContain(m.rule_subject_co2());
		expect(metricButtons()).toHaveLength(2);

		const search = document.querySelector<HTMLInputElement>(
			'.cw-data-table__search-wrapper input'
		)!;
		search.value = '19.00';
		search.dispatchEvent(new Event('input', { bubbles: true }));
		await expect.poll(() => tableRows().length).toBe(1);
		expect(cells(tableRows()[0])[0]).toBe(new Date(OLDEST).toLocaleString());
	});

	it('saves the note of a reading without a device id under the displayed device', async () => {
		render();
		await expect.poll(() => tableRows().length).toBe(3);

		iconButton(tableRows()[2], m.display_add_note())!.click();
		flushSync();
		saveNote('Checked the filter');

		await expect.poll(() => fake.requests.length).toBe(1);
		const sent = Object.fromEntries(
			[...((fake.fetch as unknown as Mock).mock.calls[0][1].body as FormData).entries()].map(
				([name, value]) => [name, String(value)]
			)
		);
		expect(sent).toMatchObject({
			dev_eui: 'AIR-001',
			created_at: OLDEST,
			note: 'Checked the filter'
		});
	});

	it('searches the readings by their values', async () => {
		render();
		await expect.poll(() => tableRows().length).toBe(3);
		const search = document.querySelector<HTMLInputElement>(
			'.cw-data-table__search-wrapper input'
		)!;

		search.value = '58.00';
		search.dispatchEvent(new Event('input', { bubbles: true }));
		await expect.poll(() => tableRows().length).toBe(1);
		expect(cells(tableRows()[0])[0]).toBe(new Date(MIDDLE).toLocaleString());

		search.value = '640';
		search.dispatchEvent(new Event('input', { bubbles: true }));
		await expect
			.poll(() => cells(tableRows()[0])[3])
			.toBe(formatSensorMeasurement('co2', 640).display);
		expect(tableRows()).toHaveLength(1);
	});

	it('shows a newly saved note on its reading right away', async () => {
		render();
		await expect.poll(() => tableRows().length).toBe(3);
		const newest = tableRows()[0];

		iconButton(newest, m.display_add_note())!.click();
		flushSync();
		saveNote('Closed the vent');

		await expect.poll(() => iconButton(tableRows()[0], m.display_view_notes())).not.toBeNull();
		expect(view?.toasts()).toEqual([
			expect.objectContaining({ tone: 'success', message: m.devices_save_note_success() })
		]);
		iconButton(tableRows()[0], m.display_view_notes())!.click();
		flushSync();
		expect(document.querySelector('dialog[open]')?.textContent).toContain('Closed the vent');
	});

	it('adds a new note after the notes a reading already has', async () => {
		render();
		await expect.poll(() => tableRows().length).toBe(3);

		iconButton(tableRows()[1], m.display_add_note())!.click();
		flushSync();
		saveNote('Closed it again');
		await expect.poll(() => view?.toasts().length).toBe(1);
		await expect.poll(() => iconButton(tableRows()[1], m.display_view_notes())).not.toBeNull();

		iconButton(tableRows()[1], m.display_view_notes())!.click();
		flushSync();
		const notes = [...document.querySelectorAll('dialog[open] article')].map(
			(article) => article.querySelector('.notes-view-dialog__body')?.textContent
		);
		expect(notes).toEqual(['Opened the vent', 'Closed it again']);
	});

	it("keeps a device's saved notes to that device", async () => {
		const props = $state(displayProps());
		render(props);
		await expect.poll(() => tableRows().length).toBe(3);
		iconButton(tableRows()[0], m.display_add_note())!.click();
		flushSync();
		saveNote('Closed the vent');
		await expect.poll(() => iconButton(tableRows()[0], m.display_view_notes())).not.toBeNull();

		// Another device, with a reading at the same time as the annotated one.
		props.devEui = 'AIR-002';
		props.historicalData = [
			{ id: 13, dev_eui: 'AIR-002', created_at: NEWEST, temperature_c: 18, humidity: 70 },
			{ id: 11, dev_eui: 'AIR-002', created_at: OLDEST, temperature_c: 17, humidity: 71 }
		];
		await expect.poll(() => tableRows().length).toBe(2);
		expect(iconButton(tableRows()[0], m.display_view_notes())).toBeNull();

		// Back on the first device, its note is still there.
		props.devEui = 'AIR-001';
		props.historicalData = HISTORY;
		await expect.poll(() => tableRows().length).toBe(3);
		await expect.poll(() => iconButton(tableRows()[0], m.display_view_notes())).not.toBeNull();
	});
});
