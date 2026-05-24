import { ApiService } from '$lib/api/api.service';
import type { RuleFormContextDto } from '$lib/api/api.dtos';
import type { PageServerLoad } from './$types';

const EMPTY_CONTEXT: RuleFormContextDto = {
	devices: [],
	locations: [],
	actionTypes: [],
	template: null
};

export const load: PageServerLoad = async ({ locals, fetch, url }) => {
	const authToken = locals.jwtString ?? null;
	const devEui = url.searchParams.get('dev_eui') ?? null;

	if (!authToken) {
		return { context: EMPTY_CONTEXT, authToken, devEui };
	}

	const api = new ApiService({ fetchFn: fetch, authToken });
	const context = await api.getRuleFormContext().catch(() => EMPTY_CONTEXT);

	return { context, authToken, devEui };
};
