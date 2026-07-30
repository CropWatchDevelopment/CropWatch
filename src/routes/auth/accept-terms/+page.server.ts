import { m } from '$lib/paraglide/messages.js';
import { ApiService, ApiServiceError } from '$lib/api/api.service';
import { readApiErrorMessage } from '$lib/api/api-error';
import type { LegalStatusDto } from '$lib/api/api.dtos';
import { buildLoginPath, readRedirectPathFromUrl } from '$lib/utils/auth-redirect';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch, url }) => {
	const redirectPath = readRedirectPathFromUrl(url, '/');

	if (!locals.jwtString) {
		redirect(303, buildLoginPath({ redirectTo: redirectPath, reason: 'auth-required' }));
	}

	const api = new ApiService({ fetchFn: fetch, authToken: locals.jwtString });

	let status: LegalStatusDto | null = null;
	try {
		status = await api.getLegalStatus();
	} catch (err) {
		console.error('Failed to fetch legal status for accept-terms:', err);
	}

	// Nothing pending (or status unavailable — fail open): leave the interstitial.
	if (!status || !Array.isArray(status.documents) || status.needs_acceptance !== true) {
		redirect(303, redirectPath);
	}

	return { documents: status.documents, redirectPath };
};

export const actions: Actions = {
	default: async ({ request, locals, fetch }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) return fail(401, { error: m.auth_not_authenticated() });

		const data = await request.formData();
		const agreedPrivacy = data.get('agreedPrivacy') === 'true';
		const agreedTerms = data.get('agreedTerms') === 'true';
		const agreedEula = data.get('agreedEula') === 'true';

		if (!agreedPrivacy || !agreedTerms || !agreedEula) {
			return fail(400, { error: m.auth_must_agree_all_policies() });
		}

		const api = new ApiService({ fetchFn: fetch, authToken });
		try {
			await api.acceptLegalDocuments({
				kinds: ['privacy_policy', 'terms_of_service', 'eula']
			});
		} catch (err) {
			const payload = err instanceof ApiServiceError ? err.payload : err;
			const status = err instanceof ApiServiceError ? err.status : 500;
			return fail(status, { error: readApiErrorMessage(payload, m.legal_reaccept_failed()) });
		}

		return { success: true };
	}
};
