import type { RuleFormContextDto } from '$lib/api/api.dtos';
import type { PageServerLoad } from './$types';

const EMPTY_CONTEXT: RuleFormContextDto = {
	devices: [],
	locations: [],
	actionTypes: [],
	template: null
};

export const load: PageServerLoad = async ({ locals, url }) => {
	const authToken = locals.jwtString ?? null;
	const devEui = url.searchParams.get('dev_eui') ?? null;

	if (!authToken) {
		return { context: EMPTY_CONTEXT, authToken, devEui };
	}

	const context = await locals.services.rules.getRuleFormContext().catch(() => EMPTY_CONTEXT);

	return { context, authToken, devEui };
};
