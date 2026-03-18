import { env } from '$env/dynamic/private';
import { ApiService } from '$lib/api/api.service';
import type { DeviceDto } from '$lib/api/api.dtos';
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
				readString(payload.detail) || readString(payload.message) || 'Libellus request failed.'
			);
		}

		return readString(await response.text()) || 'Libellus request failed.';
	} catch {
		return 'Libellus request failed.';
	}
}

export const GET: RequestHandler = async ({ fetch, locals, params, url }) => {
	const authToken = locals.jwtString ?? null;
	const devEui = readString(params.dev_eui);
	const sensorKey = readString(params.sensor_key);
	const apiToken = readString(env.PRIVATE_LIBELLUS_API_TOKEN);
	const baseUrl = getLibellusBaseUrl();

	if (!authToken) {
		return new Response('You must be logged in to download sensor certificates.', { status: 401 });
	}

	if (!devEui || (sensorKey !== 'sensor' && sensorKey !== 'sensor2')) {
		return new Response('Invalid certificate target.', { status: 400 });
	}

	if (!apiToken) {
		return new Response('PRIVATE_LIBELLUS_API_TOKEN is not configured.', { status: 500 });
	}

	if (!baseUrl) {
		return new Response('PRIVATE_LIBELLUS_BASE_URL is not configured.', { status: 500 });
	}

	const api = new ApiService({ fetchFn: fetch, authToken });
	const device = await api.getDevice(devEui).catch(() => null);

	if (!device) {
		return new Response('Device not found.', { status: 404 });
	}

	const sensorSerial = getSensorSerial(device, sensorKey);
	if (!sensorSerial) {
		return new Response('No sensor serial is configured for this device.', { status: 404 });
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
