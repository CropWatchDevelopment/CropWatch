import type { PageServerLoad } from './$types';
import type { OrgInviteDto, OrgMemberDto } from '$lib/api/api.dtos';
import { managementUsersActions } from './management-users-actions.server';

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { authToken, orgContext } = await parent();
	const orgId = orgContext?.org?.id ?? null;
	if (!authToken || !orgId) {
		return { members: [] as OrgMemberDto[], invites: [] as OrgInviteDto[] };
	}

	const { organizations } = locals.services;
	const [members, invites] = await Promise.all([
		organizations.listOrgMembers(orgId).catch(() => [] as OrgMemberDto[]),
		organizations.listOrgInvites(orgId).catch(() => [] as OrgInviteDto[])
	]);
	return { members, invites };
};

export const actions = managementUsersActions;
