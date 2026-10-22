import { flushSync, type Component } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceDto, RelayHistoryEntryDto } from '$lib/api/api.dtos';
import { TABLE_REGISTRY } from '$lib/config/deviceTables';
import { PermissionLevel } from '$lib/constants/permissions';
import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
import { m } from '$lib/paraglide/messages.js';
import { labelFor } from '$lib/sensor-labels';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import DevicePage from './+page.svelte';

const nav = vi.hoisted(() => ({ goto: vi.fn(), afterNavigate: new Set<() => void>() }));
vi.mock('$app/navigation', async (importOriginal) => {
	const { onMount } = await import('svelte');
	return {
		...(await importOriginal<typeof import('$app/navigation')>()),
		goto: nav.goto,
		// As in SvelteKit: registered on mount; the router calls it after each navigation.
		afterNavigate: (callback: () => void) =>
			onMount(() => {
				nav.afterNavigate.add(callback);
				return () => nav.afterNavigate.delete(callback);
			})
	};
});
vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost/locations/8/devices/DEV-1') }
}));

/** What the router does once the page (or a new device) is on screen. */
function navigated() {
	for (const callback of nav.afterNavigate) callback();
	flushSync();
}

/** Stands in for every registered display and records the props the page passes it. */
let display: DeviceDisplayProps | null = null;
const ProbeDisplay: Component<DeviceDisplayProps> = (_internals, props) => {
	display = props;
	return {};
};
const registeredDisplays = { ...TABLE_REGISTRY };

const MINUTE = 60_000;
const at = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

function device(overrides: Partial<DeviceDto> = {}): DeviceDto {
	return {
		dev_eui: 'DEV-1',
		name: 'Soil probe',
		upload_interval: 10,
		error_status: null,
		cw_device_type: { id: 1, name: 'Soil', model: 'CW-SS', default_upload_interval: 30 },
		cw_locations: { name: 'North field', timezone: 'Asia/Tokyo' },
		...overrides
	} as DeviceDto;
}

function pageData(overrides: Record<string, unknown> = {}) {
	return {
		authToken: 'jwt-token',
		dataTable: 'cw_soil_data',
		devEui: 'DEV-1',
		device: device(),
		deviceData: [],
		latestData: null,
		locationId: '8',
		permissionLevel: PermissionLevel.ADMIN,
		...overrides
	};
}

const relayHistoryEntry: RelayHistoryEntryDto = {
	id: 'h1',
	kind: 'state_change',
	at: '2026-10-21T10:00:00.000Z',
	relay_1: true,
	relay_2: false,
	changed_relays: [1]
};

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(initial = pageData(), accessToken: string | null = 'jwt-token') {
	let data = $state.raw(initial);
	view = renderWithServices(DevicePage, {
		props: {
			get data() {
				return data;
			},
			params: { location_id: '8', dev_eui: String(initial.devEui) },
			form: null
		} as never,
		services,
		app: { accessToken: accessToken ?? undefined }
	});
	return {
		...view,
		/** Client-side navigation: SvelteKit hands the same page component new data. */
		setData(next: ReturnType<typeof pageData>) {
			data = next;
			flushSync();
		}
	};
}

const text = () => document.body.textContent ?? '';
const byId = (id: string) => document.getElementById(id) as HTMLButtonElement | null;
/** CwDialog keeps its native <dialog> in the DOM and toggles `open`. */
const errorDialogOpen = () =>
	(byId('device-error-close-button')?.closest('dialog') as HTMLDialogElement | null)?.open ?? false;
const chart = () => document.querySelector('.device-page__chart');
const chartChip = (label: string) =>
	[...document.querySelectorAll('.cw-rlc__chip')].find(
		(chip) => chip.querySelector('.cw-rlc__chip-label')?.textContent === label
	);

