import { ApiService } from '$lib/api/api.service';
import type { ReportFormContextDto } from '$lib/api/api.dtos';
import type { PageServerLoad } from './$types';

const EMPTY_CONTEXT: ReportFormContextDto = {
	devices: [],
	locations: [],
	communicationMethods: [],
	template: null
};

export const load: PageServerLoad = async ({ locals, fetch, url }) => {
	const authToken = locals.jwtString ?? null;
	const devEui = url.searchParams.get('dev_eui') ?? null;
	const jwt = locals.jwt;
	const currentUserEmail = jwt?.user_metadata?.email?.trim() || jwt?.email?.trim() || null;
	const currentUserName =
		jwt?.user_metadata?.full_name?.trim() || jwt?.user_metadata?.name?.trim() || null;

	if (!authToken) {
		return { context: EMPTY_CONTEXT, authToken, devEui, currentUserEmail, currentUserName };
	}

	const api = new ApiService({ fetchFn: fetch, authToken });
	const context = await api.getReportFormContext().catch(() => EMPTY_CONTEXT);

	return { context, authToken, devEui, currentUserEmail, currentUserName };
};
