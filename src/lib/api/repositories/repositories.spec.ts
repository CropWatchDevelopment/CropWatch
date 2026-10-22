import { describe, expect, it } from 'vitest';
import { FetchHttpClient } from '$lib/api/http/fetch-http-client';
import { createAppServices, type AppServices } from '$lib/services/app-services';
import {
	createFakeFetch,
	jsonResponse,
	testPublicConfig,
	TEST_API_BASE_URL
} from '$lib/testing/http';
import { createMockServices } from '$lib/testing/mock-services';
import { REPOSITORY_CONTRACT } from '$lib/testing/repository-contract';

type AnyMethod = (...args: unknown[]) => Promise<unknown>;

function servicesFor(fetch: typeof globalThis.fetch, authToken: string | null = 'jwt-token') {
	const http = new FetchHttpClient({ baseUrl: TEST_API_BASE_URL, fetch, authToken });
	return createAppServices(http, testPublicConfig().endpoints);
}

function invoke(
	services: AppServices,
	repository: keyof AppServices,
	method: string,
	args: unknown[]
) {
	const target = services[repository] as unknown as Record<string, AnyMethod>;
	return target[method](...args);
}

describe('repository wire contract', () => {
	it.each(REPOSITORY_CONTRACT)(
		'$repository.$method sends $expected.method $expected.path',
		async ({ repository, method, args, response, expected }) => {
			const fake = createFakeFetch(() => jsonResponse(response ?? { ok: true }));

			await invoke(servicesFor(fake.fetch), repository, method, args);

			const request = fake.onlyRequest();
			expect(request.method).toBe(expected.method);
			expect(request.path).toBe(expected.path);
			expect(request.body).toEqual(expected.body);
			expect(request.headers.get('accept')).toBe('application/json');
			expect(request.headers.get('authorization')).toBe(
				expected.auth === 'none' ? null : 'Bearer jwt-token'
			);
			if (expected.body !== undefined) {
				expect(request.headers.get('content-type')).toBe('application/json');
			}
		}
	);

	it('covers every method of every repository', () => {
		const covered = new Set(REPOSITORY_CONTRACT.map((c) => `${c.repository}.${c.method}`));
		const all = Object.entries(createMockServices()).flatMap(([repository, mock]) =>
			Object.keys(mock).map((method) => `${repository}.${method}`)
		);

		expect(all.filter((name) => !covered.has(name))).toEqual([]);
	});
});

describe('list normalization', () => {
	it('unwraps result.items for location devices and reads the count', async () => {
		const fake = createFakeFetch(() =>
			jsonResponse({ result: { items: [{ dev_eui: 'A' }, { dev_eui: 'B' }], count: 7 } })
		);

		await expect(servicesFor(fake.fetch).devices.getAllLocationDevices(8)).resolves.toEqual({
			data: [{ dev_eui: 'A' }, { dev_eui: 'B' }],
			total: 7
		});
	});

	it('returns an empty list for a payload with no rows', async () => {
		const fake = createFakeFetch(() => jsonResponse({ message: 'nothing here' }));

		await expect(servicesFor(fake.fetch).devices.getDeviceTypes()).resolves.toEqual([]);
		await expect(servicesFor(fake.fetch).locations.getLocations()).resolves.toEqual([]);
	});

	it('follows /devices pagination until the reported total', async () => {
		const page = (skip: number, size: number) =>
			Array.from({ length: size }, (_, i) => ({ dev_eui: `D${skip + i}` }));
		const fake = createFakeFetch(({ url }) => {
			const skip = Number(new URL(url).searchParams.get('skip'));
			return jsonResponse({ data: page(skip, skip === 2000 ? 5 : 1000), total: 2005 });
		});

		const devices = await servicesFor(fake.fetch).devices.getAllDevices({ group: 'North' });

		expect(devices).toHaveLength(2005);
		expect(fake.requests.map((r) => r.path)).toEqual([
			'/devices?skip=0&take=1000&group=North',
			'/devices?skip=1000&take=1000&group=North',
			'/devices?skip=2000&take=1000&group=North'
		]);
	});

	it('stops paging when a page comes back empty', async () => {
		const fake = createFakeFetch(({ url }) => {
			const skip = Number(new URL(url).searchParams.get('skip'));
			return jsonResponse({ data: skip === 0 ? [{ dev_eui: 'A' }] : [], total: 5000 });
		});

		await expect(servicesFor(fake.fetch).devices.getAllDevices()).resolves.toEqual([
			{ dev_eui: 'A' }
		]);
		expect(fake.requests).toHaveLength(2);
	});

	it('treats a missing total as "this page is everything"', async () => {
		const fake = createFakeFetch(() => jsonResponse({ data: [{ dev_eui: 'A' }], total: 'n/a' }));

		await expect(servicesFor(fake.fetch).devices.getAllDevices()).resolves.toHaveLength(1);
		expect(fake.requests).toHaveLength(1);
	});
});

describe('request options', () => {
	it('suppresses logging of an expected 404 but still rejects', async () => {
		const fake = createFakeFetch(() => jsonResponse({ message: 'no data' }, { status: 404 }));
		const services = servicesFor(fake.fetch);

		await expect(
			services.telemetry.getDeviceLatestData('A', { suppressNotFoundError: true })
		).rejects.toMatchObject({ status: 404 });
		await expect(
			services.relays.getRelayData('A', { suppressNotFoundError: true })
		).rejects.toMatchObject({ status: 404 });
		await expect(
			services.telemetry.getDeviceData('A', {}, { suppressNotFoundError: true })
		).rejects.toMatchObject({ status: 404 });
		await expect(
			services.telemetry.getDeviceDataWithinRange('A', {}, { suppressNotFoundError: true })
		).rejects.toMatchObject({ status: 404 });
	});

	it('forwards the abort signal', async () => {
		const fake = createFakeFetch(() => jsonResponse([]));
		const controller = new AbortController();

		await servicesFor(fake.fetch).gateways.getGateways({ signal: controller.signal });

		expect(fake.onlyRequest().signal).toBe(controller.signal);
	});

	it('uses env-configured endpoints', async () => {
		const fake = createFakeFetch(() => jsonResponse({ online: 1, offline: 0 }));
		const http = new FetchHttpClient({ baseUrl: TEST_API_BASE_URL, fetch: fake.fetch });
		const services = createAppServices(http, {
			...testPublicConfig().endpoints,
			deviceStatus: '/v2/status',
			ruleTemplates: '/v2/rules',
			reportTemplates: '/v2/reports',
			airNotes: '/v2/notes',
			airNotesForMonth: '/v2/notes/{dev_eui}/{year}-{month}'
		});

		await services.devices.getDeviceStatuses();
		await services.rules.getTriggeredRulesCount();
		await services.reports.getReportTemplate(3);
		await services.airNotes.deleteAirNote(4);
		await services.airNotes.getAllAirNotesForMonth({ dev_eui: 'A', date: new Date(2026, 0, 9) });

		expect(fake.requests.map((r) => r.path)).toEqual([
			'/v2/status',
			'/v2/rules/triggered/count',
			'/v2/reports/3',
			'/v2/notes/4',
			'/v2/notes/A/2026-01'
		]);
	});
});
