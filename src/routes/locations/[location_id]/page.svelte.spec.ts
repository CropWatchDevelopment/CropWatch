import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DevicePrimaryDataDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { getLocale } from '$lib/paraglide/runtime.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import LocationPage from './+page.svelte';
import { formatRelative } from './location-overview';

const { goto, page } = vi.hoisted(() => ({
	goto: vi.fn(),
	page: {
		url: new URL('http://localhost/locations/8'),
		params: {} as Record<string, string>,
		data: {}
	}
}));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/state', () => ({ page }));

// A 1×1 transparent PNG, served for every OpenStreetMap tile so the map renders
// without the network.
const BLANK_TILE = Uint8Array.from(
	atob(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
	),
	(char) => char.charCodeAt(0)
);

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
/** "x min ago" as the page words it, in the test browser's locale. */
const ago = (minutes: number) => formatRelative(minutesAgo(minutes), Date.now(), getLocale()) ?? '';

interface LocationInfo {
	location_id: number;
	name: string;
	created_at: string;
	description: string | null;
	group: string | null;
	lat: number | null;
	long: number | null;
	map_zoom: number | null;
}

const INFO: LocationInfo = {
	location_id: 8,
	name: 'Greenhouse A',
	created_at: '2026-04-01T00:00:00.000Z',
	description: 'South field',
	group: 'Farm',
	lat: null,
	long: null,
	map_zoom: null
};

/**
 * Pump: online, strong signal. Fan: offline, never heard by a gateway.
 * C3: never reported, signal unknown. Valve: online, signal as text.
 */
function fleet(): DevicePrimaryDataDto[] {
	return [
		{
			dev_eui: 'A1',
			name: 'Pump',
			created_at: minutesAgo(9000),
			last_data_updated_at: minutesAgo(5),
			upload_interval: 10,
			gateway_signals: [{ rssi: -90, snr: 6, last_update: minutesAgo(5) }],
			lat: 31.9148,
			long: 131.4233
		},
		{
			dev_eui: 'B2',
			name: 'Fan',
			created_at: minutesAgo(9000),
			last_data_updated_at: minutesAgo(200),
			upload_interval: '15',
			gateway_signals: [],
			lat: 0,
			long: 0
		},
		{ dev_eui: 'C3', created_at: minutesAgo(9000), group: ' ' },
		{
			dev_eui: 'D4',
			name: 'Valve',
			created_at: minutesAgo(9000),
			last_data_updated_at: minutesAgo(4),
			gateway_signals: [{ rssi: '-95', snr: '7', last_update: null }] as never,
			lat: '31.915',
			long: '131.424'
		}
	];
}

function stubLatestReadings(target: MockServices) {
	const latest: Record<string, Record<string, unknown> | null> = {
		A1: { created_at: minutesAgo(3), temperature_c: 21.46, humidity: 55.4, co2: 412.6 },
		B2: null,
		D4: { last_update: minutesAgo(2) }
	};
	target.dashboard.getDashboardDeviceLatest.mockImplementation(async (devEui) => {
		if (devEui in latest) return latest[devEui];
		throw new Error('not found');
	});
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	data: {
		allLocationDevices?: DevicePrimaryDataDto[];
		currentLocation?: string | null;
		locationInfo?: LocationInfo | null;
		hasSettings?: boolean;
	} = {},
	accessToken: string | null = 'jwt-token'
) {
	view = renderWithServices(LocationPage, {
		props: {
			data: {
				allLocationDevices: [],
				currentLocation: 'Greenhouse A',
				locationInfo: INFO,
				hasSettings: false,
				...data
			},
			params: { location_id: '8' }
		} as never,
		services,
		app: { accessToken: accessToken ?? undefined }
	});
	return view;
}

const text = () => (view?.target.textContent ?? '').replace(/\s+/g, ' ');
const byId = (id: string) => document.getElementById(id) as HTMLButtonElement;
const tableRows = () =>
	[...(view?.target.querySelectorAll('#location-table tbody tr') ?? [])].filter((row) =>
		row.querySelector('[id$="-view-button"]')
	);
const rowOrder = () =>
	tableRows().map((row) =>
		row.querySelector('[id$="-view-button"]')?.id.replace(/^location-row-|-view-button$/g, '')
	);
