import { ApiService } from '$lib/api/api.service';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch, params }) => {
	const authToken = locals.jwtString ?? null;
	const ruleId = parseInt(params.id, 10);

	if (!authToken) {
		error(401, 'Unauthorized');
	}

	if (isNaN(ruleId)) {
		error(400, 'Invalid rule ID');
	}

	const api = new ApiService({ fetchFn: fetch, authToken });

	const [rule, rawDevices] = await Promise.all([
		api.getRule(ruleId).catch(() => null),
		api.getAllDevices().catch(() => [])
	]);

	if (!rule) {
		error(404, 'Rule not found');
	}

	const devices = rawDevices;

	return { rule, devices, authToken };
};
