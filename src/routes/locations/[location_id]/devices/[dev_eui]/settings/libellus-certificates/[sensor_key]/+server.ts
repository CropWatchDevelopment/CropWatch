import { env } from '$env/dynamic/private';
import { ApiService } from '$lib/api/api.service';
import type { DeviceDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import type { RequestHandler } from './$types';

function readString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function getSensorSerial(device: DeviceDto, sensorKey: string): string {
	const record = device as Record<string, unknown>;
	return sensorKey === 'sensor2'
		? readString(record.sensor2_serial)
		: readString(record.sensor1_serial) || readString(record.sensor_serial);
}

function getProductName(device: DeviceDto): string {
	return readString(device.cw_device_type?.model);
}

function getLibellusBaseUrl(): string {
	const baseUrl = readString(env.PRIVATE_LIBELLUS_BASE_URL);
	if (!baseUrl) return '';
	return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

async function readErrorMessage(response: Response): Promise<string> {
	try {
		const contentType = response.headers.get('content-type') ?? '';
		if (contentType.includes('application/json')) {
			const payload = (await response.json()) as Record<string, unknown>;
			return (
				readString(payload.detail) ||
				readString(payload.message) ||
				m.devices_libellus_request_failed()
			);
		}

		return readString(await response.text()) || m.devices_libellus_request_failed();
	} catch {
		return m.devices_libellus_request_failed();
	}
}

export const GET: RequestHandler = async ({ fetch, locals, params, url }) => {
	const authToken = locals.jwtString ?? null;
	const devEui = readString(params.dev_eui);
	const sensorKey = readString(params.sensor_key);
	const apiToken = readString(env.PRIVATE_LIBELLUS_API_TOKEN);
	const baseUrl = getLibellusBaseUrl();

	if (!authToken) {
		return new Response(m.devices_sensor_certificate_requires_login(), { status: 401 });
	}

	if (!devEui || (sensorKey !== 'sensor' && sensorKey !== 'sensor2')) {
		return new Response(m.devices_invalid_certificate_target(), { status: 400 });
	}

	if (!apiToken) {
		return new Response(m.devices_libellus_api_token_missing(), { status: 500 });
	}

	if (!baseUrl) {
		return new Response(m.devices_libellus_base_url_missing(), { status: 500 });
	}

	const api = new ApiService({ fetchFn: fetch, authToken });
	const device = await api.getDevice(devEui).catch(() => null);

	if (!device) {
		return new Response(m.devices_not_found(), { status: 404 });
	}

	const sensorSerial = getSensorSerial(device, sensorKey);
	if (!sensorSerial) {
		return new Response(m.devices_no_sensor_serial_configured(), { status: 404 });
	}

	const libellusUrl = new URL(
		`${encodeURIComponent('SHT43')}/sensors/${encodeURIComponent(sensorSerial)}/certificate`,
		baseUrl
	);
	libellusUrl.searchParams.set('format', 'application/pdf');

	const certificateType = readString(url.searchParams.get('type'));
	if (certificateType) {
		libellusUrl.searchParams.set('type', certificateType);
	}

	const response = await fetch(libellusUrl, {
		method: 'GET',
		headers: {
			Authorization: `Token ${apiToken}`
		}
	});

	if (!response.ok) {
		return new Response(await readErrorMessage(response), { status: response.status });
	}

	return new Response(response.body, {
		status: 200,
		headers: {
			'cache-control': 'no-store',
			'content-type': response.headers.get('content-type') ?? 'application/pdf',
			'content-disposition': `attachment; filename="SHT43-${sensorSerial}-certificate.pdf"`
		}
	});
};