const cellsOf = (devEui: string) =>
	[...(byId(`location-row-${devEui}-view-button`).closest('tr')?.querySelectorAll('td') ?? [])].map(
		(cell) => cell.textContent?.replace(/\s+/g, ' ').trim()
	);
const kpi = (index: number) =>
	view?.target.querySelectorAll('.kpi')[index]?.textContent?.replace(/\s+/g, ' ').trim();
const chips = () =>
	[...(view?.target.querySelectorAll('.location-header__chips .location-chip') ?? [])].map((chip) =>
		chip.textContent?.replace(/\s+/g, ' ').trim()
	);
const eyebrow = () =>
	[...(view?.target.querySelectorAll('.location-header__eyebrow > span:not(.cw-icon)') ?? [])].map(
		(span) => span.textContent
	);

function sortBy(header: string) {
	const button = [...(view?.target.querySelectorAll('.cw-data-table__sort-btn') ?? [])].find(
		(candidate) => candidate.textContent?.trim() === header
	) as HTMLButtonElement | undefined;
	if (!button) throw new Error(`no sortable column "${header}"`);
	button.click();
}

/** Records and cancels full page loads, so the test page stays put. */
function interceptPageLoads() {
	const navigation = (window as unknown as { navigation: EventTarget }).navigation;
	const urls: string[] = [];
	const onNavigate = (event: Event) => {
		urls.push((event as Event & { destination: { url: string } }).destination.url);
		event.preventDefault();
	};
	navigation.addEventListener('navigate', onNavigate);
	return { urls, stop: () => navigation.removeEventListener('navigate', onNavigate) };
}

beforeEach(() => {
	services = createMockServices();
	page.url = new URL('http://localhost/locations/8');
	page.params = { location_id: '8' };
	const guardedFetch = globalThis.fetch;
	vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
		const url = input instanceof Request ? input.url : String(input);
		if (url.startsWith('https://tile.openstreetmap.org/')) {
			return Promise.resolve(
				new Response(BLANK_TILE, { status: 200, headers: { 'content-type': 'image/png' } })
			);
		}
		return guardedFetch(input, init);
	});
});

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('location page header', () => {
	it('names the location and lists its facts', () => {
		render();

		expect(view?.target.querySelector('.location-header__title')?.textContent).toBe('Greenhouse A');
		expect(eyebrow()).toEqual([m.nav_locations(), '/', 'Farm']);
		expect(chips()).toEqual([
			m.location_detail_no_coordinates(),
			m.location_detail_id({ id: '8' })
		]);
		// No devices: nothing reports, nothing to refresh.
		expect(view?.target.querySelector('.location-chip .dot')).toBeNull();
		expect(byId('location-refresh-button').disabled).toBe(true);
	});

	it("falls back to the name in the link, then to the location's id", () => {
		page.url = new URL('http://localhost/locations/8?location_name=%20Barn%20');
		render({ currentLocation: '  ', locationInfo: { ...INFO, group: null } });
		expect(view?.target.querySelector('.location-header__title')?.textContent).toBe('Barn');
		expect(eyebrow()).toEqual([m.nav_locations()]);
		view?.unmount();

		page.url = new URL('http://localhost/locations/8');
		render({ currentLocation: null });
		expect(view?.target.querySelector('.location-header__title')?.textContent).toBe(
			m.locations_location_with_id({ id: '8' })
		);
	});

	it('calls it the current location when the route has no id, and offers no actions', () => {
		page.params = {};
		render({ currentLocation: null, hasSettings: true });

		expect(view?.target.querySelector('.location-header__title')?.textContent).toBe(
			m.locations_current_location()
		);
		expect(document.getElementById('location-settings-button')).toBeNull();
		expect(document.getElementById('location-add-device-button')).toBeNull();
		expect(chips()).toEqual([m.location_detail_no_coordinates()]);
	});

	it('navigates back, to the settings and to adding a device', () => {
		render({ hasSettings: true });

		byId('location-back-button').click();
		byId('location-settings-button').click();
		byId('location-add-device-button').click();

		expect(goto.mock.calls).toEqual([
			['/'],
			['/locations/8/settings'],
			['/locations/8/devices/create']
		]);
	});

	it('goes back to where the user came from', () => {
		page.url = new URL('http://localhost/locations/8?backTo=/overview&filter=North');
		render();

		byId('location-back-button').click();

		expect(goto).toHaveBeenCalledWith('/overview?locationGroup=North');
	});

	it('hides the settings button from users who cannot manage the location', () => {
		render({ hasSettings: false });

		expect(document.getElementById('location-settings-button')).toBeNull();
		expect(document.getElementById('location-add-device-button')).not.toBeNull();
	});
});

