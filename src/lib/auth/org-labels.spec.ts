import { describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { orgRoleLabel, orgTypeLabel } from './org-labels';

describe('orgRoleLabel', () => {
	it('labels each org role', () => {
		expect(orgRoleLabel('owner')).toBe(m.org_role_owner());
		expect(orgRoleLabel('manager')).toBe(m.org_role_manager());
		expect(orgRoleLabel('member')).toBe(m.org_role_member());
		expect(orgRoleLabel('guest')).toBe(m.org_role_guest());
	});

	it("shows 'not available' for staff and missing roles", () => {
		expect(orgRoleLabel('staff')).toBe(m.common_not_available());
		expect(orgRoleLabel(null)).toBe(m.common_not_available());
		expect(orgRoleLabel(undefined)).toBe(m.common_not_available());
	});
});

describe('orgTypeLabel', () => {
	it('labels each org type', () => {
		expect(orgTypeLabel('company')).toBe(m.organization_type_company());
		expect(orgTypeLabel('personal')).toBe(m.organization_type_personal());
	});

	it("shows 'not available' for a missing type", () => {
		expect(orgTypeLabel(null)).toBe(m.common_not_available());
		expect(orgTypeLabel(undefined)).toBe(m.common_not_available());
	});
});
