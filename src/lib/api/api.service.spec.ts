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

describe('ApiService list response normalization', () => {
	it('normalizes wrapped location device payloads exposed under result', async () => {
		const fetchFn = vi.fn(async () =>
			createJsonResponse({
				result: [
					{
						dev_eui: 'dev-1',
						name: 'North sensor',
						created_at: '2026-03-12T08:00:00Z',
						location_id: 42
					},
					{
						dev_eui: 'dev-2',
						name: 'South sensor',
						created_at: '2026-03-12T08:05:00Z',
						location_id: 42
					}
				],
				count: 2
			})
		) as typeof fetch;

		const api = new ApiService({
			baseUrl: 'https://example.com',
			fetchFn
		});

		const result = await api.getAllLocationDevices(42);

		expect(result).toEqual({
			data: [
				{
					dev_eui: 'dev-1',
					name: 'North sensor',
					created_at: '2026-03-12T08:00:00.000+00:00',
					location_id: 42
				},
				{
					dev_eui: 'dev-2',
					name: 'South sensor',
					created_at: '2026-03-12T08:05:00.000+00:00',
					location_id: 42
				}
			],
			total: 2
		});
	});

	it('normalizes wrapped latest primary device payloads for the dashboard', async () => {
		const fetchFn = vi.fn(async () =>
			createJsonResponse({
				result: {
					items: [
						{
							dev_eui: 'dev-1',
							name: 'North sensor',
							created_at: '2026-03-12T08:00:00Z',
							location_id: 42,
							location_name: 'North Room',
							temperature_c: 24.2,
							humidity: 55,
							co2: 810
						},
						{
							dev_eui: 'dev-2',
							name: 'South sensor',
							created_at: '2026-03-12T08:05:00Z',
							location_id: 42,
							location_name: 'North Room',
							temperature_c: 24.1,
							humidity: 54,
							co2: 805
						}
					],
					total: 2
				}
			})
		) as typeof fetch;

		const api = new ApiService({
			baseUrl: 'https://example.com',
			fetchFn
		});

		const result = await api.getLatestPrimaryDeviceData({ skip: 0, take: 25 });

		expect(result.data).toHaveLength(2);
		expect(result.total).toBe(2);
		expect(result.data[0]).toMatchObject({
			dev_eui: 'dev-1',
			name: 'North sensor',
			location_id: 42,
			location_name: 'North Room'
		});
	});

	it('normalizes wrapped device lists for dashboard fallback enumeration', async () => {
		const fetchFn = vi.fn(async () =>
			createJsonResponse({
				result: [
					{
						dev_eui: 'dev-1',
						name: 'North sensor',
						cw_device_type: { data_table_v2: 'cw_air_data' }
					},
					{
						dev_eui: 'dev-2',
						name: 'South sensor',
						cw_device_type: { data_table_v2: 'cw_air_data' }
					}
				]
			})
		) as typeof fetch;

		const api = new ApiService({
			baseUrl: 'https://example.com',
			fetchFn
		});

		const result = await api.getDevices();

		expect(result).toHaveLength(2);
		expect(result.map((device) => device.dev_eui)).toEqual(['dev-1', 'dev-2']);
	});

	it('fetches every device page when the API paginates /devices', async () => {
		const firstPageDevices = Array.from({ length: 1000 }, (_, index) => ({
			dev_eui: `dev-${index + 1}`,
			name: `Sensor ${index + 1}`,
			cw_device_type: { data_table_v2: 'cw_air_data' }
		}));
		const secondPageDevices = [
			{
				dev_eui: 'dev-1001',
				name: 'Sensor 1001',
				cw_device_type: { data_table_v2: 'cw_air_data' }
			}
		];

		const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
			const url = new URL(String(input));
			const skip = Number(url.searchParams.get('skip') ?? 0);

			if (skip === 0) {
				return createJsonResponse({
					data: firstPageDevices,
					total: 1001
				});
			}

			return createJsonResponse({
				data: secondPageDevices,
				total: 1001
			});
		}) as typeof fetch;

		const api = new ApiService({
			baseUrl: 'https://example.com',
			fetchFn
		});

		const result = await api.getAllDevices();

		expect(fetchFn).toHaveBeenCalledTimes(2);
		expect(result).toHaveLength(1001);
		expect(result[0]?.dev_eui).toBe('dev-1');
		expect(result[1000]?.dev_eui).toBe('dev-1001');
	});
});
