import type { LayoutServerLoad } from './$types';
import { Capability } from '$lib/auth/capabilities';
import { requireCapability } from '$lib/server/require-capability';

export const load: LayoutServerLoad = async ({ parent }) => {
	const { orgContext } = await parent();
	// Owner + managers only; members/guests deep-linking get a real 403.
	requireCapability(orgContext, Capability.OrgManageOpen);
	return {};
};