describe('location page overview', () => {
	it('summarises the devices: KPIs, health ring and what needs attention', async () => {
		stubLatestReadings(services);
		render({ allLocationDevices: fleet() });

		// Valve has the newest reading once the latest rows arrive.
		await expect.poll(() => kpi(3)).toContain(ago(2));
		expect(text()).toContain(m.location_detail_reporting({ online: 2, total: 4 }));
		expect(view?.target.querySelector('.location-chip--success')).toBeNull();
		expect(kpi(0)).toBe(
			`${m.location_detail_kpi_devices()} 4 ${m.location_detail_kpi_devices_sub()}`
		);
		expect(kpi(1)).toBe(
			`${m.location_detail_kpi_online()} 2 ${m.location_detail_kpi_online_sub({ percent: 50 })}`
		);
		expect(kpi(2)).toBe(
			`${m.location_detail_kpi_attention()} 2 ${m.location_detail_kpi_attention_sub({ offline: 1, never: 1 })}`
		);
		expect(view?.target.querySelector('.kpi__value--danger')?.textContent?.trim()).toBe('2');
		expect(kpi(3)).toBe(`${m.location_detail_kpi_last_uplink()} ${ago(2)} Valve`);

		const arcs = [...(view?.target.querySelectorAll('.health-ring__arc') ?? [])].map((arc) => ({
			health: ['online', 'offline', 'never'].find((health) =>
				arc.classList.contains(`health-ring__arc--${health}`)
			),
			dash: arc.getAttribute('stroke-dasharray'),
			offset: arc.getAttribute('stroke-dashoffset')
		}));
		expect(arcs).toEqual([
			{ health: 'online', dash: '50 50', offset: '25' },
			{ health: 'offline', dash: '25 75', offset: '-25' },
			{ health: 'never', dash: '25 75', offset: '-50' }
		]);
		expect(view?.target.querySelector('.health-ring__value')?.textContent).toBe('50%');
		expect(
			[...(view?.target.querySelectorAll('.health__legend li') ?? [])].map((item) =>
				item.textContent?.replace(/\s+/g, ' ').trim()
			)
		).toEqual([
			`${m.status_online()} 2`,
			`${m.status_offline()} 1`,
			`${m.location_detail_health_never()} 1`
		]);

		const attention = [...(view?.target.querySelectorAll('.health__attention-list li') ?? [])];
		expect(
			attention.map((item) => item.querySelector('.attention-item__name')?.textContent)
		).toEqual(['Fan', 'C3']);
		expect(attention[0].classList.contains('attention-item--danger')).toBe(true);
		expect(attention[0].textContent).toContain(m.location_detail_offline_since({ when: ago(200) }));
		expect(attention[1].textContent).toContain(m.location_detail_never_reported_body());
		expect(attention[0].querySelector('a')?.getAttribute('href')).toBe(
			'/locations/8/devices/B2?location_id=8&location_name=Greenhouse+A&dev_eui=B2'
		);
	});

	it('celebrates a location where every device reports', async () => {
		services.dashboard.getDashboardDeviceLatest.mockResolvedValue(null);
		render({ allLocationDevices: [fleet()[0]] });

		await vi.waitFor(() => expect(text()).toContain(m.location_detail_all_healthy()));
		expect(view?.target.querySelector('.location-chip--success')).not.toBeNull();
		expect(kpi(2)).toBe(
			`${m.location_detail_kpi_attention()} 0 ${m.location_detail_kpi_attention_none()}`
		);
		expect(view?.target.querySelector('.kpi__value--danger')).toBeNull();
		// Only the online arc is drawn; the empty ones are skipped.
		expect(view?.target.querySelectorAll('.health-ring__arc')).toHaveLength(1);
	});

	it('says when the location has no devices yet', () => {
		render();

		expect(text()).toContain(m.location_detail_no_devices());
		expect(kpi(3)).toBe(
			`${m.location_detail_kpi_last_uplink()} — ${m.location_detail_kpi_last_uplink_none()}`
		);
		expect(services.dashboard.getDashboardDeviceLatest).not.toHaveBeenCalled();
	});

	it('shows the location details, with dashes for what is missing', () => {
		render();
		const details = () =>
			[...(view?.target.querySelectorAll('.details__list dd') ?? [])].map((dd) => dd.textContent);

		expect(details()).toEqual([
			'Greenhouse A',
			'Farm',
			'South field',
			new Date(INFO.created_at).toLocaleDateString(getLocale(), { dateStyle: 'medium' }),
			'—',
			'8'
		]);
		view?.unmount();

		render({ locationInfo: { ...INFO, group: null, description: null } });
		expect(details().slice(1, 3)).toEqual(['—', '—']);
		view?.unmount();

		render({ locationInfo: null });
		expect(text()).not.toContain(m.location_detail_details_title());
	});
});

