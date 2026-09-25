import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { InvitePreviewDto } from '$lib/api/api.dtos';
import { ApiService, ApiServiceError } from '$lib/api/api.service';
import { readApiErrorMessage } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	// The preview endpoint is public (throttled server-side); no auth needed.
	const api = new ApiService({ fetchFn: fetch });
	let preview: InvitePreviewDto | null = null;
	try {
		preview = await api.previewInvite(params.token);
	} catch {
		preview = null; // invalid, expired, revoked, or the feature flag is off
	}
	return { preview, loggedIn: Boolean(locals.jwtString), token: params.token };
};

export const actions: Actions = {
	accept: async ({ params, locals, fetch }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) {
			return fail(401, { error: m.auth_not_authenticated() });
		}

		const api = new ApiService({ fetchFn: fetch, authToken });
		try {
			await api.acceptInvite(params.token);
			return { success: true };
		} catch (err) {
			const status = err instanceof ApiServiceError ? err.status : 500;
			if (status === 409) {
				return fail(409, { error: m.invite_conflict() });
			}
			if (status === 404) {
				return fail(404, { error: m.invite_not_found() });
			}
			const payload = err instanceof ApiServiceError ? err.payload : err;
			return fail(status, { error: readApiErrorMessage(payload, m.generic_error()) });
		}
	}
};
