import { ApiService, ApiServiceError } from '$lib/api/api.service';
import type { DeviceDto, ReportTemplateDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { error } from '@sveltejs/kit';
import { isReportPeriodEditable, parseReportPeriod } from '../../../../report-period';
import type { PageServerLoad } from './$types';

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// Longest real report window is one month; anything beyond ~2 months is a
// malformed URL. Mirrors MAX_REGENERATION_PERIOD_DAYS on the API.
const MAX_PERIOD_DAYS = 62;

export const load: PageServerLoad = async ({ locals, fetch, params, url }) => {
	const authToken = locals.jwtString ?? null;
	const userId = locals.jwt?.sub ?? null;
	const templateId = Number(params.id);
	const devEui = params.dev_eui;

	if (!authToken || !userId) {
		error(401, m.error_unauthorized_title());
	}

	if (!Number.isInteger(templateId) || templateId <= 0) {
		error(400, m.reports_new_invalid_template_id());
	}

	const start = url.searchParams.get('start') ?? '';
	const end = url.searchParams.get('end') ?? '';
	const file = url.searchParams.get('file') ?? '';

	if (!DATE_PARAM_PATTERN.test(start) || !DATE_PARAM_PATTERN.test(end) || end < start) {
		error(400, m.reports_new_edit_data_invalid_period());
	}
	const periodDays = (Date.parse(end) - Date.parse(start)) / (24 * 60 * 60 * 1000);
	if (!Number.isFinite(periodDays) || periodDays > MAX_PERIOD_DAYS) {
		error(400, m.reports_new_edit_data_invalid_period());
	}

	// The file param names the original storage object the regeneration will
	// replace; its encoded period must agree with the query params so a
	// hand-edited URL can't enqueue a mismatched regeneration.
	const filePeriod = parseReportPeriod(file);
	if (!filePeriod || filePeriod.start !== start || filePeriod.end !== end) {
		error(400, m.reports_new_edit_data_invalid_period());
	}

	// Guards direct URL entry past the retention cutoff (the history dialog
	// disables its Edit button using the same helper).
	if (!isReportPeriodEditable(end)) {
		error(400, m.reports_new_edit_data_too_old());
	}

	const api = new ApiService({ fetchFn: fetch, authToken });
	let template: ReportTemplateDto;
	try {
		template = await api.getReportTemplate(templateId);
	} catch (loadError) {
		if (loadError instanceof ApiServiceError && loadError.status === 404) {
			error(404, m.reports_new_report_template_not_found());
		}
		console.error('Failed to load report template:', loadError);
		error(500, m.reports_new_load_failed());
	}

	const assignment = template.assignments.find((entry) => entry.devEui === devEui);
	if (!assignment) {
		error(404, m.reports_new_report_template_not_found());
	}

	// Notes only exist for air devices (cw_air_annotations); every other device
	// type has nothing to edit here.
	let device: DeviceDto;
	try {
		device = await api.getDevice(devEui);
	} catch (loadError) {
		if (loadError instanceof ApiServiceError && loadError.status === 404) {
			error(404, m.reports_new_report_template_not_found());
		}
		console.error('Failed to load device:', loadError);
		error(500, m.reports_new_load_failed());
	}
	if (device.cw_device_type?.data_table_v2 !== 'cw_air_data') {
		error(400, m.reports_new_edit_data_not_air());
	}

	return {
		authToken,
		template,
		devEui,
		deviceName: assignment.deviceName ?? device.name ?? devEui,
		start,
		end,
		file
	};
};
