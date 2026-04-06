import { ApiServiceError, type PaginationQuery, ApiService } from '$lib/api/api.service';
import { m } from '$lib/paraglide/messages.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

async function loadLatestDeviceDataOrNull(
	api: ApiService,
	devEui: string
): Promise<Record<string, unknown> | null> {
	try {
		return await api.getDeviceLatestData(devEui, { suppressNotFoundError: true });
	} catch (error) {
		if (error instanceof ApiServiceError && error.status === 404) {
			return null;
		}

		throw error;
	}
}

export const load: PageServerLoad = async ({ params, fetch, parent }) => {
	const parentData = await parent();
	const authToken = parentData.authToken ?? null;
	const locationId = Number.parseInt(params.location_id, 10);

	if (!authToken || !Number.isFinite(locationId)) {
		return {
			deviceData: [],
			latestData: null
		};
	}

	const api = new ApiService({
		fetchFn: fetch,
		authToken
	});

	const pagination: PaginationQuery = {
		skip: 0,
		take: 144
	};

	const [deviceData, latestData] = await Promise.all([
		api.getDeviceData(params.dev_eui, pagination),
		loadLatestDeviceDataOrNull(api, params.dev_eui)
	]);

	return {
		deviceData: deviceData ?? [],
		latestData: latestData ?? null
	};
};

export const actions: Actions = {
	saveDataNote: async ({ request, fetch, locals }) => {
		const authToken = locals.jwtString ?? null;
		const data = await request.formData();
		const noteContent = data.get('note')?.toString() ?? '';
		const telemetryId = data.get('created_at')?.toString() ?? '';
		const devEui = data.get('dev_eui')?.toString() ?? '';

		if (!authToken) {
			return fail(401, {
				action: 'saveDataNote',
				message: m.devices_save_note_requires_login()
			});
		}

		const api = new ApiService({
			fetchFn: fetch,
			authToken
		});

		try {
			await api.createAirNote({
				note: noteContent,
				created_at: telemetryId,
				dev_eui: devEui
			});
		} catch (error) {
			const responsePayload = error instanceof ApiServiceError ? error.payload : error;
			return fail(error instanceof ApiServiceError ? error.status : 502, {
				action: 'saveDataNote',
				message: readApiError(responsePayload, m.devices_save_note_failed())
			});
		}

		return {
			success: true,
			message: m.devices_save_note_success()
		};
	}
};

function readApiError(payload: unknown, fallback: string): string {
	if (payload && typeof payload === 'object') {
		const payloadRecord = payload as Record<string, unknown>;
		const message = payloadRecord.message;
		if (typeof message === 'string' && message.length > 0) return message;
		if (Array.isArray(message)) {
			const text = message
				.filter((m): m is string => typeof m === 'string' && m.length > 0)
				.join(', ');
			if (text) return text;
		}

		return readApiError(payloadRecord.payload, fallback);
	}
	return fallback;
}
