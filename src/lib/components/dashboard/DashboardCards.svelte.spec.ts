import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatCwNumber } from '@cropwatchdevelopment/cwui';
import type {
	DashboardLocationGroup,
	DashboardLocationPage,
	DashboardRow,
	PreferencesDto
} from '$lib/api/api.dtos';
import { formatDateTime } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { labelFor } from '$lib/sensor-labels';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import { formatSensorMeasurement } from '$lib/units';
import DashboardCards from './DashboardCards.svelte';

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
const MINUTE = 60_000;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

/** A device seen a minute ago: the refresh scheduler leaves it alone during a test. */
function row(overrides: Partial<DashboardRow> = {}): DashboardRow {
	const seen = ago(MINUTE);
	return {
		dev_eui: 'DEV-1',
		name: 'Greenhouse probe',
		group: null,
		upload_interval: 10,
		last_data_updated_at: seen,
		error_status: null,
		device_type: {
			id: 1,
			name: 'Soil',
			data_table_v2: 'cw_soil_data',
			primary_data_v2: 'temperature_c',
			secondary_data_v2: 'moisture',
			default_upload_interval: 10
		},
		location: { location_id: 8, name: 'North field', group: 'Farm' },
		latest: { created_at: seen, primary: 21.5, secondary: 40 },
		...overrides
	};
}

function group(
	key: string,
	devices: DashboardRow[],
	name: string | null = key
): DashboardLocationGroup {
	return {
		key,
		location:
			name === null
				? null
				: { location_id: Number(key.replace(/\D/g, '')) || 8, name, group: null },
		devices
	};
}

function locationsPage(
	groups: DashboardLocationGroup[],
	total = groups.length
): DashboardLocationPage {
	return { groups, total, skip: 0, take: 20 };
}

const query = (overrides: Record<string, unknown> = {}) => ({
	skip: 0,
	take: 20,
	group: undefined,
	locationGroup: undefined,
	location: undefined,
	name: undefined,
	...overrides
});

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;
let consoleError: ReturnType<typeof vi.spyOn>;

function render(
	options: {
		filters?: Filters;
		accessToken?: string | null;
		preferences?: PreferencesDto;
		cardLayout?: 'grid' | 'masonry';
	} = {}
) {
	const props: Record<string, unknown> = { filters: options.filters ?? NO_FILTERS };
	if (options.cardLayout) props.cardLayout = options.cardLayout;
	view = renderWithServices(DashboardCards, {
		props: props as never,
		services,
		app: {
			accessToken: options.accessToken === null ? undefined : (options.accessToken ?? 'jwt-token'),
			preferences: options.preferences
		}
	});
	return view;
}

const getLocations = () => services.dashboard.getDashboardLocations;
const getLatest = () => services.dashboard.getDashboardDeviceLatest;
const root = () => view!.target;
const text = () => root().textContent ?? '';
const normalize = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
const locationCards = () => [...root().querySelectorAll('.dashboard-cards__location')];
const titles = () =>
	locationCards().map((card) =>
		card.querySelector('.cw-location-card__title')?.textContent?.trim()
	);
const sensorCards = () => [...root().querySelectorAll('.cw-sensor-card')];
const sensorNamed = (label: string) =>
	sensorCards().find(
		(card) => card.querySelector('.cw-sensor-card__label')?.textContent?.trim() === label
	) ?? null;
const stats = (card: Element | null) =>
	[...(card?.querySelectorAll('.cw-sensor-card__stat') ?? [])].map((stat) => [
		stat.querySelector('.cw-sensor-card__stat-value')?.textContent?.trim(),
		stat.querySelector('.cw-sensor-card__stat-unit')?.textContent?.trim() ?? null
	]);
const detailRows = (card: Element | null) =>
	[...(card?.querySelectorAll('.dashboard-cards__details-row') ?? [])].map((detail) => [
		detail.querySelector('dt')?.textContent?.trim(),
		normalize(detail.querySelector('dd')?.textContent)
	]);
