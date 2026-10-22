import { afterEach, describe, expect, it } from 'vitest';
import type { PreferencesDto } from '$lib/api/api.dtos';
import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import { formatSensorMeasurement } from '$lib/units';
import WaterDisplay from './WaterDisplay.svelte';

const FAHRENHEIT = { temperature_unit: 'fahrenheit' } as PreferencesDto;

/** Newest first, as the device page passes it; the DB column is spelled `deapth_cm`. */
const HISTORY = [
	{
		id: 2,
		created_at: '2026-10-21T03:00:00.000Z',
		temperature_c: 18.25,
		deapth_cm: 42.37,
		pressure: 1013.26,
		spo2: 97
	},
	{
		created_at: '2026-10-21T02:00:00.000Z',
		temperature_c: 'n/a',
		depth_cm: 40,
		pressure: 1012,
		spo2: 96.5
	}
];

function displayProps(overrides: Partial<DeviceDisplayProps> = {}): DeviceDisplayProps {
	return {
		devEui: 'WTR-001',
		locationId: '8',
		locationName: 'Reservoir',
		latestData: HISTORY[0],
		historicalData: HISTORY,
		loading: false,
		permissionLevel: 1,
		...overrides
	};
}

let view: ReturnType<typeof renderWithServices> | null = null;

function render(overrides: Partial<DeviceDisplayProps> = {}, preferences?: PreferencesDto) {
	view = renderWithServices(WaterDisplay, {
		props: displayProps(overrides),
		app: { accessToken: 'jwt-token', preferences }
	});
	return view.target;
}

const kpi = (field: string, value: unknown, preferences?: PreferencesDto) => {
	const { valueDisplay, unit } = formatSensorMeasurement(field, value, preferences, {
		maximumFractionDigits: 1
	});
	return `${valueDisplay}${unit}`;
};
const kpiValues = (target: HTMLElement) =>
	[...target.querySelectorAll('.kpi-value')].map((value) => value.textContent);
const tableRows = (target: HTMLElement) =>
	[...target.querySelectorAll('tbody tr')].map((tr) =>
		[...tr.querySelectorAll('td')].map((td) => td.textContent?.trim())
	);

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('WaterDisplay', () => {
	it('shows the latest temperature, depth, pressure and SpO₂', () => {
		const target = render();

		expect(target.textContent).toContain(m.display_water_temperature());
		expect(target.textContent).toContain(m.display_depth());
		expect(target.textContent).toContain(m.rule_subject_pressure());
		expect(target.textContent).toContain(m.rule_subject_spo2());
		expect(kpiValues(target)).toEqual([
			kpi('temperature_c', 18.25),
			kpi('deapth_cm', 42.37),
			kpi('pressure', 1013.26),
			kpi('spo2', 97)
		]);
	});

	it("follows the user's units and reads the correctly spelled depth too", () => {
		const target = render(
			{ latestData: { temperature_c: 20, depth_cm: 40, pressure: 1012, spo2: 96.5 } },
			FAHRENHEIT
		);

		expect(kpiValues(target)).toEqual([
			kpi('temperature_c', 20, FAHRENHEIT),
			kpi('deapth_cm', 40, FAHRENHEIT),
			kpi('pressure', 1012, FAHRENHEIT),
			kpi('spo2', 96.5, FAHRENHEIT)
		]);
		expect(kpiValues(target)[0]).toContain('68');
	});

	it('shows a dash for readings the device has not sent', () => {
		const target = render({ latestData: null });

		expect(kpiValues(target)).toEqual([
			kpi('temperature_c', null),
			kpi('deapth_cm', null),
			kpi('pressure', null),
			kpi('spo2', null)
		]);
	});

	it('lists the readings in a searchable, sortable table', async () => {
		const target = render({}, FAHRENHEIT);

		await expect.poll(() => target.querySelectorAll('tbody tr').length).toBe(2);
		expect(target.textContent).toContain(m.display_water_telemetry());
		expect([...target.querySelectorAll('th')].map((th) => th.textContent?.trim())).toEqual([
			m.display_timestamp(),
			m.rule_subject_temperature(),
			m.rule_subject_water_depth(),
			m.rule_subject_pressure(),
			m.rule_subject_spo2()
		]);
		// Newest first, like the history; an unreadable value counts as 0.
		expect(tableRows(target)).toEqual([
			[
				new Date('2026-10-21T03:00:00.000Z').toLocaleString(),
				formatSensorMeasurement('temperature_c', 18.25, FAHRENHEIT).display,
				formatSensorMeasurement('deapth_cm', 42.37, FAHRENHEIT, { maximumFractionDigits: 1 })
					.display,
				formatSensorMeasurement('pressure', 1013.26, FAHRENHEIT, { maximumFractionDigits: 1 })
					.display,
				'97'
			],
			[
				new Date('2026-10-21T02:00:00.000Z').toLocaleString(),
				formatSensorMeasurement('temperature_c', 0, FAHRENHEIT).display,
				formatSensorMeasurement('deapth_cm', 40, FAHRENHEIT, { maximumFractionDigits: 1 }).display,
				formatSensorMeasurement('pressure', 1012, FAHRENHEIT, { maximumFractionDigits: 1 }).display,
				'96.5'
			]
		]);

		const search = target.querySelector<HTMLInputElement>('.cw-data-table__search-wrapper input')!;
		search.value = '1013.26';
		search.dispatchEvent(new Event('input', { bubbles: true }));
		await expect.poll(() => target.querySelectorAll('tbody tr').length).toBe(1);
		expect(tableRows(target)[0][4]).toBe('97');

		search.value = '';
		search.dispatchEvent(new Event('input', { bubbles: true }));
		await expect.poll(() => target.querySelectorAll('tbody tr').length).toBe(2);
		const spo2Header = [...target.querySelectorAll('th')].find(
			(th) => th.textContent?.trim() === m.rule_subject_spo2()
		);
		spo2Header!.querySelector('button')!.click();
		await expect.poll(() => tableRows(target).map((row) => row[4])).toEqual(['96.5', '97']);
		spo2Header!.querySelector('button')!.click();
		await expect.poll(() => tableRows(target).map((row) => row[4])).toEqual(['97', '96.5']);
	});

	it('lists a reading the probe sent only partly with zeros for the rest', async () => {
		const target = render({ historicalData: [{ temperature_c: 17 }] });

		await expect.poll(() => target.querySelectorAll('tbody tr').length).toBe(1);
		expect(tableRows(target)).toEqual([
			[
				new Date('').toLocaleString(),
				formatSensorMeasurement('temperature_c', 17).display,
				formatSensorMeasurement('deapth_cm', 0, undefined, { maximumFractionDigits: 1 }).display,
				formatSensorMeasurement('pressure', 0, undefined, { maximumFractionDigits: 1 }).display,
				'0'
			]
		]);
	});

	it('says when the selected range has no data', () => {
		const target = render({ historicalData: [] });

		expect(target.textContent).toContain(m.display_no_data());
		expect(target.textContent).toContain(m.display_no_water_data_selected_range());
		expect(target.querySelector('table')).toBeNull();
	});

	it('shows neither the table nor the empty state while loading', () => {
		const target = render({ loading: true });

		expect(target.querySelector('table')).toBeNull();
		expect(target.textContent).not.toContain(m.display_no_water_data_selected_range());
		expect(kpiValues(target)).toHaveLength(4);
	});
});
