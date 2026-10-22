import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceDto } from '$lib/api/api.dtos';
import { ApiError } from '$lib/api/api-error';
import type { FetchFn } from '$lib/api/http/fetch-http-client';
import { m } from '$lib/paraglide/messages.js';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig, textResponse } from '$lib/testing/http';
import {
	TEST_JWT,
	testEvent,
	testLocals,
	testServerConfig,
	type TestLocals
} from '$lib/testing/server';
import { GET } from './+server';

type Event = Parameters<typeof GET>[0];

const PARAMS = { location_id: '8', dev_eui: 'DEV-1', sensor_key: 'sensor' };
const PAGE_URL = 'http://localhost/locations/8/devices/DEV-1/settings/libellus-certificates/sensor';
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

const SENSOR = {
	dev_eui: 'DEV-1',
	name: 'Air sensor',
	sensor1_serial: 'SN-40',
	sensor2_serial: 'SN-43',
	cw_device_type: { id: 1, name: 'Air', model: 'CW-AIR', manufacturer: 'CropWatch' }
} as DeviceDto;

async function get(
	locals: TestLocals,
	{ params = PARAMS, url = PAGE_URL }: { params?: Record<string, string>; url?: string } = {}
) {
	const response = await GET(testEvent<Event>({ locals, params, url }));
	return { response, status: response.status, text: () => response.text() };
}

/** Mock services for a signed-in caller whose device lookup returns `device`. */
function withDevice(device: DeviceDto = SENSOR) {
	const locals = testLocals();
	locals.services.devices.getDevice.mockResolvedValue(device);
	return locals;
}

