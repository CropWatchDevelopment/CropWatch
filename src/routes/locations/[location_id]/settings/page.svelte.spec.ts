import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocationOwnerDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import SettingsPage from './+page.svelte';

const { goto, page } = vi.hoisted(() => ({
	goto: vi.fn(),
	page: {
		url: new URL('http://localhost/locations/8/settings'),
		params: { location_id: '8' },
		data: {}
	}
}));
vi.mock('$app/navigation', () => ({ goto, invalidateAll: vi.fn() }));
vi.mock('$app/state', () => ({ page }));
vi.mock('$app/forms', () => ({
	applyAction: vi.fn(),
	deserialize: vi.fn(),
	enhance: () => ({ destroy: () => {} })
}));

// A 1×1 transparent PNG, served for every OpenStreetMap tile so the map renders
// without the network.
const BLANK_TILE = Uint8Array.from(
	atob(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
	),
	(char) => char.charCodeAt(0)
);

const DATA = {
	locationId: 8 as number | null,
	locationName: 'Greenhouse A',
	locationGroup: 'Farm',
	coordinates: { lat: 31.9147, long: 131.4232 },
	mapZoom: 15,
	devicePositions: [{ lat: 31.91, long: 131.42 }],
	locationOwners: [
		{ id: 14, permission_level: 2, profiles: { email: 'ada@example.com', full_name: 'Ada' } }
	] as unknown as LocationOwnerDto[],
	deletion: { deviceCount: 0 } as { deviceCount: number } | null
};

let view: ReturnType<typeof renderWithServices> | null = null;

function render(data: Partial<typeof DATA> = {}, form: Record<string, unknown> | null = null) {
	view = renderWithServices(SettingsPage, {
		props: { data: { ...DATA, ...data }, form, params: { location_id: '8' } } as never
	});
	return view;
}

const text = () => document.body.textContent ?? '';
const dangerZone = () => document.getElementById('location-delete-open-button');

beforeEach(() => {
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
	vi.unstubAllGlobals();
});

describe('location settings page', () => {
	it("is titled with the location's name and goes back to the location", () => {
		render();

		expect(document.title).toBe(m.locations_settings_page_title({ name: 'Greenhouse A' }));
		expect(text()).toContain(m.locations_back_to_location());
		(document.getElementById('location-settings-back-button') as HTMLButtonElement).click();

		expect(goto).toHaveBeenCalledWith('/locations/8');
	});

	it('shows every settings card for the location', async () => {
		render();

		expect(text()).toContain(m.locations_settings_title());
		expect((document.getElementById('location-update-name-input') as HTMLInputElement).value).toBe(
			'Greenhouse A'
		);
		expect(text()).toContain(m.location_coordinates_title());
		expect(
			(document.getElementById('location-coordinates-lat-input') as HTMLInputElement).value
		).toBe('31.9147');
		expect(
			(document.getElementById('location-coordinates-centre-button') as HTMLButtonElement).disabled
		).toBe(false);
		expect(text()).toContain(m.locations_add_user_permissions_title({ name: 'Greenhouse A' }));
		await expect.poll(text).toContain('ada@example.com');
		expect(text()).toContain(m.danger_zone_title());
		expect(dangerZone()).not.toBeNull();
	});

	it('offers deleting only with the delete preflight and a location id', () => {
		render({ deletion: null });
		expect(dangerZone()).toBeNull();
		view?.unmount();

		render({ locationId: null });
		expect(dangerZone()).toBeNull();
	});

	it("shows the delete action's error in the danger zone, and no other action's", () => {
		render({ deletion: { deviceCount: 0 } }, { action: 'deleteLocation', message: 'Refused' });
		expect(dangerZone()?.closest('.cw-card')?.textContent).toContain('Refused');
		view?.unmount();

		render({}, { action: 'updateLocationName', message: 'Name updated' });
		expect(dangerZone()?.closest('.cw-card')?.textContent).not.toContain('Name updated');
	});
});
