import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { gotoMock, pageState } = vi.hoisted(() => ({
	gotoMock: vi.fn(async () => {}),
	pageState: {
		url: new URL('https://example.com/')
	}
}));

class MockIntersectionObserver {
	observe() {}
	disconnect() {}
}

vi.mock('$env/dynamic/public', () => ({
	env: {}
}));

vi.mock('$app/navigation', () => ({
	goto: gotoMock
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string, params?: Record<string, string>) => {
		if (!params) {
			return path;
		}

		if (path.includes('[dev_eui]')) {
			return `/locations/${params.location_id}/devices/${params.dev_eui}`;
		}

		return `/locations/${params.location_id}`;
	}
}));

vi.mock('$app/state', () => ({
	page: pageState
}));

import type { LocationDto } from '$lib/api/api.dtos';
import { ApiService } from '$lib/api/api.service';
import type { IDevice } from '$lib/interfaces/device.interface';
import DashboardDeviceCardsTestHarness from './DashboardDeviceCards.test-harness.svelte';

function createDevice(overrides: Partial<IDevice> = {}): IDevice {
	return {
		dev_eui: 'dev-1',
		name: 'Canopy',
		location_name: 'Grow Room',
		group: 'air',
		data_table: 'cw_air_data',
		created_at: new Date('2026-04-09T09:50:00.000Z'),
		has_primary_data: true,
		co2: 820,
		humidity: 56,
		temperature_c: 24.5,
		soil_temperature_c: null,
		soil_humidity: null,
		location_id: 1,
		alert_count: 0,
		...overrides
	};
}

function renderDashboardDeviceCards(options: {
	devices?: IDevice[];
	locations?: LocationDto[];
} = {}) {
	const component = mount(DashboardDeviceCardsTestHarness, {
		target: document.body,
		props: {
			initialApp: {
				accessToken: 'jwt-token',
				devices:
					options.devices ??
					[
						createDevice(),
						createDevice({
							dev_eui: 'dev-2',
							created_at: new Date('2026-04-09T09:59:30.000Z')
						})
					],
				locations:
					options.locations ??
					[
						{
							location_id: 1,
							name: 'Grow Room',
							created_at: '2026-04-01T00:00:00.000Z'
						} as LocationDto
					]
			},
			filters: {
				group: '',
				locationGroup: '',
				location: ''
			},
			cardLayout: 'grid'
		}
	});

	flushSync();
	return { component };
}

function getButtonsByText(text: string): HTMLButtonElement[] {
	return [...document.body.querySelectorAll('button')].filter((button): button is HTMLButtonElement =>
		button.textContent?.includes(text)
	);
}

describe('DashboardDeviceCards', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		localStorage.clear();
		gotoMock.mockReset();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-09T10:00:00.000Z'));

		vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
	});

	afterEach(async () => {
		document.body.innerHTML = '';
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('disambiguates duplicate labels, routes the correct device details, and refreshes the live card device at 10.3 minutes', async () => {
		const getDeviceLatestPrimaryData = vi
			.spyOn(ApiService.prototype, 'getDeviceLatestPrimaryData')
			.mockImplementation(async (devEui: string) => ({
				dev_eui: devEui,
				name: 'Canopy',
				location_name: 'Grow Room',
				group: 'air',
				created_at: '2026-04-09T10:00:18.000Z',
				co2: 901,
				humidity: 60.1,
				temperature_c: 25.4,
				location_id: 1
			}));
		const { component } = renderDashboardDeviceCards();

		expect(document.body.textContent).toContain('Canopy (dev-1)');
		expect(document.body.textContent).toContain('Canopy (dev-2)');

		const detailButtons = getButtonsByText('View Device Details');
		expect(detailButtons).toHaveLength(2);
		detailButtons[0]?.click();
		flushSync();

		expect(gotoMock).toHaveBeenCalledWith('/locations/1/devices/dev-1');

		gotoMock.mockClear();

		await vi.advanceTimersByTimeAsync(18_000);
		flushSync();

		expect(getDeviceLatestPrimaryData).toHaveBeenCalledTimes(1);
		expect(getDeviceLatestPrimaryData).toHaveBeenCalledWith('dev-1');
		expect(document.body.textContent).toContain('25.40');
		expect(document.body.textContent).toContain('0s ago');

		await unmount(component);
	});
});
