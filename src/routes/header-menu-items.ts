import type { MeContextDto } from '$lib/api/api.dtos';
import { Capability, can } from '$lib/auth/capabilities';
import { m } from '$lib/paraglide/messages.js';

export interface ProfileMenuItem {
	id: 'profile' | 'organization' | 'billing' | 'management' | 'settings' | 'logout';
	label: string;
	separator?: boolean;
	danger?: boolean;
}

/**
 * Profile-dropdown entries, capability-gated per the orgs plan (§7.2):
 * Organization shows for anyone with an org, Billing only with
 * `billing.manage` (org owners), Management only with `org.manage.open`
 * (owner + managers). Fail-closed: no org context hides the gated items.
 */
export function buildProfileMenuItems(ctx: MeContextDto | undefined): ProfileMenuItem[] {
	return [
		{ id: 'profile', label: m.nav_profile() },
		...(ctx?.org ? [{ id: 'organization', label: m.nav_organization() } as const] : []),
		...(can(ctx, Capability.BillingManage)
			? [{ id: 'billing', label: m.nav_billing() } as const]
			: []),
		...(can(ctx, Capability.OrgManageOpen)
			? [{ id: 'management', label: m.nav_management() } as const]
			: []),
		{ id: 'settings', label: m.nav_settings() },
		{ id: 'logout', label: m.nav_logout(), separator: true, danger: true }
	];
}
