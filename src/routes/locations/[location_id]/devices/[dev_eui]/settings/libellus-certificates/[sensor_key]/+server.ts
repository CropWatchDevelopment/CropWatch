import { m } from '$lib/paraglide/messages.js';
import { deviceSupportsSensorCertificate, getSht43Serial } from '../../device-settings.server';
import type { RequestHandler } from './$types';

function readString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * The download's `Content-Disposition`. The serial comes from the device
 * record, so it may not hold what a header or a file name cannot: quotes,
 * control characters (CR/LF), path separators and lone surrogates are dropped.
 * A name with other non-ASCII characters is also sent RFC 5987-encoded in
 * `filename*`, with `_` for them in the plain `filename`.
 */
function certificateDisposition(serial: string): string {
	const name = `SHT43-${serial.replace(/["\\/\p{Cc}\p{Cs}]/gu, '')}-certificate.pdf`;
	const asciiName = name.replace(/[^\x20-\x7e]/g, '_');
	if (asciiName === name) return `attachment; filename="${name}"`;

	const encoded = encodeURIComponent(name).replace(
		/['()*]/g,
		(char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
	);
	return `attachment; filename="${asciiName}"; filename*=UTF-8''${encoded}`;
}

async function readErrorMessage(response: Response): Promise<string> {
	try {
		const contentType = response.headers.get('content-type') ?? '';
		if (contentType.includes('application/json')) {
			const payload = (await response.json()) as Record<string, unknown>;
			return (
				readString(payload.error) ||
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

export const GET: RequestHandler = async ({ locals, params, url }) => {
	const authToken = locals.jwtString ?? null;
	const devEui = readString(params.dev_eui);
	const sensorKey = readString(params.sensor_key);
	const { devices, libellus } = locals.services;

	if (!authToken) {
		return new Response(m.devices_sensor_certificate_requires_login(), { status: 401 });
	}

	if (!devEui || sensorKey !== 'sensor') {
		return new Response(m.devices_invalid_certificate_target(), { status: 400 });
	}

	if (libellus.configurationProblem === 'missing-api-token') {
		return new Response(m.devices_libellus_api_token_missing(), { status: 500 });
	}

	if (libellus.configurationProblem === 'missing-base-url') {
		return new Response(m.devices_libellus_base_url_missing(), { status: 500 });
	}

	const device = await devices.getDevice(devEui).catch(() => null);

	if (!device) {
		return new Response(m.devices_not_found(), { status: 404 });
	}

	if (!deviceSupportsSensorCertificate(device)) {
		return new Response(m.devices_sensor_certificate_unsupported_device(), { status: 400 });
	}

	const sensorSerial = getSht43Serial(device);
	if (!sensorSerial) {
		return new Response(m.devices_no_sensor_serial_configured(), { status: 404 });
	}

	const certificateType = readString(url.searchParams.get('type'));
	const response = await libellus.fetchSensorCertificate('SHT43', sensorSerial, certificateType);

	if (!response.ok) {
		return new Response(await readErrorMessage(response), { status: response.status });
	}

	return new Response(response.body, {
		status: 200,
		headers: {
			'cache-control': 'no-store',
			'content-type': response.headers.get('content-type') ?? 'application/pdf',
			'content-disposition': certificateDisposition(sensorSerial)
		}
	});
};
