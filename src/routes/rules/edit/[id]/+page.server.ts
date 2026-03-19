import { ApiService } from '$lib/api/api.service';
import { m } from '$lib/paraglide/messages.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch, params }) => {
	const authToken = locals.jwtString ?? null;
	const ruleId = parseInt(params.id, 10);

	if (!authToken) {
		error(401, m.error_unauthorized_title());
	}

	if (isNaN(ruleId)) {
		error(400, m.rules_invalid_rule_id());
	}

	const api = new ApiService({ fetchFn: fetch, authToken });

	const [rule, rawDevices] = await Promise.all([
		api.getRule(ruleId).catch(() => null),
		api.getAllDevices().catch(() => [])
	]);

	if (!rule) {
		error(404, m.rules_rule_not_found());
	}

	const devices = rawDevices;

	return { rule, devices, authToken };
};
