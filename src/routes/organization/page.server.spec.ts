import { describe, expect, it } from 'vitest';
import type { MeContextDto, OrganizationDto } from '$lib/api/api.dtos';
import { ApiError } from '$lib/api/api-error';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import { m } from '$lib/paraglide/messages.js';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import {
	TEST_JWT,
	TEST_USER_ID,
	testEvent,
	testLocals,
	testServerConfig,
	type TestLocals
} from '$lib/testing/server';
import { actions, load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<(typeof actions)['leave']>[0];

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

const MEMBER_CONTEXT = orgContext({
	id: 'org-1',
	type: 'company',
	name: 'Acme',
	role: 'member',
	capabilities: []
});

const ORGANIZATION: OrganizationDto = {
	id: 'org-1',
	type: 'company',
	name: 'Acme',
	role: 'member',
	parent: { id: 'org-0', name: 'Acme Holdings' },
	created_at: '2026-01-01T00:00:00.000+00:00'
};

const apiError = (status: number, message: string) =>
	new ApiError(status, 'Error', { url: 'https://api.cropwatch.test/x', payload: { message } });

function leave(locals: TestLocals) {
	return actions.leave(testEvent<ActionEvent>({ locals }));
}

describe('organization load', () => {
	it("loads the caller's organization", async () => {
		const locals = testLocals();
		locals.services.organizations.getOrganization.mockResolvedValue(ORGANIZATION);

		await expect(
			load(
				testEvent<LoadEvent>({
					locals,
					parent: { authToken: TEST_JWT, orgContext: MEMBER_CONTEXT }
				})
			)
		).resolves.toEqual({ organization: ORGANIZATION });
		expect(locals.services.organizations.getOrganization).toHaveBeenCalledWith('org-1');
	});

	it('shows no organization details when the lookup fails', async () => {
		const locals = testLocals();
		locals.services.organizations.getOrganization.mockRejectedValue(apiError(404, 'Not found'));

		await expect(
			load(
				testEvent<LoadEvent>({
					locals,
					parent: { authToken: TEST_JWT, orgContext: MEMBER_CONTEXT }
				})
			)
		).resolves.toEqual({ organization: null });
	});

	it('does not call the API without a session or an org', async () => {
		const locals = testLocals();

		for (const parent of [
			{ authToken: null, orgContext: MEMBER_CONTEXT },
			{ authToken: TEST_JWT, orgContext: orgContext(null) },
			{ authToken: TEST_JWT }
		]) {
			await expect(load(testEvent<LoadEvent>({ locals, parent }))).resolves.toEqual({
				organization: null
			});
		}
		expect(locals.services.organizations.getOrganization).not.toHaveBeenCalled();
	});
});

describe('leave action', () => {
	it('removes the caller from their own org, resolved server-side', async () => {
		const locals = testLocals();
		const { organizations } = locals.services;
		organizations.getMeContext.mockResolvedValue(MEMBER_CONTEXT);
		organizations.removeOrgMember.mockResolvedValue({});

		await expect(leave(locals)).resolves.toEqual({ success: true });
		expect(organizations.removeOrgMember).toHaveBeenCalledWith('org-1', TEST_USER_ID);
		expect(organizations.getMeContext.mock.invocationCallOrder[0]).toBeLessThan(
			organizations.removeOrgMember.mock.invocationCallOrder[0]
		);
	});

	it('requires a session and a user id, before calling the API', async () => {
		const noSession = testLocals({ jwtString: null });
		const noUser = testLocals({ jwt: { email: 'ada@example.com' } as IJWT });

		for (const locals of [noSession, noUser]) {
			await expect(leave(locals)).resolves.toMatchObject({
				status: 401,
				data: { error: m.auth_not_authenticated() }
			});
			expect(locals.services.organizations.getMeContext).not.toHaveBeenCalled();
		}
	});

	it('refuses when the caller has no org', async () => {
		const locals = testLocals();
		locals.services.organizations.getMeContext.mockResolvedValue(orgContext(null));

		await expect(leave(locals)).resolves.toMatchObject({
			status: 400,
			data: { error: m.organization_none() }
		});
		expect(locals.services.organizations.removeOrgMember).not.toHaveBeenCalled();
	});

	it("returns the API's status and message, or 500 for other failures", async () => {
		const refused = testLocals();
		refused.services.organizations.getMeContext.mockResolvedValue(MEMBER_CONTEXT);
		refused.services.organizations.removeOrgMember.mockRejectedValue(
			apiError(403, 'The owner cannot leave')
		);
		await expect(leave(refused)).resolves.toMatchObject({
			status: 403,
			data: { error: 'The owner cannot leave' }
		});

		const offline = testLocals();
		offline.services.organizations.getMeContext.mockRejectedValue(new TypeError('Failed to fetch'));
		await expect(leave(offline)).resolves.toMatchObject({
			status: 500,
			data: { error: m.generic_error() }
		});

		const unknown = testLocals();
		unknown.services.organizations.getMeContext.mockRejectedValue({});
		await expect(leave(unknown)).resolves.toMatchObject({
			status: 500,
			data: { error: m.generic_error() }
		});
	});

	it('sends the same requests as before', async () => {
		const fake = createFakeFetch(({ path }) =>
			path === '/me/context' ? jsonResponse(MEMBER_CONTEXT) : jsonResponse(null)
		);
		const services = createServerServices({
			fetch: fake.fetch,
			authToken: () => TEST_JWT,
			config: testPublicConfig(),
			serverConfig: testServerConfig()
		});
		const locals = { ...testLocals(), services } as unknown as TestLocals;

		await expect(leave(locals)).resolves.toEqual({ success: true });
		expect(fake.requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
			'GET /me/context',
			`DELETE /orgs/org-1/members/${TEST_USER_ID}`
		]);
		for (const request of fake.requests) {
			expect(request.headers.get('authorization')).toBe(`Bearer ${TEST_JWT}`);
		}
	});
});
