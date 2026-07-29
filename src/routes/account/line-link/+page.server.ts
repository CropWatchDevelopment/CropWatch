import { fail, redirect } from '@sveltejs/kit';
import { ApiService, ApiServiceError } from '$lib/api/api.service';
import { readApiErrorMessage } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

const LINE_ACCOUNT_LINK_DIALOG = 'https://access.line.me/dialog/bot/accountLink';

export const load: PageServerLoad = async ({ url, parent }) => {
	const { profile, session } = await parent();
	const linkToken = url.searchParams.get('linkToken')?.trim() ?? '';

	return {
		linkToken: linkToken || null,
		email: profile?.email ?? session?.email ?? null
	};
};

export const actions: Actions = {
	default: async ({ request, locals, fetch }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) return fail(401, { error: m.auth_not_authenticated() });

		const formData = await request.formData();
		const linkToken = typeof formData.get('linkToken') === 'string'
			? String(formData.get('linkToken')).trim()
			: '';
		if (!linkToken) {
			return fail(400, { error: m.line_link_missing_token() });
		}

		let nonce: string;
		try {
			({ nonce } = await new ApiService({ fetchFn: fetch, authToken }).startLineLink());
		} catch (err) {
			const payload = err instanceof ApiServiceError ? err.payload : err;
			const status = err instanceof ApiServiceError ? err.status : 500;
			return fail(status, { error: readApiErrorMessage(payload, m.line_link_error()) });
		}

		// LINE completes the handshake in its own dialog, then fires the
		// accountLink webhook that binds the accounts server-side.
		redirect(
			303,
			`${LINE_ACCOUNT_LINK_DIALOG}?linkToken=${encodeURIComponent(linkToken)}&nonce=${encodeURIComponent(nonce)}`
		);
	}
};
