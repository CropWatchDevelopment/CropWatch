import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ApiService, ApiServiceError } from '$lib/api/api.service';
import { readApiErrorMessage } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async ({ parent, fetch }) => {
	const { authToken, orgContext } = await parent();
	const orgId = orgContext?.org?.id ?? null;
	if (!authToken || !orgId) {
		return { organization: null };
	}
	const api = new ApiService({ fetchFn: fetch, authToken });
	return { organization: await api.getOrganization(orgId).catch(() => null) };
};

export const actions: Actions = {
	leave: async ({ locals, fetch }) => {
		const authToken = locals.jwtString ?? null;
		const userId = locals.jwt?.sub ?? null;
		if (!authToken || !userId) {
			return fail(401, { error: m.auth_not_authenticated() });
		}

		const api = new ApiService({ fetchFn: fetch, authToken });
		try {
			const ctx = await api.getMeContext();
			if (!ctx.org) {
				return fail(400, { error: m.organization_none() });
			}
			await api.removeOrgMember(ctx.org.id, userId);
			return { success: true };
		} catch (err) {
			const payload = err instanceof ApiServiceError ? err.payload : err;
			const status = err instanceof ApiServiceError ? err.status : 500;
			return fail(status, { error: readApiErrorMessage(payload, m.generic_error()) });
		}
	}
};
