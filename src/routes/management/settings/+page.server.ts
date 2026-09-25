import type { PageServerLoad } from './$types';
import type { OrgChildrenDto, OrganizationDto, OrgParentRequestDto } from '$lib/api/api.dtos';
import { ApiService } from '$lib/api/api.service';
import { Capability } from '$lib/auth/capabilities';
import { requireCapability } from '$lib/server/require-capability';
import { managementSettingsActions } from './management-settings-actions.server';

export const load: PageServerLoad = async ({ parent, fetch }) => {
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

	const api = new ApiService({ fetchFn: fetch, authToken });
	const [organization, children, parentRequests] = await Promise.all([
		api.getOrganization(orgId).catch(() => null),
		api.listOrgChildren(orgId).catch(() => null),
		api.listOrgParentRequests(orgId).catch(() => [] as OrgParentRequestDto[])
	]);
	return { organization, children, parentRequests };
};

export const actions = managementSettingsActions;
