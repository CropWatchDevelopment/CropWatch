import type { OrgRole, OrgType } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';

/** Localized label for an org role (also accepts the API's 'staff'/null). */
export function orgRoleLabel(role: OrgRole | 'staff' | null | undefined): string {
	switch (role) {
		case 'owner':
			return m.org_role_owner();
		case 'manager':
			return m.org_role_manager();
		case 'member':
			return m.org_role_member();
		case 'guest':
			return m.org_role_guest();
		default:
			return m.common_not_available();
	}
}

/** Localized label for an org type. */
export function orgTypeLabel(type: OrgType | null | undefined): string {
	switch (type) {
		case 'company':
			return m.organization_type_company();
		case 'personal':
			return m.organization_type_personal();
		default:
			return m.common_not_available();
	}
}