describe('location page map', () => {
	it('maps the location and its positioned devices', async () => {
		render({
			allLocationDevices: fleet(),
			locationInfo: { ...INFO, lat: 31.9147, long: 131.4232, map_zoom: 15 }
		});

		expect(text()).toContain('31.9147, 131.4232');
		const mapsLink = view?.target.querySelector('a.button-link') as HTMLAnchorElement;
		expect(mapsLink.href).toBe('https://www.google.com/maps/search/?api=1&query=31.9147,131.4232');
		expect(mapsLink.target).toBe('_blank');
		expect(
			view?.target.querySelector(
				`[role="region"][aria-label="${m.location_detail_map_label({ name: 'Greenhouse A' })}"]`
			)
		).not.toBeNull();
		expect(view?.target.querySelector('.details__list dd.mono')?.textContent).toBe(
			'31.9147, 131.4232'
		);

		// Fan sits at 0,0 (unset) and C3 has no position: only Pump and Valve get pins.
		await expect
			.poll(() => view?.target.querySelectorAll('.location-map__device').length, { timeout: 10000 })
			.toBe(2);
		expect(
			[...(view?.target.querySelectorAll('.location-map__device') ?? [])].map((pin) =>
				pin.getAttribute('aria-label')
			)
		).toEqual(['Pump', 'Valve']);
	});

	it('redraws device pins as their health changes, and names them on hover', async () => {
		services.dashboard.getDashboardDeviceLatest.mockResolvedValue(null);
		render({
			allLocationDevices: [
				{
					dev_eui: 'P1',
					name: 'Pump',
					created_at: minutesAgo(9000),
					last_data_updated_at: minutesAgo(200),
					upload_interval: 10,
					lat: 31.9148,
					long: 131.4233
				}
			],
			locationInfo: { ...INFO, lat: 31.9147, long: 131.4232 }
		});
		const pin = () => view?.target.querySelector('.location-map__device') as HTMLElement | null;
		await expect.poll(pin, { timeout: 10000 }).not.toBeNull();
		expect(pin()?.classList.contains('location-map__device--offline')).toBe(true);

		pin()?.dispatchEvent(new MouseEvent('mouseenter'));
		await expect
			.poll(() => view?.target.querySelector('.maplibregl-popup-content')?.textContent)
			.toBe('Pump');
		pin()?.dispatchEvent(new MouseEvent('mouseleave'));
		await expect.poll(() => view?.target.querySelector('.maplibregl-popup')).toBeNull();

		services.dashboard.getDashboardDeviceLatest.mockResolvedValue({ created_at: minutesAgo(1) });
		byId('location-refresh-button').click();

		await expect.poll(() => pin()?.classList.contains('location-map__device--online')).toBe(true);
		expect(view?.target.querySelectorAll('.location-map__device')).toHaveLength(1);
	});

	it('treats 0,0 as no position', () => {
		render({ locationInfo: { ...INFO, lat: 0, long: 0 } });

		expect(text()).toContain(m.location_detail_no_coordinates_title());
		expect(text()).toContain(m.location_detail_no_coordinates_body());
		expect(view?.target.querySelector('.location-map')).toBeNull();
		expect(view?.target.querySelector('a.button-link')).toBeNull();
	});
});

