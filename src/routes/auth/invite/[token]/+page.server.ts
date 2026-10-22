import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { InvitePreviewDto } from '$lib/api/api.dtos';
import { apiErrorMessage, apiErrorStatus } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	// The preview endpoint is public (throttled server-side); the repository
	// sends it without a session token.
	let preview: InvitePreviewDto | null = null;
	try {
		preview = await locals.services.organizations.previewInvite(params.token);
	} catch {
		preview = null; // invalid, expired, revoked, or the feature flag is off
	}
	return { preview, loggedIn: Boolean(locals.jwtString), token: params.token };
};

export const actions: Actions = {
	accept: async ({ params, locals }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) {
			return fail(401, { error: m.auth_not_authenticated() });
		}

		try {
			await locals.services.organizations.acceptInvite(params.token);
			return { success: true };
		} catch (err) {
			const status = apiErrorStatus(err);
			if (status === 409) {
				return fail(409, { error: m.invite_conflict() });
			}
			if (status === 404) {
				return fail(404, { error: m.invite_not_found() });
			}
			return fail(status, { error: apiErrorMessage(err, m.generic_error()) });
		}
	}
};
