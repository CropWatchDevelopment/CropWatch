import { describe, expect, it } from 'vitest';
import type { MeContextDto } from '$lib/api/api.dtos';
import { ApiError } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import {
	TEST_JWT,
	formRequest,
	testEvent,
	testLocals,
	testServerConfig,
	type TestLocals
} from '$lib/testing/server';
import { managementUsersActions as actions } from './management-users-actions.server';

type ActionName = keyof typeof actions;
type ActionEvent = Parameters<(typeof actions)['invite']>[0];

function meContext(org: MeContextDto['org']): MeContextDto {
	return {
		orgs_enabled: true,
		is_staff: false,
		suspended: false,
		org,
		guest_orgs: [],
		child_orgs: []
	};
}

const ORG: MeContextDto['org'] = {
	id: 'org-1',
	type: 'company',
	name: 'Acme',
	role: 'owner',
	capabilities: []
};

const apiError = (status: number, message: string) =>
	new ApiError(status, 'Error', { url: 'https://api.cropwatch.test/x', payload: { message } });

/** A signed-in caller whose /me/context resolves to `org`. */
function signedIn(org: MeContextDto['org'] = ORG) {
	const locals = testLocals();
	locals.services.organizations.getMeContext.mockResolvedValue(meContext(org));
	return locals;
}

function act(name: ActionName, locals: TestLocals, fields: Record<string, string> = {}) {
	return actions[name](testEvent<ActionEvent>({ locals, request: formRequest(fields) }));
}

describe('member actions: shared wrapper', () => {
	it("runs the mutation against the caller's own org, resolved server-side", async () => {
		const locals = signedIn();
		const { organizations } = locals.services;
		organizations.suspendOrgMember.mockResolvedValue({});

		await expect(act('suspend', locals, { user_id: 'user-2' })).resolves.toEqual({
			success: true
		});
		expect(organizations.suspendOrgMember).toHaveBeenCalledWith('org-1', 'user-2');
		expect(organizations.getMeContext.mock.invocationCallOrder[0]).toBeLessThan(
			organizations.suspendOrgMember.mock.invocationCallOrder[0]
		);
	});

	it('requires a session, before calling the API', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(act('suspend', locals, { user_id: 'user-2' })).resolves.toMatchObject({
			status: 401,
			data: { error: m.auth_not_authenticated() }
		});
		expect(locals.services.organizations.getMeContext).not.toHaveBeenCalled();
	});

	it('refuses when the caller has no org', async () => {
		const locals = signedIn(null);

		await expect(act('remove', locals, { user_id: 'user-2' })).resolves.toMatchObject({
			status: 400,
			data: { error: m.organization_none() }
		});
		expect(locals.services.organizations.removeOrgMember).not.toHaveBeenCalled();
	});

	it("returns the API's status and message", async () => {
		const resolving = testLocals();
		resolving.services.organizations.getMeContext.mockRejectedValue(apiError(502, 'Bad gateway'));
		await expect(act('remove', resolving, { user_id: 'user-2' })).resolves.toMatchObject({
			status: 502,
			data: { error: 'Bad gateway' }
		});

		const mutating = signedIn();
		mutating.services.organizations.removeOrgMember.mockRejectedValue(
			apiError(403, 'Managers cannot remove managers')
		);
		await expect(act('remove', mutating, { user_id: 'user-2' })).resolves.toMatchObject({
			status: 403,
			data: { error: 'Managers cannot remove managers' }
		});
	});

	it('fails with 500 and the generic message for other failures', async () => {
		const typeError = signedIn();
		typeError.services.organizations.reinstateOrgMember.mockRejectedValue(
			new TypeError('Failed to fetch')
		);
		await expect(act('reinstate', typeError, { user_id: 'user-2' })).resolves.toMatchObject({
			status: 500,
			data: { error: m.generic_error() }
		});

		const unknown = signedIn();
		unknown.services.organizations.reinstateOrgMember.mockRejectedValue(null);
		await expect(act('reinstate', unknown, { user_id: 'user-2' })).resolves.toMatchObject({
			status: 500,
			data: { error: m.generic_error() }
		});
	});

	it('sends the same requests as before: the context first, then the mutation', async () => {
		const fake = createFakeFetch(({ path }) =>
			path === '/me/context' ? jsonResponse(meContext(ORG)) : jsonResponse({ id: 'inv-9' })
		);
		const services = createServerServices({
			fetch: fake.fetch,
			authToken: () => TEST_JWT,
			config: testPublicConfig(),
			serverConfig: testServerConfig()
		});
		const locals = { ...testLocals(), services } as unknown as TestLocals;

		await expect(
			act('invite', locals, { email: 'grace@example.com', role: 'member' })
		).resolves.toEqual({ success: true });
		expect(fake.requests.map(({ method, path, body }) => [method, path, body])).toEqual([
			['GET', '/me/context', undefined],
			['POST', '/orgs/org-1/invites', { email: 'grace@example.com', role: 'member' }]
		]);
		for (const request of fake.requests) {
			expect(request.headers.get('authorization')).toBe(`Bearer ${TEST_JWT}`);
		}
	});
});

