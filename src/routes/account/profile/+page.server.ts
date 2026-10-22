import { fail } from '@sveltejs/kit';
import { apiErrorMessage, apiErrorStatus } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

const readString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const load: PageServerLoad = async ({ parent }) => {
	const { profile, session } = await parent();

	return {
		profile: profile ?? null,
		email: readString(profile?.email ?? session?.email) || null,
		role: readString(session?.role) || null,
		lineLinked: Boolean(readString(profile?.line_id))
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) return fail(401, { error: m.auth_not_authenticated() });

		const formData = await request.formData();
		const fields = {
			username: readString(formData.get('username')),
			full_name: readString(formData.get('full_name')),
			employer: readString(formData.get('employer')),
			website: readString(formData.get('website')),
			phone_number: readString(formData.get('phone_number'))
		};

		try {
			await locals.services.account.updateProfile(fields);
			return { success: true };
		} catch (err) {
			return fail(apiErrorStatus(err), {
				error: apiErrorMessage(err, m.generic_error()),
				...fields
			});
		}
	},

	lineLinkCode: async ({ locals }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) return fail(401, { lineError: m.auth_not_authenticated() });

		try {
			const { code, expiresAt } = await locals.services.line.createLineLinkCode();
			return { lineCode: code, lineCodeExpiresAt: expiresAt };
		} catch (err) {
			return fail(apiErrorStatus(err), { lineError: apiErrorMessage(err, m.generic_error()) });
		}
	},

	unlinkLine: async ({ locals }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) return fail(401, { lineError: m.auth_not_authenticated() });

		try {
			await locals.services.line.unlinkLine();
			return { lineUnlinked: true };
		} catch (err) {
			return fail(apiErrorStatus(err), { lineError: apiErrorMessage(err, m.line_unlink_failed()) });
		}
	},

	updateEmail: async ({ request, locals }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) return fail(401, { emailError: m.auth_not_authenticated() });

		const formData = await request.formData();
		const email = readString(formData.get('email'));
		if (!email || !email.includes('@')) {
			return fail(400, { emailError: m.profile_email_invalid(), email });
		}

		try {
			const result = await locals.services.account.updateEmail({ email });
			return { emailPending: true, emailMessage: result.message ?? null, email };
		} catch (err) {
			return fail(apiErrorStatus(err), {
				emailError: apiErrorMessage(err, m.generic_error()),
				email
			});
		}
	}
};
