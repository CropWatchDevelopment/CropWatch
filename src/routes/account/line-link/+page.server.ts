import { fail, redirect } from '@sveltejs/kit';
import { apiErrorMessage, apiErrorStatus } from '$lib/api/api-error';
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
	default: async ({ request, locals }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) return fail(401, { error: m.auth_not_authenticated() });

		const formData = await request.formData();
		const linkToken =
			typeof formData.get('linkToken') === 'string' ? String(formData.get('linkToken')).trim() : '';
		if (!linkToken) {
			return fail(400, { error: m.line_link_missing_token() });
		}

		let nonce: string;
		try {
			({ nonce } = await locals.services.line.startLineLink());
		} catch (err) {
			return fail(apiErrorStatus(err), { error: apiErrorMessage(err, m.line_link_error()) });
		}

		// LINE completes the handshake in its own dialog, then fires the
		// accountLink webhook that binds the accounts server-side.
		redirect(
			303,
			`${LINE_ACCOUNT_LINK_DIALOG}?linkToken=${encodeURIComponent(linkToken)}&nonce=${encodeURIComponent(nonce)}`
		);
	}
};
