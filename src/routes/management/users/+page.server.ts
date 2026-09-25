import type { PageServerLoad } from './$types';
import type { OrgInviteDto, OrgMemberDto } from '$lib/api/api.dtos';
import { ApiService } from '$lib/api/api.service';
import { managementUsersActions } from './management-users-actions.server';

export const load: PageServerLoad = async ({ parent, fetch }) => {
	const { authToken, orgContext } = await parent();
	const orgId = orgContext?.org?.id ?? null;
	if (!authToken || !orgId) {
		return { members: [] as OrgMemberDto[], invites: [] as OrgInviteDto[] };
	}

	const api = new ApiService({ fetchFn: fetch, authToken });
	const [members, invites] = await Promise.all([
		api.listOrgMembers(orgId).catch(() => [] as OrgMemberDto[]),
		api.listOrgInvites(orgId).catch(() => [] as OrgInviteDto[])
	]);
	return { members, invites };
};

export const actions = managementUsersActions;
