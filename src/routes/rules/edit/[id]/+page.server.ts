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

	const [rawRule, rawDevices] = await Promise.all([
		api.getRule(ruleId).catch(() => null),
		api.getAllDevices().catch(() => [])
	]);

	if (!rawRule) {
		error(404, m.rules_rule_not_found());
	}

	const rule = {
		...rawRule,
		cw_rule_criteria: (rawRule.cw_rule_criteria ?? []).map((criterion) => {
			const parsedId = typeof criterion.id === 'number' ? criterion.id : Number(criterion.id);

			return {
				...criterion,
				id: Number.isFinite(parsedId) ? parsedId : 0
			};
		})
	};

	const devices = rawDevices;

	return { rule, devices, authToken };
};