function realLocals(fetch: FetchFn, libellus = testServerConfig().libellus): TestLocals {
	const services = createServerServices({
		fetch,
		authToken: () => TEST_JWT,
		config: testPublicConfig(),
		serverConfig: testServerConfig({ libellus })
	});
	return { ...testLocals(), services } as unknown as TestLocals;
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('GET Libellus sensor certificate', () => {
	it("streams the SHT43's certificate as a PDF download", async () => {
		const locals = withDevice();
		locals.services.libellus.fetchSensorCertificate.mockResolvedValue(
			new Response(PDF, { headers: { 'content-type': 'application/pdf; version=1.7' } })
		);

		const { response } = await get(locals);

		expect(response.status).toBe(200);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(PDF);
		expect(Object.fromEntries(response.headers)).toEqual({
			'cache-control': 'no-store',
			'content-type': 'application/pdf; version=1.7',
			'content-disposition': 'attachment; filename="SHT43-SN-43-certificate.pdf"'
		});
		expect(locals.services.devices.getDevice).toHaveBeenCalledWith('DEV-1');
		expect(locals.services.libellus.fetchSensorCertificate).toHaveBeenCalledWith(
			'SHT43',
			'SN-43',
			''
		);
	});

	it.each([
		[
			'quotes, CR/LF and path separators',
			'SN"4\r\n3/\\x',
			'attachment; filename="SHT43-SN43x-certificate.pdf"'
		],
		[
			'other control characters',
			'SN\t4\u00003\u007f',
			'attachment; filename="SHT43-SN43-certificate.pdf"'
		],
		[
			'a broken UTF-16 character',
			'SN-43\ud800',
			'attachment; filename="SHT43-SN-43-certificate.pdf"'
		],
		[
			'non-ASCII characters, also sent RFC 5987-encoded',
			"SN-43é(温度)'*",
			'attachment; filename="SHT43-SN-43_(__)\'*-certificate.pdf"; ' +
				"filename*=UTF-8''SHT43-SN-43%C3%A9%28%E6%B8%A9%E5%BA%A6%29%27%2A-certificate.pdf"
		]
	])('keeps %s out of the download file name', async (_case, serial, disposition) => {
		const locals = withDevice({ ...SENSOR, sensor2_serial: serial } as DeviceDto);
		locals.services.libellus.fetchSensorCertificate.mockResolvedValue(new Response(PDF));

		const { response } = await get(locals);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-disposition')).toBe(disposition);
		// Libellus is still asked for the serial on record.
		expect(locals.services.libellus.fetchSensorCertificate).toHaveBeenCalledWith(
			'SHT43',
			serial,
			''
		);
	});

	it('passes the trimmed certificate type on and defaults the content type to PDF', async () => {
		const locals = withDevice();
		locals.services.libellus.fetchSensorCertificate.mockResolvedValue(new Response(PDF));

		const { response } = await get(locals, {
			params: { ...PARAMS, dev_eui: ' DEV-1 ', sensor_key: ' sensor ' },
			url: `${PAGE_URL}?type=%20calibration%20`
		});

		expect(response.headers.get('content-type')).toBe('application/pdf');
		expect(locals.services.devices.getDevice).toHaveBeenCalledWith('DEV-1');
		expect(locals.services.libellus.fetchSensorCertificate).toHaveBeenCalledWith(
			'SHT43',
			'SN-43',
			'calibration'
		);
	});

	it.each([
		['error', { error: ' Not found ', detail: 'd', message: 'm' }, 'Not found'],
		['detail', { detail: 'Bad serial', message: 'm' }, 'Bad serial'],
		['message', { message: 'Quota exceeded' }, 'Quota exceeded'],
		['no message', { code: 7 }, null]
	])(
		"answers with Libellus's status and the JSON %s",
		async (_case, payload, message: string | null) => {
			const locals = withDevice();
			locals.services.libellus.fetchSensorCertificate.mockResolvedValue(
				jsonResponse(payload, { status: 404 })
			);

			const { status, text } = await get(locals);

			expect(status).toBe(404);
			expect(await text()).toBe(message ?? m.devices_libellus_request_failed());
		}
	);

	it("answers with Libellus's text error, or the fallback when it is empty or unreadable", async () => {
		for (const [reply, message] of [
			[textResponse(' Upstream timeout ', { status: 504 }), 'Upstream timeout'],
			[textResponse('   ', { status: 503 }), m.devices_libellus_request_failed()],
			[new Response(null, { status: 500 }), m.devices_libellus_request_failed()],
			[
				textResponse('{not json', { status: 502, contentType: 'application/json' }),
				m.devices_libellus_request_failed()
			]
		] as const) {
			const locals = withDevice();
			locals.services.libellus.fetchSensorCertificate.mockResolvedValue(reply);

			const { status, text } = await get(locals);

			expect(status).toBe(reply.status);
			expect(await text()).toBe(message);
		}
	});

	it('refuses without a session, before anything else', async () => {
		const locals = testLocals({ jwtString: null });
		locals.services.libellus.configurationProblem = 'missing-api-token';

		const { status, text } = await get(locals, { params: { ...PARAMS, sensor_key: 'other' } });

		expect(status).toBe(401);
		expect(await text()).toBe(m.devices_sensor_certificate_requires_login());
		expect(locals.services.devices.getDevice).not.toHaveBeenCalled();
	});

	it('refuses a missing DevEUI or a sensor other than the SHT43, before the configuration', async () => {
		for (const params of [
			{ ...PARAMS, dev_eui: ' ' },
			{ location_id: '8', sensor_key: 'sensor' },
			{ ...PARAMS, sensor_key: 'sensor1' }
		]) {
			const locals = testLocals();
			locals.services.libellus.configurationProblem = 'missing-api-token';

			const { status, text } = await get(locals, { params });

			expect(status).toBe(400);
			expect(await text()).toBe(m.devices_invalid_certificate_target());
			expect(locals.services.devices.getDevice).not.toHaveBeenCalled();
		}
	});

	it('fails with 500 when Libellus is not configured, without looking up the device', async () => {
		for (const [problem, message] of [
			['missing-api-token', m.devices_libellus_api_token_missing()],
			['missing-base-url', m.devices_libellus_base_url_missing()]
		] as const) {
			const locals = testLocals();
			locals.services.libellus.configurationProblem = problem;

			const { status, text } = await get(locals);

			expect(status).toBe(500);
			expect(await text()).toBe(message);
			expect(locals.services.devices.getDevice).not.toHaveBeenCalled();
		}
	});

	it('answers 404 when the device cannot be loaded', async () => {
		for (const failure of [new ApiError(404, 'Not Found', {}), new TypeError('Failed to fetch')]) {
			const locals = testLocals();
			locals.services.devices.getDevice.mockRejectedValue(failure);

			const { status, text } = await get(locals);

			expect(status).toBe(404);
			expect(await text()).toBe(m.devices_not_found());
			expect(locals.services.libellus.fetchSensorCertificate).not.toHaveBeenCalled();
		}
	});

	it('refuses a device not made by CropWatch, and one without an SHT43 serial', async () => {
		const other = withDevice({
			...SENSOR,
			cw_device_type: { ...SENSOR.cw_device_type, manufacturer: 'Seeed' }
		});
		const unsupported = await get(other);
		expect(unsupported.status).toBe(400);
		expect(await unsupported.text()).toBe(m.devices_sensor_certificate_unsupported_device());

		const noSerial = withDevice({ ...SENSOR, sensor2_serial: ' ' });
		const missing = await get(noSerial);
		expect(missing.status).toBe(404);
		expect(await missing.text()).toBe(m.devices_no_sensor_serial_configured());

		for (const locals of [other, noSerial]) {
			expect(locals.services.libellus.fetchSensorCertificate).not.toHaveBeenCalled();
		}
	});

	it('asks the API for the device as the session and Libellus for the PDF with its token', async () => {
		const fake = createFakeFetch(({ path }) =>
			path === '/devices/DEV-1'
				? jsonResponse({ ...SENSOR, sensor2_serial: 'SN/43 x' })
				: new Response(PDF, { headers: { 'content-type': 'application/pdf' } })
		);

		const { response } = await get(realLocals(fake.fetch), { url: `${PAGE_URL}?type=calibration` });

		expect(response.status).toBe(200);
		// The serial goes to Libellus as it is, but never into the file name with its slash.
		expect(response.headers.get('content-disposition')).toBe(
			'attachment; filename="SHT43-SN43 x-certificate.pdf"'
		);
		expect(fake.requests.map(({ method, url }) => `${method} ${url}`)).toEqual([
			'GET https://api.cropwatch.test/devices/DEV-1',
			'GET https://libellus.test/api/SHT43/sensors/SN%2F43%20x/certificate?format=application%2Fpdf&type=calibration'
		]);
		expect(fake.requests[0].headers.get('Authorization')).toBe(`Bearer ${TEST_JWT}`);
		expect(fake.requests[1].headers.get('Authorization')).toBe('Token libellus-token');
	});

	it('checks the real Libellus configuration: the token before the base URL', async () => {
		for (const [libellus, message] of [
			[{ baseUrl: '', apiToken: '' }, m.devices_libellus_api_token_missing()],
			[{ baseUrl: 'https://libellus.test', apiToken: '' }, m.devices_libellus_api_token_missing()],
			[{ baseUrl: '', apiToken: 'token' }, m.devices_libellus_base_url_missing()]
		] as const) {
			const fake = createFakeFetch();

			const { status, text } = await get(realLocals(fake.fetch, libellus));

			expect(status).toBe(500);
			expect(await text()).toBe(message);
			expect(fake.requests).toHaveLength(0);
		}
	});
});
