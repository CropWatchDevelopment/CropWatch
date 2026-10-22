import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DashboardPage, DashboardRow, PreferencesDto } from '$lib/api/api.dtos';
import { formatDateTime } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import { formatSensorMeasurement } from '$lib/units';
import DashboardTable from './DashboardTable.svelte';

const { goto } = vi.hoisted(() => ({ goto: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto }));

interface Filters {
	group: string;
	locationGroup: string;
	location: string;
	name: string;
}

const NO_FILTERS: Filters = { group: '', locationGroup: '', location: '', name: '' };
const FAHRENHEIT = { temperature_unit: 'fahrenheit' } as PreferencesDto;
const UPDATED_AT = '2026-10-21T01:00:00.000Z';

function row(overrides: Partial<DashboardRow> = {}): DashboardRow {
	return {
		dev_eui: 'DEV-1',
		name: 'Greenhouse probe',
		group: 'Sensors',
		upload_interval: 10,
		last_data_updated_at: UPDATED_AT,
		error_status: null,
		device_type: {
			id: 1,
			name: 'Air',
			data_table_v2: 'cw_air_data',
			primary_data_v2: 'temperature_c',
			secondary_data_v2: 'humidity',
			default_upload_interval: 10
		},
		location: { location_id: 8, name: 'North field', group: 'Farm' },
		latest: { created_at: UPDATED_AT, primary: 21.5, secondary: 60 },
		...overrides
	};
}

function page(rows: DashboardRow[], total = rows.length): DashboardPage {
	return { rows, total, skip: 0, take: 25 };
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(filters: Filters = NO_FILTERS, preferences?: PreferencesDto) {
	view = renderWithServices(DashboardTable, {
		props: { filters },
		services,
		app: { accessToken: 'jwt-token', preferences }
	});
	return view;
}

const tableRows = () => [...(view?.target.querySelectorAll('tbody tr') ?? [])];
const cellTexts = (tr: Element) =>
	[...tr.querySelectorAll('td')].map((td) => td.textContent?.trim() ?? '');
const getDevices = () => services.dashboard.getDashboardDevices;

beforeEach(() => {
	services = createMockServices();
});

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
});