const expand = (card: Element | null) => {
	card?.querySelector<HTMLButtonElement>('.cw-expand__header')?.click();
	flushSync();
};
const loadMoreButton = () =>
	root().querySelector<HTMLButtonElement>('.dashboard-cards__pager button');
const detailsButton = (card: Element | null) =>
	[
		...(card?.querySelectorAll<HTMLButtonElement>('.dashboard-cards__details-list + span button') ??
			[])
	].find((button) => button.textContent?.trim() === m.common_details()) ?? null;

beforeEach(() => {
	services = createMockServices();
	getLatest().mockResolvedValue(null);
	localStorage.clear();
	consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
	consoleError.mockRestore();
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('DashboardCards loading', () => {
	it('shows a spinner until the first page arrives, then one card per location', async () => {
		let answer!: (page: DashboardLocationPage) => void;
		getLocations().mockReturnValue(new Promise((resolve) => (answer = resolve)));

		render();

		await expect.poll(() => root().querySelector('.dashboard-cards__loading')).not.toBeNull();
		expect(getLocations()).toHaveBeenCalledWith(query());

		answer(
			locationsPage([
				group('loc-8', [row()], 'North field'),
				group('unassigned', [row({ dev_eui: 'DEV-2', name: 'Loose sensor', location: null })], null)
			])
		);

		await expect.poll(titles).toEqual(['North field', m.dashboard_no_location()]);
		expect(root().querySelector('.dashboard-cards__loading')).toBeNull();
		expect(sensorNamed('Greenhouse probe')).not.toBeNull();
		expect(sensorNamed('Loose sensor')).not.toBeNull();
	});

	it("renders each device's readings in the user's units", async () => {
		getLocations().mockResolvedValue(
			locationsPage([
				group('loc-8', [
					row(),
					row({
						dev_eui: 'DEV-CO2',
						name: 'Office air',
						device_type: {
							...row().device_type,
							primary_data_v2: 'co2',
							secondary_data_v2: 'relay_1'
						},
						latest: { created_at: ago(MINUTE), primary: 455, secondary: true }
					})
				])
			])
		);

		render({ preferences: FAHRENHEIT });

		await expect.poll(() => sensorNamed('Office air')).not.toBeNull();
		const temperature = formatSensorMeasurement('temperature_c', 21.5, FAHRENHEIT);
		const moisture = formatSensorMeasurement('moisture', 40, FAHRENHEIT);
		expect(stats(sensorNamed('Greenhouse probe'))).toEqual([
			[formatCwNumber(temperature.value, { decimals: 2, locale: 'en-US' }), temperature.unit],
			[formatCwNumber(moisture.value, { decimals: 2, locale: 'en-US' }), moisture.unit]
		]);
		// Integer metrics keep their own formatting; booleans read On/Off without a unit.
		expect(stats(sensorNamed('Office air'))).toEqual([
			[formatSensorMeasurement('co2', 455).valueDisplay, 'ppm'],
			[m.sensor_value_on(), '']
		]);
		expect(sensorNamed('Greenhouse probe')?.className).toContain('cw-sensor-card__slot--online');
	});

	it('marks devices without data as loading and devices reporting a fault as errors', async () => {
		getLocations().mockResolvedValue(
			locationsPage([
				group('loc-8', [
					row({
						dev_eui: 'DEV-NEW',
						name: 'New sensor',
						latest: null,
						last_data_updated_at: ago(MINUTE)
					}),
					row({ dev_eui: 'DEV-ERR', name: 'Faulty sensor', error_status: '-55' }),
					row({ dev_eui: 'DEV-OK', name: 'Blank status', error_status: '   ' })
				])
			])
		);

		render();

		await expect.poll(() => sensorCards().length).toBe(3);
		expect(sensorNamed('New sensor')?.className).toContain('cw-sensor-card__slot--loading');
		expect(
			sensorNamed('Faulty sensor')?.querySelector('.cw-sensor-card__error-text')?.textContent
		).toBe(m.dashboard_sensor_error());
		expect(sensorNamed('Blank status')?.querySelector('.cw-sensor-card__error')).toBeNull();
	});

	it('shows no reading for columns that are unset or hidden', async () => {
		getLocations().mockResolvedValue(
			locationsPage([
				group('loc-8', [
					row({
						name: 'Unset columns',
						device_type: { ...row().device_type, primary_data_v2: '-', secondary_data_v2: '' }
					}),
					row({
						dev_eui: 'DEV-B',
						name: 'Battery only',
						device_type: {
							...row().device_type,
							primary_data_v2: 'battery',
							secondary_data_v2: 'battery'
						}
					})
				])
			])
		);

		render();

		await expect.poll(() => sensorCards().length).toBe(2);
		for (const name of ['Unset columns', 'Battery only']) {
			// The primary slot shows the empty value and no unit; the secondary slot is left out.
			expect(stats(sensorNamed(name))).toEqual([['—', null]]);
		}
	});

	it('says so when there are no devices', async () => {
		getLocations().mockResolvedValue(locationsPage([]));

		render();

		await expect
			.poll(() => root().querySelector('.dashboard-cards__empty')?.textContent)
			.toBe(m.dashboard_no_devices());
	});

	it('logs a failed load and shows the empty state', async () => {
		const failure = new Error('API down');
		getLocations().mockRejectedValue(failure);

		render();

		await expect.poll(() => text()).toContain(m.dashboard_no_devices());
		expect(consoleError).toHaveBeenCalledWith('Failed to load dashboard page', failure);
	});

	it('waits for the session token instead of loading an empty dashboard', async () => {
		getLocations().mockResolvedValue(locationsPage([group('loc-8', [row()])]));
		render({ accessToken: null });
		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(getLocations()).not.toHaveBeenCalled();
		expect(root().querySelector('.dashboard-cards__loading')).not.toBeNull();

		view!.app.accessToken = 'jwt-token';

		await expect.poll(() => sensorNamed('Greenhouse probe')).not.toBeNull();
		expect(getLocations()).toHaveBeenCalledTimes(1);
	});

	it.each(['grid', 'masonry'] as const)('lays the cards out as a %s', async (cardLayout) => {
		getLocations().mockResolvedValue(locationsPage([group('loc-8', [row()])]));

		render({ cardLayout });

		await expect
			.poll(() => root().querySelector(`.dashboard-cards__groups--${cardLayout}`))
			.not.toBeNull();
	});
});

describe('DashboardCards filters and paging', () => {
	it('asks the API for the filtered locations', async () => {
		getLocations().mockResolvedValue(locationsPage([group('loc-8', [row()])]));

		render({ filters: { group: 'pumps', locationGroup: 'Farm', location: '8', name: 'probe' } });

		await expect.poll(() => getLocations().mock.calls.length).toBe(1);
		expect(getLocations()).toHaveBeenCalledWith(
			query({ group: 'pumps', locationGroup: 'Farm', location: '8', name: 'probe' })
		);
	});

	it('reloads from the first page when the filters change', async () => {
		getLocations().mockResolvedValue(locationsPage([group('loc-8', [row()])]));
		const props = $state({ filters: NO_FILTERS });
		view = renderWithServices(DashboardCards, { props, services, app: { accessToken: 'jwt' } });
		await expect.poll(() => sensorCards().length).toBe(1);

		props.filters = { ...NO_FILTERS, name: 'probe' };

		await expect.poll(() => getLocations().mock.calls.at(-1)).toEqual([query({ name: 'probe' })]);
	});

	it('loads more locations on demand and appends them', async () => {
		getLocations()
			.mockResolvedValueOnce(locationsPage([group('loc-8', [row()], 'North field')], 2))
			.mockResolvedValueOnce(
				locationsPage([group('loc-9', [row({ dev_eui: 'DEV-9', name: 'Barn probe' })], 'Barn')], 2)
			);
		render();
		await expect.poll(() => loadMoreButton()?.textContent?.trim()).toBe(m.dashboard_load_more());

		loadMoreButton()?.click();

		await expect.poll(titles).toEqual(['North field', 'Barn']);
		expect(getLocations()).toHaveBeenLastCalledWith(query({ skip: 1 }));
		expect(loadMoreButton()).toBeNull();
	});

	it('ignores "load more" while a page is still loading', async () => {
		let answer!: (page: DashboardLocationPage) => void;
		getLocations()
			.mockResolvedValueOnce(locationsPage([group('loc-8', [row()])], 5))
			.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
		render();
		await expect.poll(() => loadMoreButton()).not.toBeNull();

		loadMoreButton()?.click();
		flushSync();
		expect(loadMoreButton()?.textContent?.trim()).toBe('…');
		loadMoreButton()?.click();
		flushSync();

		expect(getLocations()).toHaveBeenCalledTimes(2);
		answer(locationsPage([], 5));
		await expect.poll(() => loadMoreButton()?.textContent?.trim()).toBe(m.dashboard_load_more());
	});
});

describe('DashboardCards navigation', () => {
	it('opens a location with a way back to the dashboard', async () => {
		getLocations().mockResolvedValue(locationsPage([group('loc-8', [row()], 'North field')]));
		render({ filters: { ...NO_FILTERS, locationGroup: 'Farm' } });
		await expect.poll(titles).toEqual(['North field']);

		root()
			.querySelector<HTMLButtonElement>(
				`button[aria-label="${m.cwui_location_view({ name: 'North field' })}"]`
			)
			?.click();

		expect(goto).toHaveBeenCalledWith('/locations/8?backTo=%2F&filter=Farm');
	});

	it('does not open the "no location" group', async () => {
		getLocations().mockResolvedValue(
			locationsPage([group('none', [row({ location: null })], null)])
		);
		render();
		await expect.poll(titles).toEqual([m.dashboard_no_location()]);

		root().querySelector<HTMLButtonElement>('.cw-location-card__nav-action')?.click();

		expect(goto).not.toHaveBeenCalled();
	});

	it("opens a device's page from its details", async () => {
		getLocations().mockResolvedValue(locationsPage([group('loc-8', [row()])]));
		getLatest().mockResolvedValue({ created_at: ago(MINUTE), temperature_c: 20 });
		render();
		await expect.poll(() => sensorNamed('Greenhouse probe')).not.toBeNull();
		expand(sensorNamed('Greenhouse probe'));
		await expect.poll(() => detailsButton(sensorNamed('Greenhouse probe'))).not.toBeNull();

		detailsButton(sensorNamed('Greenhouse probe'))?.click();

		expect(goto).toHaveBeenCalledWith('/locations/8/devices/DEV-1?backTo=%2F');
	});

	it('carries the location-group filter to the device page', async () => {
		getLocations().mockResolvedValue(locationsPage([group('loc-8', [row()])]));
		getLatest().mockResolvedValue({ created_at: ago(MINUTE), temperature_c: 20 });
		render({ filters: { ...NO_FILTERS, locationGroup: 'North Farm' } });
		await expect.poll(() => sensorNamed('Greenhouse probe')).not.toBeNull();
		expand(sensorNamed('Greenhouse probe'));
		await expect.poll(() => detailsButton(sensorNamed('Greenhouse probe'))).not.toBeNull();

		detailsButton(sensorNamed('Greenhouse probe'))?.click();

		expect(goto).toHaveBeenCalledWith('/locations/8/devices/DEV-1?backTo=%2F&filter=North+Farm');
	});

	/** The probe's card, opened, with its details loaded. */
	async function openProbeDetails(total = 1) {
		getLocations().mockResolvedValue(locationsPage([group('loc-8', [row()])], total));
		getLatest().mockResolvedValue({ created_at: ago(MINUTE), temperature_c: 20 });
		render();
		await expect.poll(() => sensorNamed('Greenhouse probe')).not.toBeNull();
		expand(sensorNamed('Greenhouse probe'));
		await expect.poll(() => detailsButton(sensorNamed('Greenhouse probe'))).not.toBeNull();
		return () => detailsButton(sensorNamed('Greenhouse probe'));
	}

	it('is busy while the device page opens, and free again once the navigation is over', async () => {
		// E.g. a navigation another one replaced, or one the next page cancelled:
		// the dashboard is still on screen and must not stay stuck loading.
		let arrive!: () => void;
		goto.mockReturnValue(new Promise<void>((resolve) => (arrive = resolve)));
		const details = await openProbeDetails(2);

		details()?.click();
		flushSync();
		expect(details()?.getAttribute('aria-busy')).toBe('true');
		expect(loadMoreButton()?.textContent?.trim()).toBe('…');

		arrive();
		await expect.poll(() => details()?.getAttribute('aria-busy')).toBeNull();
		expect(details()?.disabled).toBe(false);
		// "Load more" works again.
		getLocations().mockResolvedValue(
			locationsPage([group('loc-9', [row({ dev_eui: 'DEV-9', name: 'Barn probe' })], 'Barn')], 2)
		);
		loadMoreButton()?.click();
		await expect.poll(titles).toEqual(['loc-8', 'Barn']);
	});

	it('is free again when opening the device page fails', async () => {
		const failure = new Error('navigation failed');
		goto.mockRejectedValue(failure);
		// The failure is not swallowed; collect it so it does not fail the run.
		const unhandled: unknown[] = [];
		const collect = (event: PromiseRejectionEvent) => {
			unhandled.push(event.reason);
			event.preventDefault();
		};
		window.addEventListener('unhandledrejection', collect);
		try {
			const details = await openProbeDetails();

			details()?.click();

			await expect.poll(() => details()?.getAttribute('aria-busy')).toBeNull();
			expect(details()?.disabled).toBe(false);
			await expect.poll(() => unhandled).toEqual([failure]);
		} finally {
			window.removeEventListener('unhandledrejection', collect);
		}
	});

	it('warns instead of navigating for a device without a location', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		getLocations().mockResolvedValue(
			locationsPage([group('none', [row({ dev_eui: 'DEV-X', location: null })], null)])
		);
		getLatest().mockResolvedValue({ created_at: ago(MINUTE), temperature_c: 20 });
		render();
		await expect.poll(() => sensorNamed('Greenhouse probe')).not.toBeNull();
		expand(sensorNamed('Greenhouse probe'));
		await expect.poll(() => detailsButton(sensorNamed('Greenhouse probe'))).not.toBeNull();

		detailsButton(sensorNamed('Greenhouse probe'))?.click();

		expect(goto).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalledWith('Device has no location, cannot go to details', {
			devEui: 'DEV-X'
		});
	});
});

describe('DashboardCards details', () => {
	it("loads a device's latest readings when its card is opened, once", async () => {
		const seen = ago(MINUTE);
		let answer!: (latest: Record<string, unknown>) => void;
		getLocations().mockResolvedValue(
			locationsPage([group('loc-8', [row({ last_data_updated_at: seen })])])
		);
		getLatest().mockReturnValue(new Promise((resolve) => (answer = resolve)));
		render();
		await expect.poll(() => sensorNamed('Greenhouse probe')).not.toBeNull();
		const card = () => sensorNamed('Greenhouse probe');

		expand(card());

		expect(getLatest()).toHaveBeenCalledWith('DEV-1');
		expect(card()?.textContent).toContain(m.dashboard_loading_details());

		answer({
			created_at: seen,
			temperature_c: 21.5,
			moisture: 40,
			battery: 90,
			ec: null,
			traffic_hour: '2026-10-21T09:00:00.000Z'
		});

		await expect.poll(() => detailRows(card()).length).toBe(4);
		expect(detailRows(card())).toEqual([
			[
				labelFor('temperature_c').label(),
				normalize(`${formatSensorMeasurement('temperature_c', 21.5).valueDisplay} °C`)
			],
			[
				labelFor('moisture').label(),
				normalize(`${formatSensorMeasurement('moisture', 40).valueDisplay} %`)
			],
			[
				labelFor('traffic_hour').label(),
				formatDateTime(
					'2026-10-21T09:00:00.000Z',
					{ month: 'short', day: 'numeric', hour: 'numeric' },
					'2026-10-21T09:00:00.000Z'
				)
			],
			[m.dashboard_column_last_seen(), expect.any(String)]
		]);
		expect(detailsButton(card())).not.toBeNull();
		// Not an air sensor: no "add note for today" dialog.
		expect(card()?.textContent).not.toContain(m.display_add_note_today_title());

		expand(card());
		expand(card());
		expect(getLatest()).toHaveBeenCalledTimes(1);
	});

	it('says when a device has no data yet', async () => {
		getLocations().mockResolvedValue(locationsPage([group('loc-8', [row()])]));
		getLatest().mockResolvedValue(null);
		render();
		await expect.poll(() => sensorNamed('Greenhouse probe')).not.toBeNull();

		expand(sensorNamed('Greenhouse probe'));

		await expect
			.poll(() => sensorNamed('Greenhouse probe')?.textContent)
			.toContain(m.dashboard_no_data_yet());
	});

	it('leaves out the last-seen row for a device that was never seen', async () => {
		getLocations().mockResolvedValue(
			locationsPage([
				group('loc-8', [
					row({
						last_data_updated_at: null,
						latest: { created_at: null, primary: 1, secondary: 2 }
					})
				])
			])
		);
		getLatest().mockResolvedValue({ temperature_c: 20 });
		render();
		await expect.poll(() => sensorNamed('Greenhouse probe')).not.toBeNull();

		expand(sensorNamed('Greenhouse probe'));

		await expect.poll(() => detailRows(sensorNamed('Greenhouse probe')).length).toBe(1);
		expect(detailRows(sensorNamed('Greenhouse probe'))[0][0]).toBe(
			labelFor('temperature_c').label()
		);
	});

	it('offers a note for today on air sensors', async () => {
		getLocations().mockResolvedValue(
			locationsPage([
				group('loc-8', [
					row({ device_type: { ...row().device_type, data_table_v2: 'cw_air_data' } })
				])
			])
		);
		getLatest().mockResolvedValue({ created_at: ago(MINUTE), temperature_c: 20 });
		render();
		await expect.poll(() => sensorNamed('Greenhouse probe')).not.toBeNull();

		expand(sensorNamed('Greenhouse probe'));

		await expect
			.poll(() => sensorNamed('Greenhouse probe')?.textContent)
			.toContain(m.display_add_note_today_title());
	});

	it('logs a failed lookup and tries again the next time the card opens', async () => {
		const failure = new Error('lookup failed');
		getLocations().mockResolvedValue(locationsPage([group('loc-8', [row()])]));
		getLatest()
			.mockRejectedValueOnce(failure)
			.mockResolvedValueOnce({ created_at: ago(MINUTE), temperature_c: 20 });
		render();
		await expect.poll(() => sensorNamed('Greenhouse probe')).not.toBeNull();
		const card = () => sensorNamed('Greenhouse probe');

		expand(card());
		await vi.waitFor(() =>
			expect(consoleError).toHaveBeenCalledWith('Failed to load details for DEV-1', failure)
		);
		expect(card()?.textContent).toContain(m.dashboard_loading_details());

		expand(card());
		expand(card());

		await expect.poll(() => detailRows(card()).length).toBe(2);
		expect(getLatest()).toHaveBeenCalledTimes(2);
	});

	it('loads details up front for cards the user left open', async () => {
		localStorage.setItem('cw-sensor-card-expand:dashboard:DEV-1', 'true');
		getLocations().mockResolvedValue(
			locationsPage([group('loc-8', [row(), row({ dev_eui: 'DEV-2', name: 'Closed card' })])])
		);
		getLatest().mockResolvedValue({ created_at: ago(MINUTE), temperature_c: 19 });

		render();

		await expect.poll(() => detailRows(sensorNamed('Greenhouse probe')).length).toBe(2);
		expect(getLatest()).toHaveBeenCalledTimes(1);
		expect(getLatest()).toHaveBeenCalledWith('DEV-1');
	});
});

describe('DashboardCards refresh on return', () => {
	it('re-reads the loaded locations and patches each device in place', async () => {
		const later = ago(0);
		getLocations()
			.mockResolvedValueOnce(
				locationsPage(
					[group('loc-8', [row(), row({ dev_eui: 'DEV-2', name: 'Second probe' })], 'North field')],
					3
				)
			)
			.mockResolvedValueOnce(
				locationsPage(
					[
						group('loc-8', [
							row({
								dev_eui: 'DEV-2',
								name: 'Renamed',
								error_status: '-55',
								latest: { created_at: later, primary: 5, secondary: 6 }
							}),
							row({
								dev_eui: 'DEV-1',
								last_data_updated_at: later,
								upload_interval: 30,
								latest: { created_at: later, primary: 30, secondary: 50 }
							}),
							row({ dev_eui: 'DEV-NEW', name: 'Not shown' })
						])
					],
					1
				)
			);
		render();
		await expect.poll(() => sensorCards().length).toBe(2);
		expect(loadMoreButton()).not.toBeNull();

		window.dispatchEvent(new Event('focus'));

		await expect.poll(() => getLocations().mock.calls.length).toBe(2);
		expect(getLocations()).toHaveBeenLastCalledWith(query({ take: 20 }));
		await expect
			.poll(() => stats(sensorNamed('Greenhouse probe'))[0]?.[0])
			.toBe(formatCwNumber(30, { decimals: 2, locale: 'en-US' }));
		// Same cards in the same order: names and positions are not re-read.
		expect(
			sensorCards().map((card) => card.querySelector('.cw-sensor-card__label')?.textContent?.trim())
		).toEqual(['Greenhouse probe', 'Second probe']);
		expect(
			sensorNamed('Second probe')?.querySelector('.cw-sensor-card__error-text')?.textContent
		).toBe(m.dashboard_sensor_error());
		expect(loadMoreButton()).toBeNull();
		expect(root().querySelector('.dashboard-cards__overlay')).toBeNull();
	});

	it('covers the cards with a loading overlay while the refresh runs', async () => {
		let answer!: (page: DashboardLocationPage) => void;
		getLocations()
			.mockResolvedValueOnce(locationsPage([group('loc-8', [row()])]))
			.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
		render();
		await expect.poll(() => sensorCards().length).toBe(1);

		window.dispatchEvent(new Event('focus'));

		await expect
			.poll(() => root().querySelector('.dashboard-cards__overlay')?.textContent)
			.toContain(m.dashboard_loading_devices());
		expect(root().querySelector('.dashboard-cards__scroll')?.getAttribute('aria-busy')).toBe(
			'true'
		);
		answer(locationsPage([group('loc-8', [row()])]));
		await expect.poll(() => root().querySelector('.dashboard-cards__overlay')).toBeNull();
	});

	it('refreshes at least a full page', async () => {
		const groups = Array.from({ length: 21 }, (_, index) =>
			group(`loc-${index + 1}`, [row({ dev_eui: `DEV-${index}`, name: `Probe ${index}` })])
		);
		getLocations().mockResolvedValue(locationsPage(groups, 21));
		render();
		await expect.poll(() => locationCards().length).toBe(21);

		window.dispatchEvent(new Event('focus'));

		await expect.poll(() => getLocations().mock.calls.length).toBe(2);
		expect(getLocations()).toHaveBeenLastCalledWith(query({ take: 21 }));
	});

	it('skips the refresh when nothing is loaded', async () => {
		getLocations().mockResolvedValue(locationsPage([]));
		render();
		await expect.poll(() => text()).toContain(m.dashboard_no_devices());

		window.dispatchEvent(new Event('focus'));
		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(getLocations()).toHaveBeenCalledTimes(1);
	});

	it('logs a failed refresh and keeps the cards', async () => {
		const failure = new Error('refresh failed');
		getLocations()
			.mockResolvedValueOnce(locationsPage([group('loc-8', [row()])]))
			.mockRejectedValueOnce(failure);
		render();
		await expect.poll(() => sensorCards().length).toBe(1);

		window.dispatchEvent(new Event('focus'));

		await vi.waitFor(() =>
			expect(consoleError).toHaveBeenCalledWith('Failed to refresh dashboard', failure)
		);
		expect(sensorCards()).toHaveLength(1);
		await expect.poll(() => root().querySelector('.dashboard-cards__overlay')).toBeNull();
	});

	it('stops listening once the dashboard is gone', async () => {
		getLocations().mockResolvedValue(locationsPage([group('loc-8', [row()])]));
		render();
		await expect.poll(() => sensorCards().length).toBe(1);

		view!.unmount();
		view = null;
		window.dispatchEvent(new Event('focus'));
		await new Promise((resolve) => setTimeout(resolve, 20));

		expect(getLocations()).toHaveBeenCalledTimes(1);
	});
});

describe('DashboardCards per-device refresh', () => {
	/** A device whose upload window has long passed: the scheduler refetches it at once. */
	const stale = (overrides: Partial<DashboardRow> = {}) => {
		const seen = ago(120 * MINUTE);
		return row({
			last_data_updated_at: seen,
			latest: { created_at: seen, primary: 10, secondary: 20 },
			...overrides
		});
	};

	beforeEach(() => {
		// No jitter: the overdue fetch is scheduled for "now".
		vi.spyOn(Math, 'random').mockReturnValue(0);
	});

	it('refetches an overdue device and patches its card from the latest row', async () => {
		const fresh = ago(0);
		getLocations().mockResolvedValue(locationsPage([group('loc-8', [stale()])]));
		getLatest().mockResolvedValue({ created_at: fresh, temperature_c: 25, moisture: 55 });

		render();

		await expect
			.poll(() => stats(sensorNamed('Greenhouse probe')))
			.toEqual([
				[formatCwNumber(25, { decimals: 2, locale: 'en-US' }), '°C'],
				[formatCwNumber(55, { decimals: 2, locale: 'en-US' }), '%']
			]);
		expect(getLatest()).toHaveBeenCalledWith('DEV-1');
	});

	it('reads missing columns of the latest row as no reading', async () => {
		getLocations().mockResolvedValue(
			locationsPage([
				group('loc-8', [
					stale({
						device_type: {
							...row().device_type,
							primary_data_v2: 'temperature_c',
							secondary_data_v2: '-'
						}
					})
				])
			])
		);
		getLatest().mockResolvedValue({ created_at: ago(0), moisture: 55 });

		render();

		await vi.waitFor(() => expect(getLatest()).toHaveBeenCalled());
		await expect.poll(() => stats(sensorNamed('Greenhouse probe'))).toEqual([['—', null]]);
	});

	it('keeps an open details panel in step with the refetched row', async () => {
		localStorage.setItem('cw-sensor-card-expand:dashboard:DEV-1', 'true');
		getLocations().mockResolvedValue(locationsPage([group('loc-8', [stale()])]));
		getLatest()
			.mockResolvedValueOnce({ created_at: ago(120 * MINUTE), temperature_c: 10 })
			.mockResolvedValueOnce({ created_at: ago(0), temperature_c: 26, moisture: 61 });

		render();

		await expect.poll(() => getLatest().mock.calls.length).toBe(2);
		await expect
			.poll(() => detailRows(sensorNamed('Greenhouse probe')).map(([label]) => label))
			.toEqual([
				labelFor('temperature_c').label(),
				labelFor('moisture').label(),
				m.dashboard_column_last_seen()
			]);
	});

	it('leaves the card alone when the device has nothing newer', async () => {
		getLocations().mockResolvedValue(locationsPage([group('loc-8', [stale()])]));
		getLatest().mockResolvedValue(null);

		render();

		await vi.waitFor(() => expect(getLatest()).toHaveBeenCalledWith('DEV-1'));
		expect(stats(sensorNamed('Greenhouse probe'))[0]?.[0]).toBe(
			formatCwNumber(10, { decimals: 2, locale: 'en-US' })
		);
	});

	it('does not refetch once the session is gone', async () => {
		let answer!: (page: DashboardLocationPage) => void;
		getLocations().mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
		render();
		await vi.waitFor(() => expect(getLocations()).toHaveBeenCalledTimes(1));

		answer(locationsPage([group('loc-8', [stale()])]));
		// Let the page land (which schedules the overdue fetch), then end the
		// session before that fetch runs.
		await Promise.resolve();
		await Promise.resolve();
		view!.app.accessToken = undefined;

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(getLatest()).not.toHaveBeenCalled();
	});
});
