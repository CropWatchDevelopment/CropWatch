import type { PageServerLoad } from './$types';
import type { OrgChildrenDto, OrganizationDto, OrgParentRequestDto } from '$lib/api/api.dtos';
import { Capability } from '$lib/auth/capabilities';
import { requireCapability } from '$lib/server/require-capability';
import { managementSettingsActions } from './management-settings-actions.server';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { authToken, orgContext } = await parent();
	// Owner-only: a manager deep-linking here gets a real 403.
	requireCapability(orgContext, Capability.OrgSettingsManage);

	const orgId = orgContext?.org?.id ?? null;
	if (!authToken || !orgId) {
		return {
			organization: null as OrganizationDto | null,
			children: null as OrgChildrenDto | null,
			parentRequests: [] as OrgParentRequestDto[]
		};
	}

	const { organizations } = locals.services;
	const [organization, children, parentRequests] = await Promise.all([
		organizations.getOrganization(orgId).catch(() => null),
		organizations.listOrgChildren(orgId).catch(() => null),
		organizations.listOrgParentRequests(orgId).catch(() => [] as OrgParentRequestDto[])
	]);
	return { organization, children, parentRequests };
};

export const actions = managementSettingsActions;
