import { fail } from '@sveltejs/kit';
import { ApiService, ApiServiceError } from '$lib/api/api.service';
import { readApiErrorMessage } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

const readString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const load: PageServerLoad = async ({ parent }) => {
	const { profile, session } = await parent();

	return {
		profile: profile ?? null,
		email: readString(profile?.email ?? session?.email) || null,
		role: readString(session?.role) || null
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals, fetch }) => {
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

		const api = new ApiService({ fetchFn: fetch, authToken });
		try {
			await api.updateProfile(fields);
			return { success: true };
		} catch (err) {
			const payload = err instanceof ApiServiceError ? err.payload : err;
			const status = err instanceof ApiServiceError ? err.status : 500;
			return fail(status, { error: readApiErrorMessage(payload, m.generic_error()), ...fields });
		}
	},

	updateEmail: async ({ request, locals, fetch }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) return fail(401, { emailError: m.auth_not_authenticated() });

		const formData = await request.formData();
		const email = readString(formData.get('email'));
		if (!email || !email.includes('@')) {
			return fail(400, { emailError: m.profile_email_invalid(), email });
		}

		const api = new ApiService({ fetchFn: fetch, authToken });
		try {
			const result = await api.updateEmail({ email });
			return { emailPending: true, emailMessage: result.message ?? null, email };
		} catch (err) {
			const payload = err instanceof ApiServiceError ? err.payload : err;
			const status = err instanceof ApiServiceError ? err.status : 500;
			return fail(status, { emailError: readApiErrorMessage(payload, m.generic_error()), email });
		}
	}
};
