import type { OrgRole } from '$lib/api/api.dtos';

/**
 * Pure mirror of the API's member-management rules
 * (api: src/v1/common/authz/org-role-policy.ts) so the UI only offers
 * actions the API will accept. The API remains the enforcement boundary.
 *
 *  - The Owner can invite anyone and change, suspend, or remove anyone
 *    except themselves.
 *  - Managers can invite Members and Managers, and edit/suspend/remove
 *    MEMBERS only — never other Managers, Guests, or the Owner.
 *  - Only the Owner touches Guests.
 *  - Nobody changes their own role; anyone except the Owner may leave.
 */

/** Roles the actor may invite into the org. */
export function inviteableRoles(actorRole: OrgRole | null | undefined): OrgRole[] {
	if (actorRole === 'owner') return ['manager', 'member', 'guest'];
	if (actorRole === 'manager') return ['manager', 'member'];
	return [];
}

/** Roles a role-change dialog may offer for the target (excluding no-ops). */
export function assignableRoles(
	actorRole: OrgRole | null | undefined,
	targetRole: OrgRole
): OrgRole[] {
	if (targetRole === 'owner' || targetRole === 'guest') return [];
	if (actorRole === 'owner') {
		return (['manager', 'member'] as OrgRole[]).filter((role) => role !== targetRole);
	}
	// Managers cannot promote members or touch managers — no role changes.
	return [];
}

export function canSuspend(
	actorRole: OrgRole | null | undefined,
	targetRole: OrgRole,
	isSelf: boolean
): boolean {
	if (isSelf || targetRole === 'owner') return false;
	if (actorRole === 'owner') return true;
	return actorRole === 'manager' && targetRole === 'member';
}

export function canRemove(
	actorRole: OrgRole | null | undefined,
	targetRole: OrgRole,
	isSelf: boolean
): boolean {
	if (targetRole === 'owner') return false;
	if (isSelf) return true; // anyone except the owner may leave
	if (actorRole === 'owner') return true;
	return actorRole === 'manager' && targetRole === 'member';
}