describe('DashboardTable', () => {
	it("lists the devices with their latest readings in the user's units", async () => {
		getDevices().mockResolvedValue(page([row()]));

		render(NO_FILTERS, FAHRENHEIT);

		await expect.poll(() => tableRows().length).toBe(1);
		expect(cellTexts(tableRows()[0])).toEqual([
			'Greenhouse probe',
			'North field',
			'Sensors',
			`${m.sensor_temperature()}: ${formatSensorMeasurement('temperature_c', 21.5, FAHRENHEIT).display}`,
			`${m.sensor_humidity()}: ${formatSensorMeasurement('humidity', 60, FAHRENHEIT).display}`,
			// In the app's language and format, like every other date in the app.
			formatDateTime(UPDATED_AT)
		]);
		expect(getDevices()).toHaveBeenCalledWith(
			{
				skip: 0,
				take: 25,
				group: undefined,
				locationGroup: undefined,
				location: undefined,
				name: undefined
			},
			{ signal: expect.any(AbortSignal) }
		);
	});

	it('shows a dash for whatever a device does not have', async () => {
		getDevices().mockResolvedValue(
			page([
				row({
					location: null,
					group: null,
					last_data_updated_at: null,
					latest: null,
					device_type: { ...row().device_type, primary_data_v2: '-', secondary_data_v2: '' }
				}),
				row({
					dev_eui: 'DEV-2',
					name: 'Hidden columns',
					device_type: {
						...row().device_type,
						primary_data_v2: 'battery',
						secondary_data_v2: '-'
					}
				}),
				row({
					dev_eui: 'DEV-3',
					name: 'No column set',
					latest: null,
					device_type: { ...row().device_type, primary_data_v2: '', secondary_data_v2: 'battery' }
				}),
				row({ dev_eui: 'DEV-4', name: 'Unreadable time', last_data_updated_at: 'not a date' })
			])
		);

		render();

		await expect.poll(() => tableRows().length).toBe(4);
		const [first, second, third, fourth] = tableRows().map(cellTexts);
		expect(first).toEqual(['Greenhouse probe', '—', '—', '—', '—', '—']);
		expect(second.slice(3, 5)).toEqual(['—', '—']);
		expect(third.slice(3, 5)).toEqual(['—', '—']);
		expect(fourth.at(-1)).toBe('—');
	});

	it('labels a reading that has not arrived yet, and shows relay states with their icon', async () => {
		getDevices().mockResolvedValue(
			page([
				row({ latest: null }),
				row({
					dev_eui: 'DEV-R',
					name: 'Pump relay',
					device_type: {
						...row().device_type,
						primary_data_v2: 'relay_1',
						secondary_data_v2: 'relay_2'
					},
					latest: { created_at: UPDATED_AT, primary: true, secondary: 0 }
				})
			])
		);

		render();

		await expect.poll(() => tableRows().length).toBe(2);
		const [waiting, relay] = tableRows().map(cellTexts);
		expect(waiting.slice(3, 5)).toEqual([
			`${m.sensor_temperature()}: —`,
			`${m.sensor_humidity()}: —`
		]);
		expect(relay.slice(3, 5)).toEqual([
			`${m.sensor_relay_1()}: 🟢 ${m.sensor_value_on()}`,
			`${m.sensor_relay_2()}: 🔴 ${m.sensor_value_off()}`
		]);
	});

	it('asks the API for the filtered page', async () => {
		getDevices().mockResolvedValue(page([row()]));

		render({ group: 'pumps', locationGroup: 'Farm', location: '8', name: 'probe' });

		await expect.poll(() => tableRows().length).toBe(1);
		expect(getDevices()).toHaveBeenCalledWith(
			{ skip: 0, take: 25, group: 'pumps', locationGroup: 'Farm', location: '8', name: 'probe' },
			{ signal: expect.any(AbortSignal) }
		);
	});

	it('pages through the devices 25 at a time', async () => {
		const rows = Array.from({ length: 25 }, (_, index) =>
			row({ dev_eui: `DEV-${index}`, name: `Device ${index}` })
		);
		getDevices().mockResolvedValue(page(rows, 30));
		render();
		await expect.poll(() => tableRows().length).toBe(25);

		view!.target
			.querySelector<HTMLButtonElement>(`button[aria-label="${m.cwui_table_next_page()}"]`)
			?.click();

		await expect
			.poll(() => getDevices().mock.calls.at(-1)?.[0])
			.toMatchObject({ skip: 25, take: 25 });
	});

	it('reloads when the dashboard filters change', async () => {
		getDevices().mockResolvedValue(page([row()]));
		const props = $state({ filters: NO_FILTERS });
		view = renderWithServices(DashboardTable, { props, services, app: { accessToken: 'jwt' } });
		await expect.poll(() => tableRows().length).toBe(1);

		props.filters = { ...NO_FILTERS, name: 'probe' };

		await expect
			.poll(() => getDevices().mock.calls.at(-1)?.[0])
			.toEqual({
				skip: 0,
				take: 25,
				group: undefined,
				locationGroup: undefined,
				location: undefined,
				name: 'probe'
			});
	});

	it('pulls fresh data when the user comes back to the app', async () => {
		getDevices().mockResolvedValue(page([row()]));
		render();
		await expect.poll(() => tableRows().length).toBe(1);
		const calls = getDevices().mock.calls.length;

		window.dispatchEvent(new Event('focus'));

		await expect.poll(() => getDevices().mock.calls.length).toBe(calls + 1);
	});

	it('opens the device page with a way back to the dashboard', async () => {
		getDevices().mockResolvedValue(page([row()]));
		render();
		await expect.poll(() => tableRows().length).toBe(1);

		tableRows()[0].querySelector('td')?.click();

		expect(goto).toHaveBeenCalledWith('/locations/8/devices/DEV-1?backTo=%2F');
	});

	it('carries the location-group filter to the device page', async () => {
		getDevices().mockResolvedValue(page([row()]));
		render({ ...NO_FILTERS, locationGroup: 'North Farm' });
		await expect.poll(() => tableRows().length).toBe(1);

		tableRows()[0].querySelector('td')?.click();

		expect(goto).toHaveBeenCalledWith('/locations/8/devices/DEV-1?backTo=%2F&filter=North+Farm');
	});

	it('does not open a device that has no location', async () => {
		getDevices().mockResolvedValue(page([row({ location: null })]));
		render();
		await expect.poll(() => tableRows().length).toBe(1);

		tableRows()[0].querySelector('td')?.click();

		expect(goto).not.toHaveBeenCalled();
	});

	it("shows the table's error when the devices cannot be loaded", async () => {
		getDevices().mockRejectedValue(new Error('Dashboard unavailable'));

		render();

		await expect.poll(() => view?.target.textContent).toContain('Dashboard unavailable');
	});
});