beforeEach(() => {
	services = createMockServices();
	services.gateways.getDeviceGateways.mockResolvedValue([]);
	for (const table of Object.keys(TABLE_REGISTRY)) TABLE_REGISTRY[table] = ProbeDisplay;
	display = null;
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	view?.unmount();
	view = null;
	Object.assign(TABLE_REGISTRY, registeredDisplays);
	nav.goto.mockReset();
	document.body.innerHTML = '';
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('device page', () => {
	it('titles the page and its header from the device and its location', () => {
		render();

		expect(document.title).toBe(m.devices_dashboard_page_title({ devEui: 'DEV-1' }));
		expect(text()).toContain(m.devices_dashboard_card_title({ devEui: 'Soil probe' }));
		expect(text()).toContain(m.devices_dashboard_card_subtitle({ locationName: 'North field' }));
	});

	it('falls back to the DevEUI when the device has no name or did not load', () => {
		render(pageData({ device: null }));

		expect(text()).toContain(m.devices_dashboard_card_title({ devEui: 'DEV-1' }));
		expect(text()).toContain(
			m.devices_dashboard_card_subtitle({ locationName: m.devices_unknown_location() })
		);
	});

	it("loads today's readings once the page is shown and hands them to the display", async () => {
		const rows = [
			{ id: 2, created_at: at(-MINUTE), moisture: 31 },
			{ id: 1, created_at: at(-2 * MINUTE), moisture: 30 }
		];
		let resolveRange!: (value: typeof rows) => void;
		services.telemetry.getDeviceDataWithinRange.mockReturnValue(
			new Promise((resolve) => (resolveRange = resolve))
		);
		render(pageData({ permissionLevel: PermissionLevel.USER }));
		expect(services.telemetry.getDeviceDataWithinRange).not.toHaveBeenCalled();

		navigated();

		expect(services.telemetry.getDeviceDataWithinRange).toHaveBeenCalledWith(
			'DEV-1',
			expect.objectContaining({ take: 1500 }),
			{ suppressNotFoundError: true }
		);
		expect(display?.loading).toBe(true);
		expect(text()).toContain(m.devices_loading_telemetry());

		resolveRange(rows);
		await vi.waitFor(() => expect(display?.historicalData).toEqual(rows));
		expect(display).toMatchObject({
			devEui: 'DEV-1',
			locationId: '8',
			locationName: 'North field',
			latestData: null,
			loading: false,
			permissionLevel: PermissionLevel.USER,
			pendingRelayStates: {},
			relayHistory: []
		});
		expect(typeof display?.queueRelayCommand).toBe('function');
		expect(text()).not.toContain(m.devices_loading_telemetry());
		// The header marks the loaded range as the active one.
		expect(byId('device-header-range-today-button')?.className).toContain('primary');
	});

	it('loads another range from the header', async () => {
		services.telemetry.getDeviceDataWithinRange.mockResolvedValue([]);
		render(pageData({ deviceData: [{ id: 1, created_at: at(-MINUTE), moisture: 30 }] }));

		byId('device-header-range-48-button')?.click();

		await vi.waitFor(() =>
			expect(byId('device-header-range-48-button')?.className).toContain('primary')
		);
		const [, query] = services.telemetry.getDeviceDataWithinRange.mock.calls[0];
		const { start, end } = query as { start: string; end: string };
		expect(Date.parse(end) - Date.parse(start)).toBe(48 * 60 * MINUTE);
	});

	it('says so when the device has not sent any data yet', async () => {
		services.telemetry.getDeviceDataWithinRange.mockResolvedValue([]);
		render();
		navigated();

		await vi.waitFor(() => expect(text()).toContain(m.devices_no_data_yet()));
		expect(text()).toContain(m.display_no_data());
		expect(document.querySelector('.device-page__display')).toBeNull();
	});

	it('keeps the display, not the empty notice, when the range fails to load', async () => {
		services.telemetry.getDeviceDataWithinRange.mockRejectedValue(new Error('down'));
		render();
		navigated();

		await vi.waitFor(() => expect(view?.toasts()).toHaveLength(1));
		expect(view?.toasts()[0]).toMatchObject({
			tone: 'danger',
			message: m.devices_load_telemetry_failed()
		});
		expect(text()).not.toContain(m.devices_no_data_yet());
		expect(display?.historicalData).toEqual([]);
	});

	it('charts the readings, and adds a hidden dew point line for air sensors', () => {
		const rows = [
			{ id: 1, created_at: at(-MINUTE), temperature_c: 20, humidity: 50 },
			{ id: 2, created_at: at(-2 * MINUTE), temperature_c: 21, humidity: 55 }
		];
		render(pageData({ dataTable: 'cw_air_data', deviceData: rows }));

		expect(chart()).not.toBeNull();
		expect(chartChip(labelFor('temperature_c').label())?.getAttribute('aria-pressed')).toBe('true');
		expect(chartChip(labelFor('dew_point').label())?.getAttribute('aria-pressed')).toBe('false');
		view?.unmount();

		render(pageData({ deviceData: rows }));
		expect(chart()).not.toBeNull();
		expect(chart()?.querySelector('.cw-rlc__title')?.textContent).toBe('Soil probe');
		expect(chartChip(labelFor('dew_point').label())).toBeUndefined();
		view?.unmount();

		// A device without a name titles its chart with the DevEUI.
		render(pageData({ device: device({ name: '' }), deviceData: rows }));
		expect(chart()?.querySelector('.cw-rlc__title')?.textContent).toBe('DEV-1');
	});

	it('draws no chart without numeric readings, or for traffic and relay devices', () => {
		const rows = [{ id: 1, created_at: at(-MINUTE), moisture: 30 }];

		render(pageData({ deviceData: [{ id: 1, created_at: at(-MINUTE) }] }));
		expect(chart()).toBeNull();
		view?.unmount();

		render(pageData({ dataTable: 'cw_traffic2', deviceData: rows }));
		expect(chart()).toBeNull();
		// Traffic devices pick a month in their own display instead of a range.
		expect(byId('device-header-range-today-button')).toBeNull();
		view?.unmount();

		render(pageData({ dataTable: 'cw_relay_data', deviceData: rows }));
		expect(chart()).toBeNull();
	});

	it('renders the generic display for an unknown data table', () => {
		render(pageData({ dataTable: null, deviceData: [{ id: 1, created_at: at(0), level: 7 }] }));

		expect(display).toBeNull();
		expect(text()).toContain(m.display_generic_view());
		expect(document.querySelector('.default-display td')).not.toBeNull();
	});

	it('opens the error dialog once per device that reports a fault', async () => {
		services.telemetry.getDeviceDataWithinRange.mockResolvedValue([]);
		const page = render(pageData({ device: device({ error_status: ' Sensor fault ' }) }));

		await vi.waitFor(() => expect(errorDialogOpen()).toBe(true));
		expect(text()).toContain(m.devices_error_status_title());
		expect(text()).toContain(m.devices_error_status_body());
		expect(text()).toContain(m.devices_error_status_detail({ status: 'Sensor fault' }));
		byId('device-error-close-button')?.click();
		await vi.waitFor(() => expect(errorDialogOpen()).toBe(false));

		// New data for the same device (e.g. invalidateAll) keeps it closed…
		page.setData(pageData({ device: device({ error_status: 'Sensor fault' }) }));
		expect(errorDialogOpen()).toBe(false);

		// …while another faulty device opens it again.
		const faulty = pageData({
			devEui: 'DEV-2',
			device: device({ dev_eui: 'DEV-2', error_status: 'Battery' })
		});
		page.setData(faulty);
		await vi.waitFor(() => expect(errorDialogOpen()).toBe(true));
		expect(text()).toContain(m.devices_error_status_detail({ status: 'Battery' }));

		// Closed with the dialog's own close button, it stays closed for that device too.
		document.querySelector<HTMLButtonElement>('dialog .cw-dialog__close')?.click();
		await vi.waitFor(() => expect(errorDialogOpen()).toBe(false));
		page.setData({ ...faulty });
		expect(errorDialogOpen()).toBe(false);
	});

	it('shows no error dialog for a healthy device', () => {
		render(pageData({ device: device({ error_status: '   ' }) }));

		expect(byId('device-error-close-button')).toBeNull();
		expect(text()).not.toContain(m.devices_error_status_body());
	});

	it('disables the controls and loads nothing without a session', async () => {
		render(pageData({ authToken: null, deviceData: [{ id: 1, created_at: at(-MINUTE) }] }), null);
		navigated();

		expect(byId('device-header-range-today-button')?.disabled).toBe(true);
		// Displays gate on the app context's session; the page passes no token.
		expect(display).not.toBeNull();
		expect(Object.keys(display ?? {})).not.toContain('authToken');
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(services.telemetry.getDeviceDataWithinRange).not.toHaveBeenCalled();
	});

	it('loads the new device when navigating between devices', async () => {
		services.telemetry.getDeviceDataWithinRange.mockImplementation(async (devEui) => [
			{ id: devEui, created_at: at(-MINUTE), moisture: 1 }
		]);
		const page = render();
		navigated();
		await vi.waitFor(() =>
			expect(display?.historicalData).toEqual([expect.objectContaining({ id: 'DEV-1' })])
		);

		page.setData(
			pageData({ devEui: 'DEV-2', device: device({ dev_eui: 'DEV-2', name: 'Other' }) })
		);
		navigated();

		await vi.waitFor(() =>
			expect(display?.historicalData).toEqual([expect.objectContaining({ id: 'DEV-2' })])
		);
		expect(document.title).toBe(m.devices_dashboard_page_title({ devEui: 'DEV-2' }));
		expect(text()).toContain(m.devices_dashboard_card_title({ devEui: 'Other' }));
	});

	it('refreshes the range and the latest reading when the app returns to the foreground', async () => {
		services.telemetry.getDeviceDataWithinRange.mockResolvedValue([]);
		services.telemetry.getDeviceLatestData.mockResolvedValue({ id: 9, created_at: at(0) });
		render();

		window.dispatchEvent(new Event('focus'));

		await vi.waitFor(() =>
			expect(display?.latestData).toEqual({ id: 9, created_at: expect.any(String) })
		);
		expect(services.telemetry.getDeviceDataWithinRange).toHaveBeenCalledTimes(1);
		expect(services.telemetry.getDeviceLatestData).toHaveBeenCalledWith('DEV-1');
	});
});

describe('device page refresh scheduler', () => {
	beforeEach(() => {
		vi.useFakeTimers({
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
		});
		vi.setSystemTime(Date.parse('2026-10-21T12:00:00.000Z'));
		vi.spyOn(Math, 'random').mockReturnValue(0);
	});

	it("refetches the device's latest reading when its upload window passes", async () => {
		services.telemetry.getDeviceLatestData.mockResolvedValue({ id: 2, created_at: at(MINUTE) });
		// Last seen 9 minutes ago with a 10-minute interval: due in 2 minutes (1 minute grace).
		render(pageData({ latestData: { id: 1, created_at: at(-9 * MINUTE) } }));

		await vi.advanceTimersByTimeAsync(2 * MINUTE - 10);
		expect(services.telemetry.getDeviceLatestData).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(10);
		expect(services.telemetry.getDeviceLatestData).toHaveBeenCalledWith('DEV-1');
		await vi.waitFor(() => expect(display?.latestData).toMatchObject({ id: 2 }));
	});

	it('re-arms the scheduler for the device navigated to', async () => {
		services.telemetry.getDeviceLatestData.mockResolvedValue({ id: 3, created_at: at(0) });
		const page = render(pageData({ latestData: { id: 1, created_at: at(-9 * MINUTE) } }));

		// DEV-2 was last seen 6 minutes ago: due in 5 minutes, not in 2.
		page.setData(pageData({ devEui: 'DEV-2', latestData: { id: 2, created_at: at(-6 * MINUTE) } }));
		await vi.advanceTimersByTimeAsync(2 * MINUTE);
		expect(services.telemetry.getDeviceLatestData).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(3 * MINUTE);
		expect(services.telemetry.getDeviceLatestData).toHaveBeenCalledTimes(1);
		expect(services.telemetry.getDeviceLatestData).toHaveBeenCalledWith('DEV-2');
	});

	it("re-arms from the next device's own reading, not one refetched for the previous device", async () => {
		// DEV-1 last reported 9 minutes ago: refetched 2 minutes from now.
		services.telemetry.getDeviceLatestData.mockResolvedValue({ id: 2, created_at: at(2 * MINUTE) });
		const page = render(pageData({ latestData: { id: 1, created_at: at(-9 * MINUTE) } }));
		await vi.advanceTimersByTimeAsync(2 * MINUTE);
		await vi.waitFor(() => expect(display?.latestData).toMatchObject({ id: 2 }));

		// DEV-2 last reported 9 minutes before now: due in 2 minutes (not 11).
		const reported = { id: 3, created_at: at(-9 * MINUTE) };
		page.setData(pageData({ devEui: 'DEV-2', latestData: reported }));
		expect(display?.latestData).toEqual(reported);

		await vi.advanceTimersByTimeAsync(2 * MINUTE);
		expect(services.telemetry.getDeviceLatestData).toHaveBeenCalledTimes(2);
		expect(services.telemetry.getDeviceLatestData).toHaveBeenLastCalledWith('DEV-2');
	});

	it('stops refetching once the page is gone', async () => {
		services.telemetry.getDeviceLatestData.mockResolvedValue({ id: 2, created_at: at(0) });
		render(pageData({ latestData: { id: 1, created_at: at(-9 * MINUTE) } }));

		view?.unmount();
		view = null;
		await vi.advanceTimersByTimeAsync(60 * MINUTE);

		expect(services.telemetry.getDeviceLatestData).not.toHaveBeenCalled();
	});
});

describe('relay device page', () => {
	beforeEach(() => {
		vi.useFakeTimers({
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
		});
		vi.setSystemTime(Date.parse('2026-10-21T12:00:00.000Z'));
		services.relays.getRelayData.mockResolvedValue({
			id: 'row-1',
			created_at: at(-5 * MINUTE),
			relay_1: false,
			relay_2: true
		});
		services.relays.getRelayHistory.mockResolvedValue([relayHistoryEntry]);
	});

	const relayPage = (overrides: Record<string, unknown> = {}) =>
		pageData({
			dataTable: 'cw_relay_data',
			devEui: 'RELAY-1',
			device: device({ dev_eui: 'RELAY-1', name: 'Pump relay' }),
			...overrides
		});

	it('shows the relay state and history, and sends commands from the display', async () => {
		render(relayPage());
		// Loading until the history arrives.
		expect(display?.loading).toBe(true);

		navigated();
		await vi.advanceTimersByTimeAsync(0);

		expect(display?.relayHistory).toEqual([relayHistoryEntry]);
		expect(display?.loading).toBe(false);
		expect(display?.latestData).toMatchObject({ id: 'row-1', relay_1: false, relay_2: true });
		expect(text()).not.toContain(m.devices_no_data_yet());

		services.relays.updateRelay.mockResolvedValue({ requestedAt: at(0) });
		await display?.queueRelayCommand?.(1, 'on');
		flushSync();

		expect(services.relays.updateRelay).toHaveBeenCalledWith('RELAY-1', {
			relay: 1,
			targetState: 'on'
		});
		expect(display?.pendingRelayStates?.[1]).toMatchObject({
			requestedState: 'on',
			phase: 'confirming'
		});
		expect(view?.toasts().at(-1)).toMatchObject({
			tone: 'info',
			message: m.devices_relay_command_queued({ relay: '1' })
		});
	});

	it('stops watching the relay once the page is gone', async () => {
		render(relayPage());
		navigated();
		await vi.advanceTimersByTimeAsync(0);
		expect(services.relays.getRelayData).toHaveBeenCalledTimes(1);

		view?.unmount();
		view = null;
		await vi.advanceTimersByTimeAsync(5 * 30_000);

		expect(services.relays.getRelayData).toHaveBeenCalledTimes(1);
	});

	it('reports a failed history load without leaving the display loading', async () => {
		services.relays.getRelayHistory.mockRejectedValue(new Error('down'));
		render(relayPage());
		navigated();
		await vi.advanceTimersByTimeAsync(0);

		expect(display?.loading).toBe(false);
		expect(view?.toasts().at(-1)).toMatchObject({
			tone: 'danger',
			message: m.devices_relay_history_load_failed()
		});
	});
});
