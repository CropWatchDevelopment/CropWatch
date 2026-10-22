import type { PaginationQuery } from '$lib/api/api.dtos';
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
			latestData: null
		};
	}

	const { telemetry } = locals.services;

	const pagination: PaginationQuery = {
		skip: 0,
		take: 144
	};

	// A newly registered device has no rows yet and the API answers 404 —
	// render the empty device page instead of letting the 404 become a 500.
	const [deviceData, latestData] = await Promise.all([
		telemetry
			.getDeviceData(params.dev_eui, pagination, { suppressNotFoundError: true })
			.catch((error) => {
				if (error instanceof ApiError && error.status === 404) return [];
				throw error;
			}),
		loadLatestDeviceDataOrNull(telemetry, params.dev_eui)
	]);

	return {
		deviceData: deviceData ?? [],
		latestData: latestData ?? null
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
