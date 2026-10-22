import { describe, expect, it } from 'vitest';
import type { MeContextDto, MeOrgDto } from '$lib/api/api.dtos';
import { Capability } from '$lib/auth/capabilities';
import { m } from '$lib/paraglide/messages.js';
import { buildProfileMenuItems } from './header-menu-items';

function context(
	overrides: Partial<MeContextDto> = {},
	org: Partial<MeOrgDto> | null = null
): MeContextDto {
	return {
		orgs_enabled: true,
		is_staff: false,
		suspended: false,
		org:
			org === null
				? null
				: { id: 'org-1', type: 'company', name: 'Acme', role: 'member', capabilities: [], ...org },
		guest_orgs: [],
		child_orgs: [],
		...overrides
	} as MeContextDto;
}

const ids = (ctx: MeContextDto | undefined) => buildProfileMenuItems(ctx).map((item) => item.id);

describe('buildProfileMenuItems', () => {
	it('offers only the personal entries without an org context (fail-closed)', () => {
		expect(buildProfileMenuItems(undefined)).toEqual([
			{ id: 'profile', label: m.nav_profile() },
			{ id: 'settings', label: m.nav_settings() },
			{ id: 'logout', label: m.nav_logout(), separator: true, danger: true }
		]);
	});

	it('offers nothing extra to a user without an organization', () => {
		expect(ids(context())).toEqual(['profile', 'settings', 'logout']);
	});

	it('shows the organization to any member', () => {
		expect(buildProfileMenuItems(context({}, {}))).toEqual([
			{ id: 'profile', label: m.nav_profile() },
			{ id: 'organization', label: m.nav_organization() },
			{ id: 'settings', label: m.nav_settings() },
			{ id: 'logout', label: m.nav_logout(), separator: true, danger: true }
		]);
	});

	it('shows billing to those who manage it', () => {
		const items = buildProfileMenuItems(context({}, { capabilities: [Capability.BillingManage] }));

		expect(items.map((item) => item.id)).toEqual([
			'profile',
			'organization',
			'billing',
			'settings',
			'logout'
		]);
		expect(items[2]).toEqual({ id: 'billing', label: m.nav_billing() });
	});

	it('shows management to owners and managers', () => {
		const items = buildProfileMenuItems(context({}, { capabilities: [Capability.OrgManageOpen] }));

		expect(items.map((item) => item.id)).toEqual([
			'profile',
			'organization',
			'management',
			'settings',
			'logout'
		]);
		expect(items[2]).toEqual({ id: 'management', label: m.nav_management() });
	});

	it('orders every entry for an org owner', () => {
		expect(
			ids(context({}, { capabilities: [Capability.OrgManageOpen, Capability.BillingManage] }))
		).toEqual(['profile', 'organization', 'billing', 'management', 'settings', 'logout']);
	});

	it('gives staff billing and management even outside an organization', () => {
		expect(ids(context({ is_staff: true }))).toEqual([
			'profile',
			'billing',
			'management',
			'settings',
			'logout'
		]);
	});
});
