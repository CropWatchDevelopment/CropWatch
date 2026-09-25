import { describe, expect, it } from 'vitest';
import type { MeContextDto } from '$lib/api/api.dtos';
import { Capability, can, canOn } from './capabilities';

function ctx(overrides: Partial<MeContextDto> = {}): MeContextDto {
	return {
		orgs_enabled: false,
		is_staff: false,
		suspended: false,
		org: {
			id: 'org-1',
			type: 'personal',
			name: 'Test Org',
			role: 'owner',
			capabilities: [Capability.OrgManageOpen, Capability.BillingManage]
		},
		guest_orgs: [],
		child_orgs: [],
		...overrides
	};
}

describe('can', () => {
	it('fails closed with no context', () => {
		expect(can(null, Capability.OrgManageOpen)).toBe(false);
		expect(can(undefined, Capability.BillingManage)).toBe(false);
	});

	it('fails closed with no org or an unknown capability', () => {
		expect(can(ctx({ org: null }), Capability.OrgManageOpen)).toBe(false);
		expect(can(ctx(), 'made.up.capability')).toBe(false);
	});

	it('passes when the org context lists the capability', () => {
		expect(can(ctx(), Capability.OrgManageOpen)).toBe(true);
		expect(can(ctx(), Capability.BillingManage)).toBe(true);
		expect(can(ctx(), Capability.OrgSettingsManage)).toBe(false);
	});

	it('lets staff pass everything, even without an org', () => {
		expect(can(ctx({ is_staff: true, org: null }), Capability.OrgSettingsManage)).toBe(true);
	});
});

describe('canOn', () => {
	it('fails closed on missing resources or access lists', () => {
		expect(canOn(null, Capability.OrgManageOpen)).toBe(false);
		expect(canOn({}, Capability.OrgManageOpen)).toBe(false);
		expect(canOn({ access: { capabilities: [] } }, Capability.OrgManageOpen)).toBe(false);
	});

	it('passes when the resource access lists the capability', () => {
		expect(canOn({ access: { capabilities: ['device.replace'] } }, Capability.DeviceReplace)).toBe(
			true
		);
	});
});
