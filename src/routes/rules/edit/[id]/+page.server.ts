import { ApiError } from '$lib/api/api-error';
import type { RuleFormContextDto } from '$lib/api/api.dtos';
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
		error(400, m.rules_new_invalid_template_id());
	}

	let context: RuleFormContextDto;
	try {
		context = await locals.services.rules.getRuleFormContext(templateId);
	} catch (loadError) {
		if (loadError instanceof ApiError && loadError.status === 404) {
			error(404, m.rules_new_rule_template_not_found());
		}
		console.error('Failed to load rule template:', loadError);
		error(500, m.rules_new_load_failed());
	}

	if (!context.template) {
		error(404, m.rules_new_rule_template_not_found());
	}

	return { context, authToken };
};
