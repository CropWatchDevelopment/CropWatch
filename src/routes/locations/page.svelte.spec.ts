import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocationDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import LocationsPage from './+page.svelte';

const { goto, page } = vi.hoisted(() => ({
	goto: vi.fn(),
	page: { url: new URL('http://localhost/locations'), params: {}, data: {} }
}));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/state', () => ({ page }));

function location(location_id: number, name: string, group: string | null = null): LocationDto {
	return { location_id, name, group: group as never, created_at: '2026-01-01T00:00:00Z' };
}

/**
 * Full page loads (`window.location.assign`) are recorded and cancelled
 * through the Navigation API, so the test page stays put.
 */
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

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

const render = () => (view = renderWithServices(LocationsPage, { services }));
const text = () => view?.target.textContent ?? '';
const rowNames = () =>
	[...(view?.target.querySelectorAll('tbody tr') ?? [])]
		.filter((row) => row.querySelector('[id$="-view-button"]'))
		.map((row) => row.querySelectorAll('td')[1]?.textContent?.trim());
const button = (id: string) => document.getElementById(id) as HTMLButtonElement;

beforeEach(() => {
	services = createMockServices();
	page.url = new URL('http://localhost/locations');
});

afterEach(() => {
	view?.unmount();
	view = null;
	goto.mockReset();
});

describe('locations page', () => {
	it('lists every location the API returns', async () => {
		services.locations.getAllLocations.mockResolvedValue({
			data: [location(1, 'Barn', 'Farm'), location(2, 'Greenhouse')],
			total: 2
		});

		render();

		await expect.poll(rowNames).toEqual(['Barn', 'Greenhouse']);
		expect(text()).toContain(m.locations_all_title());
		expect(services.locations.getAllLocations).toHaveBeenCalledWith({ name: undefined });
	});

	it('searches by name on the API, trimmed', async () => {
		services.locations.getAllLocations.mockResolvedValue({ data: [location(1, 'Barn')], total: 1 });
		render();
		await expect.poll(rowNames).toEqual(['Barn']);

		const search = view!.target.querySelector(
			'.cw-data-table__search-wrapper input'
		) as HTMLInputElement;
		search.value = '  green ';
		search.dispatchEvent(new Event('input', { bubbles: true }));

		await expect
			.poll(() => services.locations.getAllLocations.mock.calls.at(-1))
			.toEqual([{ name: 'green' }]);
	});

	it('sorts by name and shows ten locations per page', async () => {
		const names = 'KLABCDEFGHIJ'.split('').map((letter, index) => location(index + 1, letter));
		services.locations.getAllLocations.mockResolvedValue({ data: names, total: names.length });
		render();
		await expect.poll(() => rowNames().length).toBe(10);
		expect(rowNames()[0]).toBe('K');

		const nameHeader = [...view!.target.querySelectorAll('.cw-data-table__sort-btn')].find(
			(header) => header.textContent?.includes(m.nav_locations())
		) as HTMLButtonElement;
		nameHeader.click();
		await expect.poll(() => rowNames()[0]).toBe('A');
		expect(rowNames()).toHaveLength(10);

		(
			view!.target.querySelector(
				`button[aria-label="${m.cwui_table_next_page()}"]`
			) as HTMLButtonElement
		).click();
		await expect.poll(rowNames).toEqual(['K', 'L']);

		nameHeader.click();
		await expect.poll(() => rowNames()[0]).toBe('L');
	});

	it('shows an empty table when the API sends no list', async () => {
		services.locations.getAllLocations.mockResolvedValue({ total: 0 } as never);

		render();

		await expect.poll(text).toContain(m.cwui_table_empty());
		expect(rowNames()).toEqual([]);
	});

	it('shows the error when the locations cannot be loaded', async () => {
		services.locations.getAllLocations.mockRejectedValue(new Error('Locations unavailable'));

		render();

		await expect.poll(text).toContain('Locations unavailable');
	});

	it('opens a location in a full page load, carrying its id and name', async () => {
		services.locations.getAllLocations.mockResolvedValue({
			data: [location(8, 'Barn & Shed')],
			total: 1
		});
		render();
		await expect.poll(rowNames).toEqual(['Barn & Shed']);
		const pageLoads = interceptPageLoads();

		try {
			button('locations-row-8-view-button').click();

			await expect.poll(() => pageLoads.urls).toHaveLength(1);
			expect(pageLoads.urls[0]).toBe(
				`${window.location.origin}/locations/8?location_id=8&location_name=Barn+%26+Shed`
			);
		} finally {
			pageLoads.stop();
		}
	});

	it('goes back to the dashboard, or to where the user came from', async () => {
		services.locations.getAllLocations.mockResolvedValue({ data: [], total: 0 });
		render();
		button('locations-back-button').click();
		expect(goto).toHaveBeenLastCalledWith('/');
		expect(text()).toContain(m.action_back_to_dashboard());
		view?.unmount();

		page.url = new URL('http://localhost/locations?backTo=/overview');
		render();
		button('locations-back-button').click();
		expect(goto).toHaveBeenLastCalledWith('/overview');
	});

	it('opens the create form from the toolbar', async () => {
		services.locations.getAllLocations.mockResolvedValue({ data: [], total: 0 });
		render();

		await vi.waitFor(() => button('locations-add-button').click());

		expect(goto).toHaveBeenCalledWith('/locations/create');
	});
});
