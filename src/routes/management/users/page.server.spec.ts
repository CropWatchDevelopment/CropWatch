import { describe, expect, it } from 'vitest';
import type { MeContextDto, OrgInviteDto, OrgMemberDto } from '$lib/api/api.dtos';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import {
	TEST_JWT,
	testEvent,
	testLocals,
	testServerConfig,
	type TestLocals
} from '$lib/testing/server';
import { actions, load } from './+page.server';
import { managementUsersActions } from './management-users-actions.server';

type LoadEvent = Parameters<typeof load>[0];

function orgContext(org: MeContextDto['org']): MeContextDto {
	return {
		orgs_enabled: true,
		is_staff: false,
		suspended: false,
		org,
		guest_orgs: [],
		child_orgs: []
	};
}

const OWNER_CONTEXT = orgContext({
	id: 'org-1',
	type: 'company',
	name: 'Acme',
	role: 'owner',
	capabilities: []
});

// `created_at` written as the HTTP client returns it (UTC offset +00:00).
const MEMBERS: OrgMemberDto[] = [
	{
		user_id: 'user-1',
		email: 'ada@example.com',
		full_name: 'Ada Lovelace',
		role: 'owner',
		status: 'active',
		expires_at: null,
		suspended_at: null,
		created_at: '2026-01-01T00:00:00.000+00:00'
	}
];
const INVITES: OrgInviteDto[] = [
	{
		id: 'inv-1',
		email: 'grace@example.com',
		role: 'member',
		status: 'pending',
		expires_at: '2026-11-01T00:00:00.000Z',
		created_at: '2026-10-01T00:00:00.000+00:00',
		member_expires_at: null,
		invited_by: 'user-1'
	}
];

function run(locals: TestLocals, parent: Record<string, unknown>) {
	return load(testEvent<LoadEvent>({ locals, parent }));
}

describe('management users load', () => {
	it("loads the members and invites of the caller's org", async () => {
		const locals = testLocals();
		const { organizations } = locals.services;
		organizations.listOrgMembers.mockResolvedValue(MEMBERS);
		organizations.listOrgInvites.mockResolvedValue(INVITES);

		await expect(run(locals, { authToken: TEST_JWT, orgContext: OWNER_CONTEXT })).resolves.toEqual({
			members: MEMBERS,
			invites: INVITES
		});
		expect(organizations.listOrgMembers).toHaveBeenCalledWith('org-1');
		expect(organizations.listOrgInvites).toHaveBeenCalledWith('org-1');
	});

	it('degrades each list independently when the API fails', async () => {
		const locals = testLocals();
		locals.services.organizations.listOrgMembers.mockRejectedValue(new Error('down'));
		locals.services.organizations.listOrgInvites.mockResolvedValue(INVITES);

		await expect(run(locals, { authToken: TEST_JWT, orgContext: OWNER_CONTEXT })).resolves.toEqual({
			members: [],
			invites: INVITES
		});

		locals.services.organizations.listOrgMembers.mockResolvedValue(MEMBERS);
		locals.services.organizations.listOrgInvites.mockRejectedValue(new Error('down'));

		await expect(run(locals, { authToken: TEST_JWT, orgContext: OWNER_CONTEXT })).resolves.toEqual({
			members: MEMBERS,
			invites: []
		});
	});

	it('returns empty lists without a session or an org, without calling the API', async () => {
		const locals = testLocals();

		for (const parent of [
			{ authToken: null, orgContext: OWNER_CONTEXT },
			{ authToken: TEST_JWT, orgContext: orgContext(null) },
			{ authToken: TEST_JWT }
		]) {
			await expect(run(locals, parent)).resolves.toEqual({ members: [], invites: [] });
		}
		expect(locals.services.organizations.listOrgMembers).not.toHaveBeenCalled();
		expect(locals.services.organizations.listOrgInvites).not.toHaveBeenCalled();
	});

	it('sends the same two authenticated GET requests as before', async () => {
		const fake = createFakeFetch(({ path }) =>
			jsonResponse(path === '/orgs/org-1/members' ? MEMBERS : INVITES)
		);
		const services = createServerServices({
			fetch: fake.fetch,
			authToken: () => TEST_JWT,
			config: testPublicConfig(),
			serverConfig: testServerConfig()
		});
		const locals = { ...testLocals(), services } as unknown as TestLocals;

		await expect(run(locals, { authToken: TEST_JWT, orgContext: OWNER_CONTEXT })).resolves.toEqual({
			members: MEMBERS,
			invites: INVITES
		});
		expect(fake.requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
			'GET /orgs/org-1/members',
			'GET /orgs/org-1/invites'
		]);
		for (const request of fake.requests) {
			expect(request.headers.get('authorization')).toBe(`Bearer ${TEST_JWT}`);
		}
	});
});

describe('management users actions', () => {
	it('are the shared member-management actions', () => {
		expect(actions).toBe(managementUsersActions);
	});
});
