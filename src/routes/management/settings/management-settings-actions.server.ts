import { fail, type RequestEvent } from '@sveltejs/kit';
import type { Actions } from './$types';
import { ApiService, ApiServiceError } from '$lib/api/api.service';
import { readApiErrorMessage } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';

/** Same wrapper as the users page: auth, server-resolved org, API errors. */
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

export const managementSettingsActions: Actions = {
	rename: async ({ request, locals, fetch }) => {
		const name = String((await request.formData()).get('name') ?? '').trim();
		if (!name) return fail(400, { error: m.validation_name_required(), name });
		return orgAction({ locals, fetch }, async (api, orgId) => {
			await api.renameOrganization(orgId, name);
		});
	},

	upgrade: async ({ request, locals, fetch }) => {
		const name = String((await request.formData()).get('name') ?? '').trim();
		if (!name) return fail(400, { error: m.validation_name_required(), name });
		return orgAction({ locals, fetch }, async (api, orgId) => {
			await api.upgradeOrganization(orgId, name);
		});
	},

	linkRequest: async ({ request, locals, fetch }) => {
		const childOrgId = String((await request.formData()).get('child_org_id') ?? '').trim();
		if (!childOrgId) return fail(400, { error: m.generic_error() });
		return orgAction({ locals, fetch }, async (api, orgId) => {
			await api.createOrgLinkRequest(orgId, childOrgId);
		});
	},

	unlinkChild: async ({ request, locals, fetch }) => {
		const childId = String((await request.formData()).get('child_id') ?? '');
		if (!childId) return fail(400, { error: m.generic_error() });
		return orgAction({ locals, fetch }, async (api, orgId) => {
			await api.unlinkOrgChild(orgId, childId);
		});
	},

	decideRequest: async ({ request, locals, fetch }) => {
		const formData = await request.formData();
		const requestId = String(formData.get('request_id') ?? '');
		const decision = String(formData.get('decision') ?? '');
		if (!requestId || (decision !== 'accept' && decision !== 'decline')) {
			return fail(400, { error: m.generic_error() });
		}
		return orgAction({ locals, fetch }, async (api, orgId) => {
			await api.decideOrgParentRequest(orgId, requestId, decision as 'accept' | 'decline');
		});
	}
};
