import { fail, type RequestEvent } from '@sveltejs/kit';
import type { Actions } from './$types';
import type { CreateOrgInviteRequest } from '$lib/api/api.dtos';
import { apiErrorMessage, apiErrorStatus } from '$lib/api/api-error';
import type { OrganizationRepository } from '$lib/api/repositories/organizations.repository';
import { m } from '$lib/paraglide/messages.js';
import { readIsoInstant } from './invite-expiry';

/**
 * Shared wrapper for member-management actions: authenticates, resolves the
 * caller's org server-side (never trusting a client-sent org id), runs the
 * mutation, and normalizes API failures via apiErrorStatus / apiErrorMessage.
 */
async function orgAction(
	event: Pick<RequestEvent, 'locals'>,
	run: (organizations: OrganizationRepository, orgId: string) => Promise<void>
) {
	const authToken = event.locals.jwtString ?? null;
	if (!authToken) {
		return fail(401, { error: m.auth_not_authenticated() });
	}

	const { organizations } = event.locals.services;
	try {
		const ctx = await organizations.getMeContext();
		if (!ctx.org) {
			return fail(400, { error: m.organization_none() });
		}
		await run(organizations, ctx.org.id);
		return { success: true };
	} catch (err) {
		return fail(apiErrorStatus(err), { error: apiErrorMessage(err, m.generic_error()) });
	}
}

const INVITE_ROLES = ['manager', 'member', 'guest'] as const;
const MEMBER_ROLES = ['manager', 'member'] as const;

export const managementUsersActions: Actions = {
	invite: async ({ request, locals }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '').trim();
		const role = String(formData.get('role') ?? '');

		if (!email) {
			return fail(400, { error: m.validation_email_required(), email });
		}
		if (!(INVITE_ROLES as readonly string[]).includes(role)) {
			return fail(400, { error: m.management_invite_role_invalid(), email });
		}

		// A guest's expiry is optional. When a day was chosen, the dialog also
		// posts when it ends in the inviter's time zone; that instant is required.
		let memberExpiresAt: string | null = null;
		if (role === 'guest') {
			const day = String(formData.get('member_expires_on') ?? '').trim();
			const instant = String(formData.get('member_expires_at') ?? '').trim();
			if (day || instant) {
				memberExpiresAt = readIsoInstant(instant);
				if (!memberExpiresAt) {
					return fail(400, { error: m.management_invite_expiry_invalid(), email });
				}
			}
		}

		const body: CreateOrgInviteRequest = {
			email,
			role: role as (typeof INVITE_ROLES)[number],
			...(memberExpiresAt ? { member_expires_at: memberExpiresAt } : {})
		};
		return orgAction({ locals }, async (organizations, orgId) => {
			await organizations.createOrgInvite(orgId, body);
		});
	},

	updateRole: async ({ request, locals }) => {
		const formData = await request.formData();
		const userId = String(formData.get('user_id') ?? '');
		const role = String(formData.get('role') ?? '');
		if (!userId || !(MEMBER_ROLES as readonly string[]).includes(role)) {
			return fail(400, { error: m.generic_error() });
		}
		return orgAction({ locals }, async (organizations, orgId) => {
			await organizations.updateOrgMember(orgId, userId, {
				role: role as (typeof MEMBER_ROLES)[number]
			});
		});
	},

	suspend: async ({ request, locals }) => {
		const userId = String((await request.formData()).get('user_id') ?? '');
		if (!userId) return fail(400, { error: m.generic_error() });
		return orgAction({ locals }, async (organizations, orgId) => {
			await organizations.suspendOrgMember(orgId, userId);
		});
	},

	reinstate: async ({ request, locals }) => {
		const userId = String((await request.formData()).get('user_id') ?? '');
		if (!userId) return fail(400, { error: m.generic_error() });
		return orgAction({ locals }, async (organizations, orgId) => {
			await organizations.reinstateOrgMember(orgId, userId);
		});
	},

	remove: async ({ request, locals }) => {
		const userId = String((await request.formData()).get('user_id') ?? '');
		if (!userId) return fail(400, { error: m.generic_error() });
		return orgAction({ locals }, async (organizations, orgId) => {
			await organizations.removeOrgMember(orgId, userId);
		});
	},

	revokeInvite: async ({ request, locals }) => {
		const inviteId = String((await request.formData()).get('invite_id') ?? '');
		if (!inviteId) return fail(400, { error: m.generic_error() });
		return orgAction({ locals }, async (organizations, orgId) => {
			await organizations.revokeOrgInvite(orgId, inviteId);
		});
	},

	resendInvite: async ({ request, locals }) => {
		const inviteId = String((await request.formData()).get('invite_id') ?? '');
		if (!inviteId) return fail(400, { error: m.generic_error() });
		return orgAction({ locals }, async (organizations, orgId) => {
			await organizations.resendOrgInvite(orgId, inviteId);
		});
	}
};
