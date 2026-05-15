import { ApiService } from '$lib/api/api.service';
import { m } from '$lib/paraglide/messages.js';
import { error, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	REPORT_CREATED_SUCCESS_MESSAGE,
	REPORT_UPDATED_SUCCESS_MESSAGE,
	REPORT_UPDATE_FAILED_MESSAGE,
	parsePayload,
	readApiMessage,
	readApiStatus,
	readCurrentUser,
	readReportId,
	readString,
	sanitizeReportPayload
} from './report-action.server';

export const load: PageServerLoad = async ({ locals, fetch, params, url }) => {
	const authToken = locals.jwtString ?? null;
	const reportId = readString(params.report_id);
	const isCreate = reportId === 'new';
	const currentUser = readCurrentUser(locals);

	if (!authToken) {
		error(401, m.error_unauthorized_title());
	}

	const api = new ApiService({ fetchFn: fetch, authToken });

	if (isCreate) {
		const devEui = url.searchParams.get('dev_eui')?.trim() || null;
		const devices = await api.getAllDevices().catch(() => []);
		return { authToken, currentUser, devices, devEui, report: null };
	}

	if (!reportId) {
		error(404, m.error_not_found_title());
	}

	try {
		const [report, devices] = await Promise.all([
			api.getReport(reportId),
			api.getAllDevices().catch(() => [])
		]);

		return {
			authToken,
			currentUser,
			devices,
			devEui: null,
			report
		};
	} catch (sourceError) {
		const status = readApiStatus(sourceError);
		const fallback = status === 404 ? m.error_not_found_title() : REPORT_UPDATE_FAILED_MESSAGE;
		error(status, readApiMessage(sourceError, fallback));
	}
};

export const actions: Actions = {
	default: async ({ request, locals, fetch, params }) => {
		const authToken = locals.jwtString ?? null;
		const reportId = readString(params.report_id);
		const isCreate = reportId === 'new';
		const currentUser = readCurrentUser(locals);

		if (!authToken) {
			return fail(401, { error: m.auth_not_authenticated() });
		}

		if (!isCreate && !reportId) {
			return fail(404, { error: m.error_not_found_title() });
		}

		const parsedPayload = parsePayload(await request.formData());
		if (!parsedPayload) {
			return fail(400, {
				error: m.reports_create_payload_unreadable()
			});
		}

		const sanitizedPayload = sanitizeReportPayload(parsedPayload.value, {
			report_id: isCreate ? undefined : reportId,
			user_id: currentUser?.id
		});

		if (!sanitizedPayload.name) {
			return fail(400, {
				error: m.validation_name_required(),
				payload: parsedPayload.raw
			});
		}

		if (!sanitizedPayload.dev_eui) {
			return fail(400, {
				error: m.devices_dev_eui_required(),
				payload: parsedPayload.raw
			});
		}

		if (sanitizedPayload.dev_eui.length !== 16) {
			return fail(400, {
				error: m.devices_dev_eui_invalid(),
				payload: parsedPayload.raw
			});
		}

		const api = new ApiService({
			fetchFn: fetch,
			authToken
		});

		try {
			if (isCreate) {
				const createdReport = await api.createReport(sanitizedPayload);

				return {
					success: true,
					message: REPORT_CREATED_SUCCESS_MESSAGE,
					report_id: readReportId(createdReport) ?? undefined
				};
			}

			await api.updateReport(reportId, sanitizedPayload);

			return {
				success: true,
				message: REPORT_UPDATED_SUCCESS_MESSAGE,
				report_id: reportId
			};
		} catch (sourceError) {
			const message = readApiMessage(
				sourceError,
				isCreate ? m.reports_create_failed() : REPORT_UPDATE_FAILED_MESSAGE
			);
			const status = readApiStatus(sourceError);

			return fail(status, {
				error: message,
				payload: parsedPayload.raw
			});
		}
	}
};
