import { describe, expect, it, vi } from 'vitest';
import { ApiService } from './api.service';

function createJsonResponse(payload: unknown): Response {
	return new Response(JSON.stringify(payload), {
		status: 200,
		headers: {
			'content-type': 'application/json'
		}
	});
}

describe('ApiService created_at timezone handling', () => {
	it('converts response created_at fields recursively using the configured offset', async () => {
		const fetchFn = vi.fn(async () =>
			createJsonResponse({
				created_at: '2026-03-08 12:00:00',
				nested: {
					Created_at: '2026-03-08T13:30:45'
				},
				items: [{ created_at: '2026-03-08T23:15:00Z' }, { created_at: '2026-03-09T00:45:00+00:00' }]
			})
		) as typeof fetch;

		const api = new ApiService({
			baseUrl: 'https://example.com',
			fetchFn,
			timeZoneOffset: -5
		});

		const result = await api.getDeviceLatestData('device-123');

		expect(result).toEqual({
			created_at: '2026-03-08T07:00:00.000-05:00',
			nested: {
				Created_at: '2026-03-08T08:30:45.000-05:00'
			},
			items: [
				{ created_at: '2026-03-08T18:15:00.000-05:00' },
				{ created_at: '2026-03-08T19:45:00.000-05:00' }
			]
		});
	});

	it('serializes created_at fields back to UTC before sending request bodies', async () => {
		let serializedBody = '';

		const fetchFn = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
			serializedBody = String(init?.body ?? '');
			return createJsonResponse(null);
		}) as typeof fetch;

		const api = new ApiService({
			baseUrl: 'https://example.com',
			fetchFn,
			timeZoneOffset: -5
		});

		await api.createAirNote({
			note: 'Check telemetry row',
			created_at: '2026-03-08T07:00:00.000-05:00',
			dev_eui: 'device-123'
		});

		expect(JSON.parse(serializedBody)).toEqual({
			note: 'Check telemetry row',
			created_at: '2026-03-08T12:00:00.000Z',
			dev_eui: 'device-123'
		});
	});
});
