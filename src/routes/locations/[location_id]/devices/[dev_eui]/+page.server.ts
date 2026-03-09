import { ApiServiceError, type PaginationQuery, ApiService } from '$lib/api/api.service';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

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
		api.getDeviceLatestData(params.dev_eui)
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
				message: 'You must be logged in to save a note.'
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
				message: readApiError(responsePayload, 'Unable to save note.')
			});
		}

		return {
			success: true,
			message: 'Note saved successfully.'
		};
	}
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
	typeof value === 'string' && value.length > 0 ? value : undefined;

const readApiError = (payload: unknown, fallback: string): string => {
	if (isRecord(payload)) {
		const message = payload.message;
		if (Array.isArray(message)) {
			const fromArray = message.map(asString).filter(Boolean).join(', ');
			if (fromArray.length > 0) return fromArray;
		}
		const fromField = asString(message);
		if (fromField) return fromField;
	}
	return fallback;
};
