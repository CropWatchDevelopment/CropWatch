import { error } from '@sveltejs/kit';
import type { MeContextDto } from '$lib/api/api.dtos';
import { can } from '$lib/auth/capabilities';

/**
 * Server-side capability gate for page loads and actions: throws a real 403
 * (never `fail`) when the caller's org context lacks the capability.
 * Fail-closed — a missing context is a 403 too.
 */
export function requireCapability(
	ctx: MeContextDto | null | undefined,
	capability: string
): MeContextDto {
	if (!ctx || !can(ctx, capability)) {
		error(403, 'Forbidden');
	}
	return ctx;
}
