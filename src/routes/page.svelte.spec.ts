import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page as browserPage } from 'vitest/browser';
import type { DashboardRow, LocationDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import DashboardPage from './+page.svelte';

const { goto, appPage } = vi.hoisted(() => ({
	goto: vi.fn(),
	appPage: { url: new URL('http://localhost/'), params: {}, data: {} }
}));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/state', () => ({ page: appPage }));

const VIEW_KEY = 'cropwatch.dashboard.view';
const LAYOUT_KEY = 'cropwatch.dashboard.cardLayout';
const PHONE = { width: 414, height: 896 };
const DESKTOP = { width: 1280, height: 800 };

function row(): DashboardRow {
	return {
		dev_eui: 'DEV-1',
		name: 'Greenhouse probe',
		group: null,
		upload_interval: 10,
		last_data_updated_at: new Date().toISOString(),
		error_status: null,
		device_type: {
			id: 1,
			name: 'Soil',
			data_table_v2: 'cw_soil_data',
			primary_data_v2: 'temperature_c',
			secondary_data_v2: 'moisture',
			default_upload_interval: 10
		},
		location: { location_id: 8, name: 'North field', group: null },
		latest: { created_at: new Date().toISOString(), primary: 20, secondary: 40 }
	};
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(accessToken: string | null = 'jwt-token') {
	view = renderWithServices(DashboardPage, {
		services,
		app: { accessToken: accessToken ?? undefined }
	});
	return view;
}

const button = (id: string) => document.getElementById(id) as HTMLButtonElement | null;
const isActive = (id: string) => button(id)?.classList.contains('cw-button--info') ?? false;
const searchInput = () => document.getElementById('dashboard-search') as HTMLInputElement;
const lastTableQuery = () => services.dashboard.getDashboardDevices.mock.calls.at(-1)?.[0];
const lastCardsQuery = () => services.dashboard.getDashboardLocations.mock.calls.at(-1)?.[0];

beforeEach(async () => {
	services = createMockServices();
	services.dashboard.getDashboardDevices.mockResolvedValue({
		rows: [row()],
		total: 1,
		skip: 0,
		take: 25
	});
	services.dashboard.getDashboardLocations.mockResolvedValue({
		groups: [{ key: 'loc-8', location: row().location, devices: [row()] }],
		total: 1,
		skip: 0,
		take: 20
	});
	services.locations.getLocationGroups.mockResolvedValue(['Farm', 'Office']);
	services.locations.getLocations.mockResolvedValue([
		{ location_id: 8, name: 'North field' } as LocationDto
	]);
	appPage.url = new URL('http://localhost/');
	localStorage.clear();
	await browserPage.viewport(DESKTOP.width, DESKTOP.height);
});

afterEach(async () => {
	view?.unmount();
	view = null;
	localStorage.clear();
	await browserPage.viewport(PHONE.width, PHONE.height);
});

describe('dashboard page', () => {
	it('is titled and fills the viewport instead of scrolling the shell', async () => {
		render();

		await expect.poll(() => document.title).toBe(m.dashboard_page_title());
		const shell = view!.target.querySelector('.app-page.dashboard-page') as HTMLElement;
		expect(getComputedStyle(shell).flexShrink).toBe('1');
		expect(getComputedStyle(shell).minHeight).toBe('0px');
		const inner = shell.querySelector('.app-page__shell') as HTMLElement;
		expect(getComputedStyle(inner).flexShrink).toBe('1');
		expect(getComputedStyle(inner).minHeight).toBe('0px');
	});

	it('shows the device table on larger screens', async () => {
		render();

		await expect.poll(() => view!.target.querySelectorAll('tbody tr').length).toBe(1);
		expect(isActive('dashboard-table-view-button')).toBe(true);
		expect(isActive('dashboard-cards-view-button')).toBe(false);
		expect(button('dashboard-grid-layout-button')).toBeNull();
		expect(services.dashboard.getDashboardLocations).not.toHaveBeenCalled();
		expect(view!.target.textContent).toContain(m.dashboard_table_view());
		expect(view!.target.textContent).toContain(m.dashboard_sensor_cards_view());
	});

	it('starts with the sensor cards on a phone', async () => {
		await browserPage.viewport(PHONE.width, PHONE.height);

		render();

		await expect.poll(() => view!.target.querySelector('.dashboard-cards')).not.toBeNull();
		expect(isActive('dashboard-cards-view-button')).toBe(true);
		expect(services.dashboard.getDashboardDevices).not.toHaveBeenCalled();
	});

	it('switches views and remembers the choice', async () => {
		render();
		await expect.poll(() => services.dashboard.getDashboardDevices).toHaveBeenCalled();

		button('dashboard-cards-view-button')?.click();
		flushSync();

		await expect.poll(() => view!.target.querySelector('.dashboard-cards')).not.toBeNull();
		expect(localStorage.getItem(VIEW_KEY)).toBe('cards');
		expect(isActive('dashboard-cards-view-button')).toBe(true);
		expect(button('dashboard-grid-layout-button')).not.toBeNull();

		button('dashboard-table-view-button')?.click();
		flushSync();
		expect(localStorage.getItem(VIEW_KEY)).toBe('table');
		expect(view!.target.querySelector('.dashboard-cards')).toBeNull();
	});

	it('restores the remembered view over the screen-size default', async () => {
		await browserPage.viewport(PHONE.width, PHONE.height);
		localStorage.setItem(VIEW_KEY, 'table');

		render();

		await expect.poll(() => view!.target.querySelectorAll('tbody tr').length).toBe(1);
		expect(isActive('dashboard-table-view-button')).toBe(true);
	});

	it('ignores an unknown remembered view', async () => {
		localStorage.setItem(VIEW_KEY, 'list');

		render();

		await expect.poll(() => services.dashboard.getDashboardDevices).toHaveBeenCalled();
		expect(isActive('dashboard-table-view-button')).toBe(true);
	});

	it('switches the card layout and remembers it', async () => {
		localStorage.setItem(VIEW_KEY, 'cards');
		render();
		await expect
			.poll(() => view!.target.querySelector('.dashboard-cards__groups--grid'))
			.not.toBeNull();
		expect(isActive('dashboard-grid-layout-button')).toBe(true);

		button('dashboard-masonry-layout-button')?.click();
		flushSync();

		expect(view!.target.querySelector('.dashboard-cards__groups--masonry')).not.toBeNull();
		expect(isActive('dashboard-masonry-layout-button')).toBe(true);
		expect(localStorage.getItem(LAYOUT_KEY)).toBe('masonry');

		button('dashboard-grid-layout-button')?.click();
		flushSync();
		expect(localStorage.getItem(LAYOUT_KEY)).toBe('grid');
		expect(view!.target.querySelector('.dashboard-cards__groups--grid')).not.toBeNull();
	});

	it.each([
		['masonry', 'masonry'],
		['bricks', 'grid']
	])('restores a remembered "%s" card layout as %s', async (stored, expected) => {
		localStorage.setItem(VIEW_KEY, 'cards');
		localStorage.setItem(LAYOUT_KEY, stored);

		render();

		await expect
			.poll(() => view!.target.querySelector(`.dashboard-cards__groups--${expected}`))
			.not.toBeNull();
	});

	it('filters the devices by the URL', async () => {
		appPage.url = new URL('http://localhost/?group=pumps&locationGroup=Farm&location=8&name=probe');

		render();

		await expect.poll(lastTableQuery).toEqual({
			skip: 0,
			take: 25,
			group: 'pumps',
			locationGroup: 'Farm',
			location: '8',
			name: 'probe'
		});
		expect(searchInput().value).toBe('probe');
	});

	it('passes the same filters to the card view', async () => {
		appPage.url = new URL('http://localhost/?locationGroup=Farm');
		localStorage.setItem(VIEW_KEY, 'cards');

		render();

		await expect.poll(lastCardsQuery).toEqual({
			skip: 0,
			take: 20,
			group: undefined,
			locationGroup: 'Farm',
			location: undefined,
			name: undefined
		});
	});

	it('searches by name once the user pauses typing', async () => {
		render();
		await expect.poll(() => services.dashboard.getDashboardDevices).toHaveBeenCalled();

		searchInput().value = '  probe ';
		searchInput().dispatchEvent(new Event('input', { bubbles: true }));
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(lastTableQuery()?.name).toBeUndefined();

		await expect.poll(() => lastTableQuery()?.name).toBe('probe');
	});

	it('loads the sidebar location filters once per visit', async () => {
		render();

		await expect.poll(() => view!.app.locations).toEqual([{ location_id: 8, name: 'North field' }]);
		expect(view!.app.locationGroups).toEqual(['Farm', 'Office']);

		view!.app.accessToken = 'refreshed-token';
		flushSync();
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(services.locations.getLocationGroups).toHaveBeenCalledTimes(1);
		expect(services.locations.getLocations).toHaveBeenCalledTimes(1);
	});

	it('waits for the session before loading the sidebar filters', async () => {
		render(null);
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(services.locations.getLocationGroups).not.toHaveBeenCalled();

		view!.app.accessToken = 'jwt-token';

		await expect.poll(() => view!.app.locationGroups).toEqual(['Farm', 'Office']);
		expect(services.locations.getLocations).toHaveBeenCalledTimes(1);
	});

	it('keeps the sidebar lists empty when they cannot be loaded', async () => {
		services.locations.getLocationGroups.mockRejectedValue(new Error('down'));
		services.locations.getLocations.mockRejectedValue(new Error('down'));

		render();

		await vi.waitFor(() => expect(services.locations.getLocations).toHaveBeenCalled());
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(view!.app.locationGroups).toEqual([]);
		expect(view!.app.locations).toBeUndefined();
	});
});
