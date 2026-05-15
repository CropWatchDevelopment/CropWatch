import { ApiService, ApiServiceError } from '$lib/api/api.service';
import { m } from '$lib/paraglide/messages.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch, params }) => {
	const authToken = locals.jwtString ?? null;
	const userId = locals.jwt?.sub ?? null;
	const templateId = Number(params.id);

	if (!authToken || !userId) {
		error(401, m.error_unauthorized_title());
	}

	if (!Number.isInteger(templateId) || templateId <= 0) {
		error(400, m.rules_new_invalid_template_id());
	}

	const api = new ApiService({ fetchFn: fetch, authToken });
	let template;
	try {
		template = await api.getRuleTemplate(templateId);
	} catch (loadError) {
		if (loadError instanceof ApiServiceError && loadError.status === 404) {
			error(404, m.rules_new_rule_template_not_found());
		}

		console.error('Failed to load rule template:', loadError);
		error(500, m.rules_new_load_failed());
	}

	const [devices, actionTypes] = await Promise.all([
		api.getAllDevices().catch(() => []),
		api.getRuleTemplateActionTypes().catch(() => [])
	]);

	return { template, devices, actionTypes, authToken };
};
