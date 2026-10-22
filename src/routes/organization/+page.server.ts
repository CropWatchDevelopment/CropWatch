import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { apiErrorMessage, apiErrorStatus } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { authToken, orgContext } = await parent();
	const orgId = orgContext?.org?.id ?? null;
	if (!authToken || !orgId) {
		return { organization: null };
	}
	return {
		organization: await locals.services.organizations.getOrganization(orgId).catch(() => null)
	};
};

export const actions: Actions = {
	leave: async ({ locals }) => {
		const authToken = locals.jwtString ?? null;
		const userId = locals.jwt?.sub ?? null;
		if (!authToken || !userId) {
			return fail(401, { error: m.auth_not_authenticated() });
		}

		const { organizations } = locals.services;
		try {
			const ctx = await organizations.getMeContext();
			if (!ctx.org) {
				return fail(400, { error: m.organization_none() });
			}
			await organizations.removeOrgMember(ctx.org.id, userId);
			return { success: true };
		} catch (err) {
			return fail(apiErrorStatus(err), { error: apiErrorMessage(err, m.generic_error()) });
		}
	}
};
