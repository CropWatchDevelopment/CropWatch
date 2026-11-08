import type { AiRecommendationDto, CropTypeDetailDto, PaginationQuery } from '$lib/api/api.dtos';
import { ApiError, apiErrorMessage, apiErrorStatus } from '$lib/api/api-error';
import type { TelemetryRepository } from '$lib/api/repositories/telemetry.repository';
import { m } from '$lib/paraglide/messages.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

async function loadLatestDeviceDataOrNull(
	telemetry: TelemetryRepository,
	devEui: string
): Promise<Record<string, unknown> | null> {
	try {
		return await telemetry.getDeviceLatestData(devEui, { suppressNotFoundError: true });
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) {
			return null;
		}

		throw error;
	}
}

export const load: PageServerLoad = async ({ params, parent, locals }) => {
	const parentData = await parent();
	const authToken = parentData.authToken ?? null;
	const locationId = Number.parseInt(params.location_id, 10);

	if (!authToken || !Number.isFinite(locationId)) {
		return {
			deviceData: [],
			latestData: null,
			crop: null as CropTypeDetailDto | null,
			aiReport: null as AiRecommendationDto | null
		};
	}

	const { aiRecommendations, crops, telemetry } = locals.services;
	// A soil sensor's crop, for its growing targets; the page works without it.
	const cropTypeId =
		parentData.dataTable === 'cw_soil_data' && typeof parentData.device?.crop_type_id === 'number'
			? parentData.device.crop_type_id
			: null;

	const pagination: PaginationQuery = {
		skip: 0,
		take: 144
	};

	// A newly registered device has no rows yet and the API answers 404 —
	// render the empty device page instead of letting the 404 become a 500.
	// The AI worker reports only on soil sensors with a crop set; like the crop,
	// the newest daily report is optional and the page works without it.
	const [deviceData, latestData, crop, aiReport] = await Promise.all([
		telemetry
			.getDeviceData(params.dev_eui, pagination, { suppressNotFoundError: true })
			.catch((error) => {
				if (error instanceof ApiError && error.status === 404) return [];
				throw error;
			}),
		loadLatestDeviceDataOrNull(telemetry, params.dev_eui),
		cropTypeId === null
			? Promise.resolve(null)
			: crops.getCrop(cropTypeId).catch(() => null as CropTypeDetailDto | null),
		cropTypeId === null
			? Promise.resolve(null)
			: aiRecommendations
					.getAiRecommendations(params.dev_eui, { type: 'daily', limit: 1 })
					.then((reports) => reports?.[0] ?? null)
					.catch(() => null as AiRecommendationDto | null)
	]);

	return {
		deviceData: deviceData ?? [],
		latestData: latestData ?? null,
		crop,
		aiReport
	};
};

export const actions: Actions = {
	saveDataNote: async ({ request, locals }) => {
		const authToken = locals.jwtString ?? null;
		const data = await request.formData();
		const noteContent = data.get('note')?.toString().trim() ?? '';
		const noteTitle = data.get('title')?.toString().trim() ?? '';
		const includeInReport = data.get('include_in_report')?.toString() !== 'false';
		const telemetryId = data.get('created_at')?.toString() ?? '';
		const devEui = data.get('dev_eui')?.toString() ?? '';

		if (!authToken) {
			return fail(401, {
				action: 'saveDataNote',
				message: m.devices_save_note_requires_login()
			});
		}

		try {
			await locals.services.airNotes.createAirNote({
				note: noteContent,
				title: noteTitle,
				include_in_report: includeInReport,
				created_at: telemetryId,
				dev_eui: devEui
			});
		} catch (error) {
			return fail(apiErrorStatus(error, 502), {
				action: 'saveDataNote',
				message: apiErrorMessage(error, m.devices_save_note_failed())
			});
		}

		return {
			success: true,
			message: m.devices_save_note_success()
		};
	}
};
