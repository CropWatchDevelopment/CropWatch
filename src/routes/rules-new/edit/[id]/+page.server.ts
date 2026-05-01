import { ApiService } from '$lib/api/api.service';
import {
	getRuleTemplateForUser,
	RuleTemplateRepositoryError
} from '$lib/server/rules-new/rule-template.repository';
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
		template = await getRuleTemplateForUser({ authToken, userId, fetchFn: fetch }, templateId);
	} catch (loadError) {
		if (loadError instanceof RuleTemplateRepositoryError && loadError.status === 404) {
			error(404, m.rules_new_rule_template_not_found());
		}

		console.error('Failed to load rule template:', loadError);
		error(500, m.rules_new_load_failed());
	}

	const devices = await api.getAllDevices().catch(() => []);

	return { template, devices };
};
