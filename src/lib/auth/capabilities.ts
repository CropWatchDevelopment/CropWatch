import type { MeContextDto } from '$lib/api/api.dtos';

/**
 * Org-level capability names served by GET /v1/me/context. Mirrors the API's
 * action names (api: src/v1/common/authz/actions.ts) — keep in sync.
 */
export const Capability = {
	OrgRead: 'org.read',
	OrgManageOpen: 'org.manage.open',
	OrgSettingsManage: 'org.settings.manage',
	MemberInvite: 'org.member.invite',
	GuestInvite: 'org.guest.invite',
	BillingManage: 'billing.manage',
	LocationCreate: 'location.create',
	LocationDelete: 'location.delete',
	DeviceReplace: 'device.replace',
	GatewayCreate: 'gateway.create'
} as const;

export type Capability = (typeof Capability)[keyof typeof Capability];

/**
 * Org-level check against the caller's /me/context. FAIL-CLOSED: with no
 * context, no org, or an unknown capability, nothing privileged is shown.
 * Staff pass everything (the API enforces the real rules either way — UI
 * gating is a convenience, not a security boundary).
 */
export function can(ctx: MeContextDto | null | undefined, capability: string): boolean {
	if (!ctx) {
		return false;
	}
	if (ctx.is_staff) {
		return true;
	}
	return ctx.org?.capabilities?.includes(capability) ?? false;
}

/**
 * Per-resource check for DTOs that embed an `access.capabilities` list.
 * Fail-closed like `can()`.
 */
export function canOn(
	resource: { access?: { capabilities?: string[] } | null } | null | undefined,
	capability: string
): boolean {
	return resource?.access?.capabilities?.includes(capability) ?? false;
}
