import { isHttpError } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { load } from './+page.server';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';
const MANAGER_ID = '33333333-3333-4333-8333-333333333333';
const STRANGER_ID = '44444444-4444-4444-8444-444444444444';
const STAFF_ID = '55555555-5555-4555-8555-555555555555';

type LoadData = Exclude<Awaited<ReturnType<typeof load>>, void>;

/** Runs the load with the concrete data type (the generated type also admits `void`). */
const run = async (event: Parameters<typeof load>[0]) => (await load(event)) as LoadData;

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Location 8 as the API returns it: owned by OWNER_ID, one Admin and one Manager grant. */
const greenhouse = {
	location_id: 8,
	name: 'Greenhouse A',
	group: 'Farm',
	owner_id: OWNER_ID,
	cw_location_owners: [
		{ id: 1, location_id: 8, user_id: ADMIN_ID, permission_level: 1 },
		{ id: 2, location_id: 8, user_id: MANAGER_ID, permission_level: 2 }
	]
};

type FakeApi = { locationStatus?: number; preflightStatus?: number };

/** A load event for /locations/8/settings as `jwt`, against a fake API. */
function loadEvent(jwt: { sub: string; email: string }, api: FakeApi = {}) {
	const locationStatus = api.locationStatus ?? 200;
	const preflightStatus = api.preflightStatus ?? 200;
	const fetch = vi.fn(async (input: RequestInfo | URL) => {
		const url = String(input);
		if (url.includes('/locations/8/delete-preflight')) {
			return preflightStatus === 200
				? json({ location_id: 8, device_count: 3 })
				: json({ statusCode: preflightStatus, message: 'owner only' }, preflightStatus);
		}
		if (url.includes('/locations/8')) {
			return locationStatus === 200
				? json(greenhouse)
				: json({ statusCode: locationStatus, message: 'Location not found' }, locationStatus);
		}
		return json({ message: 'unexpected call' }, 404);
	});

	const event = {
		locals: { jwtString: 'jwt-token', jwt },
		fetch,
		params: { location_id: '8' }
	};
	return event as unknown as Parameters<typeof load>[0];
}

/** The HTTP status + message a load rejects with, or null when it resolves. */
async function denial(promise: Promise<unknown>) {
	try {
		await promise;
		return null;
	} catch (err) {
		if (isHttpError(err)) {
			return { status: err.status, message: err.body.message };
		}
		throw err;
	}
}

describe('location settings load', () => {
	it('lets the owner in, with the delete preflight', async () => {
		await expect(
			run(loadEvent({ sub: OWNER_ID, email: 'owner@example.com' }))
		).resolves.toMatchObject({
			locationId: 8,
			locationName: 'Greenhouse A',
			locationGroup: 'Farm',
			deletion: { deviceCount: 3 }
		});
	});

	it('lets a user with an Admin grant in', async () => {
		await expect(
			run(loadEvent({ sub: ADMIN_ID, email: 'admin@example.com' }, { preflightStatus: 403 }))
		).resolves.toMatchObject({ locationName: 'Greenhouse A', deletion: null });
	});

	it('lets CropWatch staff in without any grant row', async () => {
		const data = await run(loadEvent({ sub: STAFF_ID, email: 'Kevin@CropWatch.io' }));

		expect(data.locationName).toBe('Greenhouse A');
		expect(data.locationOwners).toHaveLength(2);
		expect(data.deletion).toEqual({ deviceCount: 3 });
	});

	it('answers 403, not 500, for a Manager grant', async () => {
		await expect(
			denial(
				run(loadEvent({ sub: MANAGER_ID, email: 'manager@example.com' }, { preflightStatus: 403 }))
			)
		).resolves.toEqual({ status: 403, message: m.locations_permission_denied() });
	});

	it('answers 403 for a signed-in user with no grant at all', async () => {
		await expect(
			denial(
				run(
					loadEvent({ sub: STRANGER_ID, email: 'stranger@example.com' }, { preflightStatus: 403 })
				)
			)
		).resolves.toEqual({ status: 403, message: m.locations_permission_denied() });
	});

	it('answers 404 when the API cannot find the location, even for staff', async () => {
		await expect(
			denial(
				run(
					loadEvent(
						{ sub: STAFF_ID, email: 'kevin@cropwatch.io' },
						{ locationStatus: 404, preflightStatus: 404 }
					)
				)
			)
		).resolves.toEqual({ status: 404, message: m.error_not_found_description() });
	});
});
