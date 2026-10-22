import { ApiError } from '$lib/api/api-error';
import type { ReportFormContextDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const authToken = locals.jwtString ?? null;
	const userId = locals.jwt?.sub ?? null;
	const templateId = Number(params.id);

	if (!authToken || !userId) {
		error(401, m.error_unauthorized_title());
	}

	if (!Number.isInteger(templateId) || templateId <= 0) {
		error(400, m.reports_new_invalid_template_id());
	}

	const { reports, billing } = locals.services;
	const entitlementsPromise = billing.getBillingEntitlements().catch(() => null);
	let context: ReportFormContextDto;
	try {
		context = await reports.getReportFormContext(templateId);
	} catch (loadError) {
		if (loadError instanceof ApiError && loadError.status === 404) {
			error(404, m.reports_new_report_template_not_found());
		}
		console.error('Failed to load report template:', loadError);
		error(500, m.reports_new_load_failed());
	}

	if (!context.template) {
		error(404, m.reports_new_report_template_not_found());
	}

	return { context, entitlements: await entitlementsPromise, authToken };
};
