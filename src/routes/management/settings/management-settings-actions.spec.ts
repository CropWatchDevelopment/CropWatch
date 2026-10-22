import { afterEach, describe, expect, it, vi } from 'vitest';
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
import { managementSettingsActions as actions } from './management-settings-actions.server';

type ActionName = keyof typeof actions;
type ActionEvent = Parameters<(typeof actions)['rename']>[0];

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

afterEach(() => {
	vi.restoreAllMocks();
});

describe('settings actions: shared wrapper', () => {
	it("runs the mutation against the caller's own org, resolved server-side", async () => {
		const locals = signedIn();
		const { organizations } = locals.services;
		organizations.renameOrganization.mockResolvedValue({ id: 'org-1', name: 'Acme Farms' });

		await expect(act('rename', locals, { name: 'Acme Farms' })).resolves.toEqual({ success: true });
		expect(organizations.getMeContext).toHaveBeenCalledTimes(1);
		expect(organizations.renameOrganization).toHaveBeenCalledWith('org-1', 'Acme Farms');
		expect(organizations.getMeContext.mock.invocationCallOrder[0]).toBeLessThan(
			organizations.renameOrganization.mock.invocationCallOrder[0]
		);
	});

	it('requires a session, before calling the API', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(act('rename', locals, { name: 'Acme Farms' })).resolves.toMatchObject({
			status: 401,
			data: { error: m.auth_not_authenticated() }
		});
		expect(locals.services.organizations.getMeContext).not.toHaveBeenCalled();
	});

	it('refuses when the caller has no org', async () => {
		const locals = signedIn(null);

		await expect(act('rename', locals, { name: 'Acme Farms' })).resolves.toMatchObject({
			status: 400,
			data: { error: m.organization_none() }
		});
		expect(locals.services.organizations.renameOrganization).not.toHaveBeenCalled();
	});

	it("returns the API's status and message when resolving the org fails", async () => {
		const locals = testLocals();
		locals.services.organizations.getMeContext.mockRejectedValue(apiError(503, 'Context down'));

		await expect(act('rename', locals, { name: 'Acme Farms' })).resolves.toMatchObject({
			status: 503,
			data: { error: 'Context down' }
		});
		expect(locals.services.organizations.renameOrganization).not.toHaveBeenCalled();
	});

	it("returns the API's status and message when the mutation fails", async () => {
		const locals = signedIn();
		locals.services.organizations.renameOrganization.mockRejectedValue(apiError(409, 'Name taken'));

		await expect(act('rename', locals, { name: 'Acme Farms' })).resolves.toMatchObject({
			status: 409,
			data: { error: 'Name taken' }
		});
	});

	it('fails with 500 and the generic message for other failures', async () => {
		const typeError = signedIn();
		typeError.services.organizations.renameOrganization.mockRejectedValue(
			new TypeError('Failed to fetch')
		);
		await expect(act('rename', typeError, { name: 'Acme Farms' })).resolves.toMatchObject({
			status: 500,
			data: { error: m.generic_error() }
		});

		const unknown = signedIn();
		unknown.services.organizations.renameOrganization.mockRejectedValue({});
		await expect(act('rename', unknown, { name: 'Acme Farms' })).resolves.toMatchObject({
			status: 500,
			data: { error: m.generic_error() }
		});
	});

	it('sends the same requests as before: the context first, then the mutation', async () => {
		const fake = createFakeFetch(({ path }) =>
			path === '/me/context'
				? jsonResponse(meContext(ORG))
				: jsonResponse({ id: 'org-1', name: 'Acme Farms' })
		);
		const services = createServerServices({
			fetch: fake.fetch,
			authToken: () => TEST_JWT,
			config: testPublicConfig(),
			serverConfig: testServerConfig()
		});
		const locals = { ...testLocals(), services } as unknown as TestLocals;

		await expect(act('rename', locals, { name: 'Acme Farms' })).resolves.toEqual({ success: true });
		expect(fake.requests.map(({ method, path, body }) => [method, path, body])).toEqual([
			['GET', '/me/context', undefined],
			['PATCH', '/orgs/org-1', { name: 'Acme Farms' }]
		]);
		for (const request of fake.requests) {
			expect(request.headers.get('authorization')).toBe(`Bearer ${TEST_JWT}`);
		}
	});
});