describe('location page device table', () => {
	it('shows each device with its live status, readings and signal', async () => {
		stubLatestReadings(services);
		render({ allLocationDevices: fleet() });

		await expect.poll(() => cellsOf('A1')[2]).toBe('21.5 °C');
		expect(cellsOf('A1')).toEqual([
			m.status_online(),
			'Pump',
			'21.5 °C',
			'55 %',
			'413 ppm',
			ago(3),
			'',
			'A1',
			''
		]);
		expect(cellsOf('B2').slice(0, 7)).toEqual([
			m.status_offline(),
			'Fan',
			'—',
			'—',
			'—',
			ago(200),
			''
		]);
		expect(cellsOf('C3').slice(0, 7)).toEqual([
			m.location_detail_health_never(),
			'C3',
			'—',
			'—',
			'—',
			m.location_detail_never(),
			'—'
		]);
		const signal = (devEui: string) =>
			byId(`location-row-${devEui}-view-button`).closest('tr')?.querySelector('.signal-strength');
		expect(signal('A1')?.querySelectorAll('.signal-strength__bar--on')).toHaveLength(4);
		// Never heard by a gateway: empty bars with the "no" sign.
		expect(signal('B2')?.querySelector('.signal-strength__none')).not.toBeNull();
		expect(signal('C3')).toBeNull();
		expect(services.dashboard.getDashboardDeviceLatest).toHaveBeenCalledWith('C3');
	});

	it('filters by health with the status chips', async () => {
		stubLatestReadings(services);
		render({ allLocationDevices: fleet() });
		await expect.poll(rowOrder).toEqual(['A1', 'B2', 'C3', 'D4']);
		const chip = (label: string) =>
			[...(view?.target.querySelectorAll('.status-filter__chip') ?? [])].find(
				(candidate) => candidate.textContent?.trim() === label
			) as HTMLButtonElement;

		expect(chip(m.location_detail_filter_all({ count: 4 })).getAttribute('aria-pressed')).toBe(
			'true'
		);
		chip(m.location_detail_filter_offline({ count: 1 })).click();
		await expect.poll(rowOrder).toEqual(['B2']);
		expect(chip(m.location_detail_filter_offline({ count: 1 })).getAttribute('aria-pressed')).toBe(
			'true'
		);

		chip(m.location_detail_filter_never({ count: 1 })).click();
		await expect.poll(rowOrder).toEqual(['C3']);
		chip(m.location_detail_filter_online({ count: 2 })).click();
		await expect.poll(rowOrder).toEqual(['A1', 'D4']);
		chip(m.location_detail_filter_all({ count: 4 })).click();
		await expect.poll(rowOrder).toEqual(['A1', 'B2', 'C3', 'D4']);
	});

	it('searches by name or DevEUI', async () => {
		stubLatestReadings(services);
		render({ allLocationDevices: fleet() });
		await expect.poll(rowOrder).toHaveLength(4);
		const search = view?.target.querySelector(
			'.cw-data-table__search-wrapper input'
		) as HTMLInputElement;

		search.value = ' PUMP ';
		search.dispatchEvent(new Event('input', { bubbles: true }));
		await expect.poll(rowOrder).toEqual(['A1']);

		search.value = 'd4';
		search.dispatchEvent(new Event('input', { bubbles: true }));
		await expect.poll(rowOrder).toEqual(['D4']);
	});

	it('sorts by every column', async () => {
		stubLatestReadings(services);
		render({ allLocationDevices: fleet() });
		await expect.poll(() => cellsOf('A1')[2]).toBe('21.5 °C');

		const sorted = async (header: string, order: string[]) => {
			sortBy(header);
			await expect.poll(rowOrder).toEqual(order);
		};

		await sorted(m.devices_device_name(), ['C3', 'B2', 'A1', 'D4']);
		await sorted(m.devices_device_name(), ['D4', 'A1', 'B2', 'C3']);
		await sorted(m.devices_dev_eui_label(), ['A1', 'B2', 'C3', 'D4']);
		await sorted(m.devices_status(), ['C3', 'B2', 'A1', 'D4']);
		await sorted(m.location_detail_column_last_seen(), ['C3', 'B2', 'A1', 'D4']);
		await sorted(m.location_detail_column_temperature(), ['B2', 'C3', 'D4', 'A1']);
		await sorted(m.location_detail_column_humidity(), ['B2', 'C3', 'D4', 'A1']);
		await sorted(m.location_detail_column_co2(), ['B2', 'C3', 'D4', 'A1']);
		// Unknown first, then by bars (0 = never heard), then by RSSI.
		await sorted(m.gateways_signal(), ['C3', 'B2', 'D4', 'A1']);
	});

	it('opens a device in a full page load, and its settings in the app', async () => {
		stubLatestReadings(services);
		render({ allLocationDevices: fleet(), hasSettings: true });
		await expect.poll(rowOrder).toHaveLength(4);
		const pageLoads = interceptPageLoads();

		try {
			byId('location-row-A1-view-button').click();
			await expect.poll(() => pageLoads.urls).toHaveLength(1);
		} finally {
			pageLoads.stop();
		}
		expect(pageLoads.urls[0]).toBe(
			`${window.location.origin}/locations/8/devices/A1?location_id=8&location_name=Greenhouse+A&dev_eui=A1`
		);

		byId('location-row-B2-settings-button').click();
		expect(goto).toHaveBeenCalledWith('/locations/8/devices/B2/settings');
	});

	it('offers device settings only to managers, and only with a location id', async () => {
		stubLatestReadings(services);
		render({ allLocationDevices: fleet() });
		await expect.poll(rowOrder).toHaveLength(4);
		expect(document.getElementById('location-row-A1-settings-button')).toBeNull();
		view?.unmount();

		// Only online devices: the attention list links need the id to resolve.
		page.params = {};
		render({ allLocationDevices: [fleet()[0]], hasSettings: true });
		await expect.poll(rowOrder).toHaveLength(1);
		byId('location-row-A1-settings-button').click();
		expect(goto).not.toHaveBeenCalled();
	});
});