describe('invite', () => {
	it('invites a manager or member by trimmed email, ignoring any expiry', async () => {
		const locals = signedIn();
		locals.services.organizations.createOrgInvite.mockResolvedValue({} as never);

		for (const role of ['manager', 'member']) {
			await expect(
				act('invite', locals, {
					email: '  grace@example.com ',
					role,
					member_expires_on: 'soon',
					member_expires_at: 'soon'
				})
			).resolves.toEqual({ success: true });
		}
		expect(locals.services.organizations.createOrgInvite.mock.calls).toEqual([
			['org-1', { email: 'grace@example.com', role: 'manager' }],
			['org-1', { email: 'grace@example.com', role: 'member' }]
		]);
	});

	it("invites a guest until the instant the dialog sent: the day's end in the inviter's time zone", async () => {
		const locals = signedIn();
		locals.services.organizations.createOrgInvite.mockResolvedValue({} as never);

		// 2026-12-31 23:59:59 in Tokyo, whatever the server's own time zone.
		await expect(
			act('invite', locals, {
				email: 'guest@example.com',
				role: 'guest',
				member_expires_on: ' 2026-12-31 ',
				member_expires_at: ' 2026-12-31T14:59:59.000Z '
			})
		).resolves.toEqual({ success: true });
		// The expiry is optional.
		await act('invite', locals, {
			email: 'guest@example.com',
			role: 'guest',
			member_expires_on: '',
			member_expires_at: ''
		});
		await act('invite', locals, { email: 'guest@example.com', role: 'guest' });

		expect(locals.services.organizations.createOrgInvite.mock.calls).toEqual([
			[
				'org-1',
				{
					email: 'guest@example.com',
					role: 'guest',
					member_expires_at: '2026-12-31T14:59:59.000Z'
				}
			],
			['org-1', { email: 'guest@example.com', role: 'guest' }],
			['org-1', { email: 'guest@example.com', role: 'guest' }]
		]);
	});

	it('requires an email, keeping what was typed', async () => {
		const locals = testLocals({ jwtString: null });

		for (const fields of [{ email: '   ', role: 'member' }, { role: 'member' }, {}] as Record<
			string,
			string
		>[]) {
			await expect(act('invite', locals, fields)).resolves.toMatchObject({
				status: 400,
				data: { error: m.validation_email_required(), email: '' }
			});
		}
		expect(locals.services.organizations.getMeContext).not.toHaveBeenCalled();
	});

	it('names the role, not the email, when the role cannot be invited', async () => {
		const locals = testLocals({ jwtString: null });

		for (const fields of [
			{ email: ' grace@example.com ', role: 'owner' },
			{ email: 'grace@example.com', role: 'staff' },
			{ email: 'grace@example.com' }
		] as Record<string, string>[]) {
			await expect(act('invite', locals, fields)).resolves.toMatchObject({
				status: 400,
				data: { error: m.management_invite_role_invalid(), email: 'grace@example.com' }
			});
		}
		expect(locals.services.organizations.getMeContext).not.toHaveBeenCalled();
	});

	it('refuses a guest expiry that is not a valid instant with a form error, never a 500', async () => {
		const locals = signedIn();

		for (const expiry of [
			// A day the browser could not turn into an instant.
			{ member_expires_on: 'soon', member_expires_at: '' },
			{ member_expires_on: '2026-02-30', member_expires_at: '' },
			// A day without its instant.
			{ member_expires_on: '2026-12-31' },
			// Not an ISO instant.
			{ member_expires_on: '2026-12-31', member_expires_at: 'soon' },
			{ member_expires_at: 'soon' },
			{ member_expires_at: '2026-12-31' },
			{ member_expires_at: '2026-12-31T23:59:59' }
		] as Record<string, string>[]) {
			await expect(
				act('invite', locals, { email: ' guest@example.com ', role: 'guest', ...expiry })
			).resolves.toMatchObject({
				status: 400,
				data: { error: m.management_invite_expiry_invalid(), email: 'guest@example.com' }
			});
		}
		expect(locals.services.organizations.getMeContext).not.toHaveBeenCalled();
		expect(locals.services.organizations.createOrgInvite).not.toHaveBeenCalled();
	});
});