describe('rename and upgrade', () => {
	it('trims the name before saving', async () => {
		const locals = signedIn();
		const { organizations } = locals.services;
		organizations.renameOrganization.mockResolvedValue({ id: 'org-1', name: 'Acme' });
		organizations.upgradeOrganization.mockResolvedValue({ id: 'org-1', name: 'Acme Inc' });

		await expect(act('rename', locals, { name: '  Acme  ' })).resolves.toEqual({ success: true });
		await expect(act('upgrade', locals, { name: ' Acme Inc ' })).resolves.toEqual({
			success: true
		});
		expect(organizations.renameOrganization).toHaveBeenCalledWith('org-1', 'Acme');
		expect(organizations.upgradeOrganization).toHaveBeenCalledWith('org-1', 'Acme Inc');
	});

	it('requires a name, before checking the session', async () => {
		for (const name of ['rename', 'upgrade'] as const) {
			const locals = testLocals({ jwtString: null });

			await expect(act(name, locals, { name: '   ' })).resolves.toMatchObject({
				status: 400,
				data: { error: m.validation_name_required(), name: '' }
			});
			await expect(act(name, locals)).resolves.toMatchObject({
				status: 400,
				data: { error: m.validation_name_required(), name: '' }
			});
			expect(locals.services.organizations.getMeContext).not.toHaveBeenCalled();
		}
	});

	it('reports a failed upgrade', async () => {
		const locals = signedIn();
		locals.services.organizations.upgradeOrganization.mockRejectedValue(
			apiError(403, 'Only personal orgs can upgrade')
		);

		await expect(act('upgrade', locals, { name: 'Acme Inc' })).resolves.toMatchObject({
			status: 403,
			data: { error: 'Only personal orgs can upgrade' }
		});
	});
});

describe('linkRequest', () => {
	it('asks the trimmed child org to link', async () => {
		const locals = signedIn();
		locals.services.organizations.createOrgLinkRequest.mockResolvedValue({});

		await expect(act('linkRequest', locals, { child_org_id: ' org-2 ' })).resolves.toEqual({
			success: true
		});
		expect(locals.services.organizations.createOrgLinkRequest).toHaveBeenCalledWith(
			'org-1',
			'org-2'
		);
	});

	it('requires a child org id', async () => {
		const locals = signedIn();

		for (const fields of [{ child_org_id: '  ' }, {}] as Record<string, string>[]) {
			await expect(act('linkRequest', locals, fields)).resolves.toMatchObject({
				status: 400,
				data: { error: m.generic_error() }
			});
		}
		expect(locals.services.organizations.getMeContext).not.toHaveBeenCalled();
	});
});

describe('unlinkChild', () => {
	it('unlinks the child org as sent', async () => {
		const locals = signedIn();
		locals.services.organizations.unlinkOrgChild.mockResolvedValue({});

		await expect(act('unlinkChild', locals, { child_id: 'org-2' })).resolves.toEqual({
			success: true
		});
		expect(locals.services.organizations.unlinkOrgChild).toHaveBeenCalledWith('org-1', 'org-2');
	});

	it('requires a child id', async () => {
		const locals = signedIn();

		await expect(act('unlinkChild', locals)).resolves.toMatchObject({
			status: 400,
			data: { error: m.generic_error() }
		});
		expect(locals.services.organizations.getMeContext).not.toHaveBeenCalled();
	});
});

describe('decideRequest', () => {
	it('accepts or declines a parent request', async () => {
		const locals = signedIn();
		locals.services.organizations.decideOrgParentRequest.mockResolvedValue({});

		for (const decision of ['accept', 'decline']) {
			await expect(
				act('decideRequest', locals, { request_id: 'req-1', decision })
			).resolves.toEqual({ success: true });
		}
		expect(locals.services.organizations.decideOrgParentRequest.mock.calls).toEqual([
			['org-1', 'req-1', 'accept'],
			['org-1', 'req-1', 'decline']
		]);
	});

	it('requires a request id and a known decision', async () => {
		const locals = signedIn();

		for (const fields of [
			{ decision: 'accept' },
			{ request_id: 'req-1' },
			{ request_id: 'req-1', decision: 'maybe' }
		] as Record<string, string>[]) {
			await expect(act('decideRequest', locals, fields)).resolves.toMatchObject({
				status: 400,
				data: { error: m.generic_error() }
			});
		}
		expect(locals.services.organizations.getMeContext).not.toHaveBeenCalled();
	});
});
