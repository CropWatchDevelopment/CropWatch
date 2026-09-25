import { fail, type RequestEvent } from '@sveltejs/kit';
import type { Actions } from './$types';
import type { CreateOrgInviteRequest } from '$lib/api/api.dtos';
import { ApiService, ApiServiceError } from '$lib/api/api.service';
import { readApiErrorMessage } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';

/**
 * Shared wrapper for member-management actions: authenticates, resolves the
 * caller's org server-side (never trusting a client-sent org id), runs the
 * mutation, and normalizes API failures via readApiErrorMessage.
 */
async function orgAction(
	event: Pick<RequestEvent, 'locals' | 'fetch'>,
	run: (api: ApiService, orgId: string) => Promise<void>
) {
	const authToken = event.locals.jwtString ?? null;
	if (!authToken) {
		return fail(401, { error: m.auth_not_authenticated() });
	}

	const api = new ApiService({ fetchFn: event.fetch, authToken });
	try {
		const ctx = await api.getMeContext();
		if (!ctx.org) {
			return fail(400, { error: m.organization_none() });
		}
		await run(api, ctx.org.id);
		return { success: true };
	} catch (err) {
		const payload = err instanceof ApiServiceError ? err.payload : err;
		const status = err instanceof ApiServiceError ? err.status : 500;
		return fail(status, { error: readApiErrorMessage(payload, m.generic_error()) });
	}
}

const INVITE_ROLES = ['manager', 'member', 'guest'] as const;
const MEMBER_ROLES = ['manager', 'member'] as const;

export const managementUsersActions: Actions = {
	invite: async ({ request, locals, fetch }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '').trim();
		const role = String(formData.get('role') ?? '');
		const expires = String(formData.get('member_expires_at') ?? '').trim();

		if (!email || !(INVITE_ROLES as readonly string[]).includes(role)) {
			return fail(400, { error: m.validation_email_required(), email });
		}

		const body: CreateOrgInviteRequest = {
			email,
			role: role as (typeof INVITE_ROLES)[number],
			...(role === 'guest' && expires
				? { member_expires_at: new Date(`${expires}T23:59:59`).toISOString() }
				: {})
		};
		return orgAction({ locals, fetch }, async (api, orgId) => {
			await api.createOrgInvite(orgId, body);
		});
	},

	updateRole: async ({ request, locals, fetch }) => {
		const formData = await request.formData();
		const userId = String(formData.get('user_id') ?? '');
		const role = String(formData.get('role') ?? '');
		if (!userId || !(MEMBER_ROLES as readonly string[]).includes(role)) {
			return fail(400, { error: m.generic_error() });
		}
		return orgAction({ locals, fetch }, async (api, orgId) => {
			await api.updateOrgMember(orgId, userId, { role: role as (typeof MEMBER_ROLES)[number] });
		});
	},

	suspend: async ({ request, locals, fetch }) => {
		const userId = String((await request.formData()).get('user_id') ?? '');
		if (!userId) return fail(400, { error: m.generic_error() });
		return orgAction({ locals, fetch }, async (api, orgId) => {
			await api.suspendOrgMember(orgId, userId);
		});
	},

	reinstate: async ({ request, locals, fetch }) => {
		const userId = String((await request.formData()).get('user_id') ?? '');
		if (!userId) return fail(400, { error: m.generic_error() });
		return orgAction({ locals, fetch }, async (api, orgId) => {
			await api.reinstateOrgMember(orgId, userId);
		});
	},

	remove: async ({ request, locals, fetch }) => {
		const userId = String((await request.formData()).get('user_id') ?? '');
		if (!userId) return fail(400, { error: m.generic_error() });
		return orgAction({ locals, fetch }, async (api, orgId) => {
			await api.removeOrgMember(orgId, userId);
		});
	},

	revokeInvite: async ({ request, locals, fetch }) => {
		const inviteId = String((await request.formData()).get('invite_id') ?? '');
		if (!inviteId) return fail(400, { error: m.generic_error() });
		return orgAction({ locals, fetch }, async (api, orgId) => {
			await api.revokeOrgInvite(orgId, inviteId);
		});
	},

	resendInvite: async ({ request, locals, fetch }) => {
		const inviteId = String((await request.formData()).get('invite_id') ?? '');
		if (!inviteId) return fail(400, { error: m.generic_error() });
		return orgAction({ locals, fetch }, async (api, orgId) => {
			await api.resendOrgInvite(orgId, inviteId);
		});
	}
};
