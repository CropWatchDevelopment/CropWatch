import { describe, expect, it } from 'vitest';
import type { OverviewDto } from '$lib/api/api.dtos';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import { testEvent, testLocals, testServerConfig, TEST_JWT } from '$lib/testing/server';
import { load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];

const OVERVIEW = { range: '24h', generatedAt: '2026-10-15T09:05:00.000Z' } as OverviewDto;

function run(authToken: string | null, locals = testLocals()) {
	return load(testEvent<LoadEvent>({ locals, parent: { authToken } }));
}

describe('overview load', () => {
	it("loads the last 24 hours for the layout's session", async () => {
		const locals = testLocals();
		locals.services.overview.getOverview.mockResolvedValue(OVERVIEW);

		await expect(run(TEST_JWT, locals)).resolves.toEqual({ initialOverview: OVERVIEW });
		expect(locals.services.overview.getOverview).toHaveBeenCalledTimes(1);
		expect(locals.services.overview.getOverview).toHaveBeenCalledWith('24h');
	});

	it('renders the page without data when the API fails', async () => {
		const locals = testLocals();
		locals.services.overview.getOverview.mockRejectedValue(new Error('down'));

		await expect(run(TEST_JWT, locals)).resolves.toEqual({ initialOverview: null });
	});

	it('does not call the API without a session', async () => {
		const locals = testLocals();

		await expect(run(null, locals)).resolves.toEqual({ initialOverview: null });
		expect(locals.services.overview.getOverview).not.toHaveBeenCalled();
	});

	it('sends GET /overview?range=24h with the session token', async () => {
		const fake = createFakeFetch(() => jsonResponse(OVERVIEW));
		const services = createServerServices({
			fetch: fake.fetch,
			authToken: () => TEST_JWT,
			config: testPublicConfig(),
			serverConfig: testServerConfig()
		});
		const locals = { ...testLocals(), services } as unknown as ReturnType<typeof testLocals>;

		await expect(run(TEST_JWT, locals)).resolves.toEqual({ initialOverview: OVERVIEW });
		const request = fake.onlyRequest();
		expect(request.method).toBe('GET');
		expect(request.path).toBe('/overview?range=24h');
		expect(request.headers.get('authorization')).toBe(`Bearer ${TEST_JWT}`);
	});
});
