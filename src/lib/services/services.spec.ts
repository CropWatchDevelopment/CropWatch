import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServerServices } from '$lib/server/services';
import {
	createFakeFetch,
	jsonResponse,
	testPublicConfig,
	TEST_API_BASE_URL
} from '$lib/testing/http';
import { createMockServices } from '$lib/testing/mock-services';
import { createAppServices } from './app-services';
import { createClientServices } from './client';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('createServerServices', () => {
	it("sends every request through the request's fetch, as the current session", async () => {
		const fake = createFakeFetch(() => jsonResponse({ online: 1, offline: 2 }));
		let session: string | null = 'jwt-1';
		const services = createServerServices({
			fetch: fake.fetch,
			authToken: () => session,
			config: testPublicConfig()
		});

		await services.devices.getDeviceStatuses();
		session = null;
		await services.devices.getDeviceStatuses();

		expect(fake.requests.map((r) => [r.url, r.headers.get('authorization')])).toEqual([
			[`${TEST_API_BASE_URL}/devices/status`, 'Bearer jwt-1'],
			[`${TEST_API_BASE_URL}/devices/status`, null]
		]);
	});

	it('reads the config from the env by default, adding the server-only gateways', () => {
		const services = createServerServices({
			fetch: createFakeFetch().fetch,
			authToken: () => null
		});

		expect(Object.keys(services).sort()).toEqual(
			[...Object.keys(createMockServices()), 'libellus', 'recaptcha', 'supabaseAuth'].sort()
		);
	});
});

describe('createClientServices', () => {
	it('uses the global fetch at request time, so it follows a replaced window.fetch', async () => {
		const first = createFakeFetch(() => jsonResponse([]));
		const second = createFakeFetch(() => jsonResponse([]));
		const services = createClientServices({ config: testPublicConfig(), authToken: () => 'jwt' });

		vi.stubGlobal('fetch', first.fetch);
		await services.gateways.getGateways();
		vi.stubGlobal('fetch', second.fetch);
		await services.gateways.getGateways();

		expect(first.requests).toHaveLength(1);
		expect(second.requests).toHaveLength(1);
		expect(second.onlyRequest().headers.get('authorization')).toBe('Bearer jwt');
	});

	it('does not retry a 401 outside the browser', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fake = createFakeFetch(() => jsonResponse(null, { status: 401 }));
		vi.stubGlobal('fetch', fake.fetch);
		const services = createClientServices({ config: testPublicConfig(), authToken: () => 'jwt' });

		await expect(services.overview.getOverview()).rejects.toMatchObject({ status: 401 });
		expect(fake.requests).toHaveLength(1);
	});
});

describe('createAppServices', () => {
	it('provides exactly the repositories the mocks provide', () => {
		const services = createAppServices(
			{ request: <T>() => Promise.resolve(null as T) },
			testPublicConfig().endpoints
		);

		expect(Object.keys(services).sort()).toEqual(Object.keys(createMockServices()).sort());
	});
});

describe('createMockServices', () => {
	it('rejects any call that a test did not stub', async () => {
		const services = createMockServices();

		await expect(services.devices.getDevice('A')).rejects.toThrow(
			'services.devices.getDevice() was called but not stubbed'
		);
	});
});
