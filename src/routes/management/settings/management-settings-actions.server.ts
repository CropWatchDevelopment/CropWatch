import { fail, type RequestEvent } from '@sveltejs/kit';
import type { Actions } from './$types';
import { apiErrorMessage, apiErrorStatus } from '$lib/api/api-error';
import type { OrganizationRepository } from '$lib/api/repositories/organizations.repository';
import { m } from '$lib/paraglide/messages.js';

/** Same wrapper as the users page: auth, server-resolved org, API errors. */
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

export const managementSettingsActions: Actions = {
	rename: async ({ request, locals }) => {
		const name = String((await request.formData()).get('name') ?? '').trim();
		if (!name) return fail(400, { error: m.validation_name_required(), name });
		return orgAction({ locals }, async (organizations, orgId) => {
			await organizations.renameOrganization(orgId, name);
		});
	},

	upgrade: async ({ request, locals }) => {
		const name = String((await request.formData()).get('name') ?? '').trim();
		if (!name) return fail(400, { error: m.validation_name_required(), name });
		return orgAction({ locals }, async (organizations, orgId) => {
			await organizations.upgradeOrganization(orgId, name);
		});
	},

	linkRequest: async ({ request, locals }) => {
		const childOrgId = String((await request.formData()).get('child_org_id') ?? '').trim();
		if (!childOrgId) return fail(400, { error: m.generic_error() });
		return orgAction({ locals }, async (organizations, orgId) => {
			await organizations.createOrgLinkRequest(orgId, childOrgId);
		});
	},

	unlinkChild: async ({ request, locals }) => {
		const childId = String((await request.formData()).get('child_id') ?? '');
		if (!childId) return fail(400, { error: m.generic_error() });
		return orgAction({ locals }, async (organizations, orgId) => {
			await organizations.unlinkOrgChild(orgId, childId);
		});
	},

	decideRequest: async ({ request, locals }) => {
		const formData = await request.formData();
		const requestId = String(formData.get('request_id') ?? '');
		const decision = String(formData.get('decision') ?? '');
		if (!requestId || (decision !== 'accept' && decision !== 'decline')) {
			return fail(400, { error: m.generic_error() });
		}
		return orgAction({ locals }, async (organizations, orgId) => {
			await organizations.decideOrgParentRequest(
				orgId,
				requestId,
				decision as 'accept' | 'decline'
			);
		});
	}
};