describe('updateRole', () => {
	it("changes a member's role", async () => {
		const locals = signedIn();
		locals.services.organizations.updateOrgMember.mockResolvedValue({});

		for (const role of ['manager', 'member']) {
			await expect(act('updateRole', locals, { user_id: 'user-2', role })).resolves.toEqual({
				success: true
			});
		}
		expect(locals.services.organizations.updateOrgMember.mock.calls).toEqual([
			['org-1', 'user-2', { role: 'manager' }],
			['org-1', 'user-2', { role: 'member' }]
		]);
	});

	it('requires a user and an assignable role', async () => {
		const locals = signedIn();

		for (const fields of [
			{ role: 'manager' },
			{ user_id: 'user-2' },
			{ user_id: 'user-2', role: 'owner' },
			{ user_id: 'user-2', role: 'guest' }
		] as Record<string, string>[]) {
			await expect(act('updateRole', locals, fields)).resolves.toMatchObject({
				status: 400,
				data: { error: m.generic_error() }
			});
		}
		expect(locals.services.organizations.getMeContext).not.toHaveBeenCalled();
	});
});

describe('suspend, reinstate and remove', () => {
	it('act on the member as sent', async () => {
		const locals = signedIn();
		const { organizations } = locals.services;
		organizations.suspendOrgMember.mockResolvedValue({});
		organizations.reinstateOrgMember.mockResolvedValue({});
		organizations.removeOrgMember.mockResolvedValue({});

		for (const name of ['suspend', 'reinstate', 'remove'] as const) {
			await expect(act(name, locals, { user_id: 'user-2' })).resolves.toEqual({ success: true });
		}
		expect(organizations.suspendOrgMember).toHaveBeenCalledWith('org-1', 'user-2');
		expect(organizations.reinstateOrgMember).toHaveBeenCalledWith('org-1', 'user-2');
		expect(organizations.removeOrgMember).toHaveBeenCalledWith('org-1', 'user-2');
	});

	it('require a user id', async () => {
		const locals = signedIn();

		for (const name of ['suspend', 'reinstate', 'remove'] as const) {
			await expect(act(name, locals)).resolves.toMatchObject({
				status: 400,
				data: { error: m.generic_error() }
			});
		}
		expect(locals.services.organizations.getMeContext).not.toHaveBeenCalled();
	});
});

describe('revokeInvite and resendInvite', () => {
	it('act on the invite as sent', async () => {
		const locals = signedIn();
		const { organizations } = locals.services;
		organizations.revokeOrgInvite.mockResolvedValue({});
		organizations.resendOrgInvite.mockResolvedValue({});

		for (const name of ['revokeInvite', 'resendInvite'] as const) {
			await expect(act(name, locals, { invite_id: 'inv-1' })).resolves.toEqual({ success: true });
		}
		expect(organizations.revokeOrgInvite).toHaveBeenCalledWith('org-1', 'inv-1');
		expect(organizations.resendOrgInvite).toHaveBeenCalledWith('org-1', 'inv-1');
	});

	it('require an invite id', async () => {
		const locals = signedIn();

		for (const name of ['revokeInvite', 'resendInvite'] as const) {
			for (const fields of [{ invite_id: '' }, {}] as Record<string, string>[]) {
				await expect(act(name, locals, fields)).resolves.toMatchObject({
					status: 400,
					data: { error: m.generic_error() }
				});
			}
		}
		expect(locals.services.organizations.getMeContext).not.toHaveBeenCalled();
	});
});