describe('location page live data', () => {
	it('refreshes every device on demand, showing progress', async () => {
		stubLatestReadings(services);
		render({ allLocationDevices: fleet() });
		const latest = services.dashboard.getDashboardDeviceLatest;
		// Each device's reading is loaded once on start.
		expect(latest.mock.calls.map(([devEui]) => devEui)).toEqual(['A1', 'B2', 'C3', 'D4']);
		latest.mockClear();
		const pending: (() => void)[] = [];
		latest.mockImplementation(
			() => new Promise((resolve) => pending.push(() => resolve({ created_at: minutesAgo(1) })))
		);

		byId('location-refresh-button').click();
		flushSync();

		expect(byId('location-refresh-button').getAttribute('aria-busy')).toBe('true');
		expect(latest.mock.calls.map(([devEui]) => devEui)).toEqual(['A1', 'B2', 'C3', 'D4']);
		for (const release of pending) release();
		await vi.waitFor(() =>
			expect(byId('location-refresh-button').getAttribute('aria-busy')).toBeNull()
		);
		expect(cellsOf('C3')[5]).toBe(ago(1));
	});

	it('loads no readings without a session', async () => {
		render({ allLocationDevices: fleet() }, null);

		byId('location-refresh-button').click();
		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(services.dashboard.getDashboardDeviceLatest).not.toHaveBeenCalled();
		expect(cellsOf('A1')[2]).toBe('—');
	});

	it('keeps "last seen" current as time passes', async () => {
		vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
		services.dashboard.getDashboardDeviceLatest.mockResolvedValue(null);
		render({ allLocationDevices: [fleet()[0]] });
		await vi.waitFor(() => expect(cellsOf('A1')[5]).toBe(ago(5)));

		// The page re-reads the clock every 30 s: three minutes on, the reading is 8 minutes old.
		vi.advanceTimersByTime(3 * 60_000);
		flushSync();

		expect(cellsOf('A1')[5]).toBe(ago(8));
	});
});
