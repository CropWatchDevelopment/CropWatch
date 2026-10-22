import { m } from '$lib/paraglide/messages.js';
import { apiErrorMessage, apiErrorStatus } from '$lib/api/api-error';
import type { LegalStatusDto } from '$lib/api/api.dtos';
import { buildLoginPath, readRedirectPathFromUrl } from '$lib/utils/auth-redirect';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const redirectPath = readRedirectPathFromUrl(url, '/');

	if (!locals.jwtString) {
		redirect(303, buildLoginPath({ redirectTo: redirectPath, reason: 'auth-required' }));
	}

	let status: LegalStatusDto | null = null;
	try {
		status = await locals.services.account.getLegalStatus();
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
	default: async ({ request, locals }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) return fail(401, { error: m.auth_not_authenticated() });

		const data = await request.formData();
		const agreedPrivacy = data.get('agreedPrivacy') === 'true';
		const agreedTerms = data.get('agreedTerms') === 'true';
		const agreedEula = data.get('agreedEula') === 'true';

		if (!agreedPrivacy || !agreedTerms || !agreedEula) {
			return fail(400, { error: m.auth_must_agree_all_policies() });
		}

		try {
			await locals.services.account.acceptLegalDocuments({
				kinds: ['privacy_policy', 'terms_of_service', 'eula']
			});
		} catch (err) {
			return fail(apiErrorStatus(err), { error: apiErrorMessage(err, m.legal_reaccept_failed()) });
		}

		return { success: true };
	}
};
