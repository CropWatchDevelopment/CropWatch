import type { LibellusConfig } from './config';

/** Why Libellus calls cannot work; checked in this order. */
export type LibellusConfigurationProblem = 'missing-api-token' | 'missing-base-url';

/** Calibration certificates from Libellus (`locals.services.libellus`). */
export interface LibellusGateway {
	/** `null` when Libellus is configured. */
	readonly configurationProblem: LibellusConfigurationProblem | null;
	/** Requests a sensor's calibration certificate as a PDF; resolves with the raw response. */
	fetchSensorCertificate(
		model: string,
		serial: string,
		certificateType?: string
	): Promise<Response>;
}

/** @param fetchFn - The request's `event.fetch`. */
export function createLibellusGateway(
	config: LibellusConfig,
	fetchFn: typeof fetch
): LibellusGateway {
	const { apiToken } = config;
	const baseUrl = !config.baseUrl
		? ''
		: config.baseUrl.endsWith('/')
			? config.baseUrl
			: `${config.baseUrl}/`;

	return {
		configurationProblem: !apiToken ? 'missing-api-token' : !baseUrl ? 'missing-base-url' : null,

		fetchSensorCertificate(model, serial, certificateType) {
			const url = new URL(
				`${encodeURIComponent(model)}/sensors/${encodeURIComponent(serial)}/certificate`,
				baseUrl
			);
			url.searchParams.set('format', 'application/pdf');
			if (certificateType) {
				url.searchParams.set('type', certificateType);
			}

			return fetchFn(url, {
				method: 'GET',
				headers: {
					Authorization: `Token ${apiToken}`
				}
			});
		}
	};
}
