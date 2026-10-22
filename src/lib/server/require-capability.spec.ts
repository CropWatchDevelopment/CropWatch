import { isHttpError } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import type { MeContextDto } from '$lib/api/api.dtos';
import { Capability } from '$lib/auth/capabilities';
import { requireCapability } from './require-capability';

function ctx(overrides: Partial<MeContextDto> = {}): MeContextDto {
	return {
		orgs_enabled: true,
		is_staff: false,
		suspended: false,
		org: {
			id: 'org-1',
			type: 'company',
			name: 'Test Org',
			role: 'manager',
			capabilities: [Capability.OrgManageOpen]
		},
		guest_orgs: [],
		child_orgs: [],
		...overrides
	};
}

/** The 403 `requireCapability` threw, as `{ status, body }`. */
function forbidden(run: () => unknown) {
	let thrown: unknown = new Error('expected requireCapability to throw');
	try {
		run();
	} catch (error) {
		thrown = error;
	}
	if (!isHttpError(thrown)) throw thrown;
	return { status: thrown.status, body: thrown.body };
}

describe('requireCapability', () => {
	it('returns the context when it grants the capability', () => {
		const context = ctx();

		expect(requireCapability(context, Capability.OrgManageOpen)).toBe(context);
	});

	it('lets staff through without the capability or an org', () => {
		const context = ctx({ is_staff: true, org: null });

		expect(requireCapability(context, Capability.OrgSettingsManage)).toBe(context);
	});

	it('throws a real 403 when the capability is missing', () => {
		expect(forbidden(() => requireCapability(ctx(), Capability.OrgSettingsManage))).toEqual({
			status: 403,
			body: { message: 'Forbidden' }
		});
	});

	it('fails closed without a context or an org', () => {
		for (const context of [null, undefined, ctx({ org: null })]) {
			expect(forbidden(() => requireCapability(context, Capability.OrgManageOpen))).toEqual({
				status: 403,
				body: { message: 'Forbidden' }
			});
		}
	});
});
