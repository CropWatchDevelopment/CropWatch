import { isHttpError } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import type {
	MeContextDto,
	OrgChildrenDto,
	OrganizationDto,
	OrgParentRequestDto
} from '$lib/api/api.dtos';
import { Capability } from '$lib/auth/capabilities';
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
import { managementSettingsActions } from './management-settings-actions.server';

type LoadEvent = Parameters<typeof load>[0];

const OWNER_CAPABILITIES = [Capability.OrgManageOpen, Capability.OrgSettingsManage];

function orgContext(overrides: Partial<MeContextDto> = {}): MeContextDto {
	return {
		orgs_enabled: true,
		is_staff: false,
		suspended: false,
		org: {
			id: 'org-1',
			type: 'company',
			name: 'Acme',
			role: 'owner',
			capabilities: OWNER_CAPABILITIES
		},
		guest_orgs: [],
		child_orgs: [],
		...overrides
	};
}

const ORGANIZATION: OrganizationDto = {
	id: 'org-1',
	type: 'company',
	name: 'Acme',
	role: 'owner',
	parent: null,
	// Written as the HTTP client returns `created_at` (UTC offset +00:00).
	created_at: '2026-01-01T00:00:00.000+00:00'
};
const CHILDREN: OrgChildrenDto = {
	children: [{ id: 'org-2', name: 'Acme North', type: 'company' }],
	pending_requests: []
};
const PARENT_REQUESTS: OrgParentRequestDto[] = [
	{
		id: 'req-1',
		parent_org_id: 'org-9',
		status: 'pending',
		created_at: '2026-02-01T00:00:00.000+00:00'
	}
];
const EMPTY = { organization: null, children: null, parentRequests: [] };

async function run(locals: TestLocals, parent: Record<string, unknown>) {
	return load(testEvent<LoadEvent>({ locals, parent }));
}

async function statusOf(result: Promise<unknown>) {
	const thrown = await result.then(
		() => new Error('expected the load to fail'),
		(error: unknown) => error
	);
	if (!isHttpError(thrown)) throw thrown;
	return thrown.status;
}

describe('management settings load', () => {
	it("loads the organization, its children and the parent requests for the caller's org", async () => {
		const locals = testLocals();
		const { organizations } = locals.services;
		organizations.getOrganization.mockResolvedValue(ORGANIZATION);
		organizations.listOrgChildren.mockResolvedValue(CHILDREN);
		organizations.listOrgParentRequests.mockResolvedValue(PARENT_REQUESTS);

		await expect(run(locals, { authToken: TEST_JWT, orgContext: orgContext() })).resolves.toEqual({
			organization: ORGANIZATION,
			children: CHILDREN,
			parentRequests: PARENT_REQUESTS
		});
		expect(organizations.getOrganization).toHaveBeenCalledWith('org-1');
		expect(organizations.listOrgChildren).toHaveBeenCalledWith('org-1');
		expect(organizations.listOrgParentRequests).toHaveBeenCalledWith('org-1');
	});

	it('degrades each request independently when the API fails', async () => {
		const locals = testLocals();
		const { organizations } = locals.services;
		organizations.getOrganization.mockRejectedValue(new Error('down'));
		organizations.listOrgChildren.mockRejectedValue(new Error('down'));
		organizations.listOrgParentRequests.mockRejectedValue(new Error('down'));

		await expect(run(locals, { authToken: TEST_JWT, orgContext: orgContext() })).resolves.toEqual(
			EMPTY
		);
	});

	it('answers a manager deep-linking here with a real 403, before calling the API', async () => {
		const locals = testLocals();
		const manager = orgContext({
			org: {
				id: 'org-1',
				type: 'company',
				name: 'Acme',
				role: 'manager',
				capabilities: [Capability.OrgManageOpen]
			}
		});

		await expect(statusOf(run(locals, { authToken: TEST_JWT, orgContext: manager }))).resolves.toBe(
			403
		);
		await expect(statusOf(run(locals, { authToken: TEST_JWT }))).resolves.toBe(403);
		expect(locals.services.organizations.getOrganization).not.toHaveBeenCalled();
	});

	it('returns empty data without a session or an org', async () => {
		const locals = testLocals();

		await expect(run(locals, { authToken: null, orgContext: orgContext() })).resolves.toEqual(
			EMPTY
		);
		// Staff pass the capability check even without an org of their own.
		await expect(
			run(locals, { authToken: TEST_JWT, orgContext: orgContext({ is_staff: true, org: null }) })
		).resolves.toEqual(EMPTY);
		expect(locals.services.organizations.getOrganization).not.toHaveBeenCalled();
		expect(locals.services.organizations.listOrgChildren).not.toHaveBeenCalled();
		expect(locals.services.organizations.listOrgParentRequests).not.toHaveBeenCalled();
	});

	it('sends the same three authenticated GET requests as before', async () => {
		const fake = createFakeFetch(({ path }) => {
			if (path === '/orgs/org-1') return jsonResponse(ORGANIZATION);
			if (path === '/orgs/org-1/children') return jsonResponse(CHILDREN);
			return jsonResponse(PARENT_REQUESTS);
		});
		const services = createServerServices({
			fetch: fake.fetch,
			authToken: () => TEST_JWT,
			config: testPublicConfig(),
			serverConfig: testServerConfig()
		});
		const locals = { ...testLocals(), services } as unknown as TestLocals;

		await expect(run(locals, { authToken: TEST_JWT, orgContext: orgContext() })).resolves.toEqual({
			organization: ORGANIZATION,
			children: CHILDREN,
			parentRequests: PARENT_REQUESTS
		});
		expect(fake.requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
			'GET /orgs/org-1',
			'GET /orgs/org-1/children',
			'GET /orgs/org-1/parent-requests'
		]);
		for (const request of fake.requests) {
			expect(request.headers.get('authorization')).toBe(`Bearer ${TEST_JWT}`);
		}
	});
});

describe('management settings actions', () => {
	it('are the shared settings actions', () => {
		expect(actions).toBe(managementSettingsActions);
	});
});
