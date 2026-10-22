import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { createServerServices } from '$lib/server/services';
import { testPublicConfig } from '$lib/testing/http';
import { testServerConfig } from '$lib/testing/server';
import { deleteLocation } from './location-settings-actions.server';

type ApiCall = { method: string; url: string };

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** A deleteLocation event, with real services over a fake API that knows location 8 as "Greenhouse A". */
function deleteEvent(form: Record<string, string>, deleteStatus = 200) {
	const calls: ApiCall[] = [];
	const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = String(input);
		const method = init?.method ?? 'GET';
		calls.push({ method, url });
		if (!url.includes('/locations/8')) {
			return json({ message: 'unexpected call' }, 404);
		}
		if (method === 'GET') {
			return json({ location_id: 8, name: 'Greenhouse A' });
		}
		return deleteStatus === 200
			? json({ location_id: 8 })
			: json(
					{ statusCode: deleteStatus, message: 'This location still has 1 device.' },
					deleteStatus
				);
	});

	const services = createServerServices({
		fetch,
		authToken: () => 'jwt-token',
		config: testPublicConfig(),
		serverConfig: testServerConfig()
	});
	const event = {
		request: new Request('http://localhost/locations/8/settings?/deleteLocation', {
			method: 'POST',
			body: new URLSearchParams(form)
		}),
		locals: {
			jwtString: 'jwt-token',
			services,
			config: { public: testPublicConfig(), server: testServerConfig() }
		},
		params: { location_id: '8' }
	};
	return { event: event as unknown as Parameters<typeof deleteLocation>[0], calls };
}

const deletes = (calls: ApiCall[]) => calls.filter((call) => call.method === 'DELETE');

describe('deleteLocation action', () => {
	it('checks the typed name against the real name and never deletes on a mismatch', async () => {
		const { event, calls } = deleteEvent({
			confirmLocationName: 'Greenhouse B',
			acknowledged: 'yes'
		});

		await expect(deleteLocation(event)).resolves.toMatchObject({
			status: 400,
			data: { action: 'deleteLocation', message: m.locations_delete_confirm_mismatch() }
		});
		expect(deletes(calls)).toHaveLength(0);
	});

	it('requires the acknowledgement', async () => {
		const { event, calls } = deleteEvent({ confirmLocationName: 'Greenhouse A' });

		await expect(deleteLocation(event)).resolves.toMatchObject({
			status: 400,
			data: { message: m.locations_delete_acknowledge_required() }
		});
		expect(deletes(calls)).toHaveLength(0);
	});

	it('deletes once confirmed and redirects to the locations list', async () => {
		const { event, calls } = deleteEvent({
			confirmLocationName: ' greenhouse a ',
			acknowledged: 'yes'
		});

		let thrown: unknown;
		try {
			await deleteLocation(event);
		} catch (error) {
			thrown = error;
		}
		expect(isRedirect(thrown)).toBe(true);
		expect(thrown).toMatchObject({ status: 303, location: '/locations' });
		expect(deletes(calls)).toHaveLength(1);
		expect(calls).toEqual([
			{ method: 'GET', url: 'https://api.cropwatch.test/locations/8' },
			{ method: 'DELETE', url: 'https://api.cropwatch.test/locations/8' }
		]);
	});

	it('explains that devices remain when the API refuses with 409', async () => {
		const { event } = deleteEvent(
			{ confirmLocationName: 'Greenhouse A', acknowledged: 'yes' },
			409
		);

		await expect(deleteLocation(event)).resolves.toMatchObject({
			status: 409,
			data: { action: 'deleteLocation', message: m.locations_delete_not_empty() }
		});
	});
});
