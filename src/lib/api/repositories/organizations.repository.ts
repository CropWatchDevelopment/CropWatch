import type {
	CreateOrgInviteRequest,
	InvitePreviewDto,
	MeContextDto,
	OrganizationDto,
	OrgChildrenDto,
	OrgInviteDto,
	OrgMemberDto,
	OrgParentRequestDto
} from '../api.dtos';
import type { HttpClient } from '../http/http-client';
import { replacePathParams } from '../http/url';

const ME_CONTEXT_ENDPOINT = '/me/context';
const ORG_ENDPOINT = '/orgs/{orgId}';
const ORG_UPGRADE_ENDPOINT = '/orgs/{orgId}/upgrade';
const ORG_MEMBERS_ENDPOINT = '/orgs/{orgId}/members';
const ORG_MEMBER_ENDPOINT = '/orgs/{orgId}/members/{userId}';
const ORG_MEMBER_SUSPEND_ENDPOINT = '/orgs/{orgId}/members/{userId}/suspend';
const ORG_MEMBER_REINSTATE_ENDPOINT = '/orgs/{orgId}/members/{userId}/reinstate';
const ORG_INVITES_ENDPOINT = '/orgs/{orgId}/invites';
const ORG_INVITE_ENDPOINT = '/orgs/{orgId}/invites/{inviteId}';
const ORG_INVITE_RESEND_ENDPOINT = '/orgs/{orgId}/invites/{inviteId}/resend';
const ORG_CHILDREN_ENDPOINT = '/orgs/{orgId}/children';
const ORG_CHILD_ENDPOINT = '/orgs/{orgId}/children/{childId}';
const ORG_CHILD_REQUESTS_ENDPOINT = '/orgs/{orgId}/children/requests';
const ORG_PARENT_REQUESTS_ENDPOINT = '/orgs/{orgId}/parent-requests';
const ORG_PARENT_REQUEST_DECIDE_ENDPOINT = '/orgs/{orgId}/parent-requests/{requestId}/{decision}';
const INVITE_PREVIEW_ENDPOINT = '/invites/{token}';
const INVITE_ACCEPT_ENDPOINT = '/invites/{token}/accept';

export interface UpdateOrgMemberRequest {
	role?: 'manager' | 'member';
	location_grants?: { location_id: number; default_role: number }[];
}

/** The caller's org standing, org settings, members, invites and parent/child links. */
export interface OrganizationRepository {
	getMeContext(): Promise<MeContextDto>;
	getOrganization(orgId: string): Promise<OrganizationDto>;
	renameOrganization(orgId: string, name: string): Promise<{ id: string; name: string }>;
	upgradeOrganization(orgId: string, name: string): Promise<{ id: string; name: string }>;
	listOrgMembers(orgId: string): Promise<OrgMemberDto[]>;
	updateOrgMember(orgId: string, userId: string, body: UpdateOrgMemberRequest): Promise<unknown>;
	suspendOrgMember(orgId: string, userId: string): Promise<unknown>;
	reinstateOrgMember(orgId: string, userId: string): Promise<unknown>;
	removeOrgMember(orgId: string, userId: string): Promise<unknown>;
	createOrgInvite(orgId: string, body: CreateOrgInviteRequest): Promise<OrgInviteDto>;
	listOrgInvites(orgId: string): Promise<OrgInviteDto[]>;
	revokeOrgInvite(orgId: string, inviteId: string): Promise<unknown>;
	resendOrgInvite(orgId: string, inviteId: string): Promise<unknown>;
	/** Public: always sent without a session token (the invitee may not be signed in). */
	previewInvite(token: string): Promise<InvitePreviewDto>;
	acceptInvite(token: string): Promise<{ org_id: string; role: string }>;
	listOrgChildren(orgId: string): Promise<OrgChildrenDto>;
	createOrgLinkRequest(orgId: string, childOrgId: string): Promise<unknown>;
	listOrgParentRequests(orgId: string): Promise<OrgParentRequestDto[]>;
	decideOrgParentRequest(
		orgId: string,
		requestId: string,
		decision: 'accept' | 'decline'
	): Promise<unknown>;
	unlinkOrgChild(orgId: string, childId: string): Promise<unknown>;
}

export class HttpOrganizationRepository implements OrganizationRepository {
	readonly #http: HttpClient;

	public constructor(http: HttpClient) {
		this.#http = http;
	}

	public getMeContext(): Promise<MeContextDto> {
		return this.#http.request<MeContextDto>(ME_CONTEXT_ENDPOINT, { method: 'GET' });
	}

	public getOrganization(orgId: string): Promise<OrganizationDto> {
		return this.#http.request<OrganizationDto>(replacePathParams(ORG_ENDPOINT, { orgId }), {
			method: 'GET'
		});
	}

	public renameOrganization(orgId: string, name: string): Promise<{ id: string; name: string }> {
		return this.#http.request(replacePathParams(ORG_ENDPOINT, { orgId }), {
			method: 'PATCH',
			body: { name }
		});
	}

	public upgradeOrganization(orgId: string, name: string): Promise<{ id: string; name: string }> {
		return this.#http.request(replacePathParams(ORG_UPGRADE_ENDPOINT, { orgId }), {
			method: 'POST',
			body: { name }
		});
	}

	public listOrgMembers(orgId: string): Promise<OrgMemberDto[]> {
		return this.#http.request<OrgMemberDto[]>(replacePathParams(ORG_MEMBERS_ENDPOINT, { orgId }), {
			method: 'GET'
		});
	}

	public updateOrgMember(
		orgId: string,
		userId: string,
		body: UpdateOrgMemberRequest
	): Promise<unknown> {
		return this.#http.request(replacePathParams(ORG_MEMBER_ENDPOINT, { orgId, userId }), {
			method: 'PATCH',
			body
		});
	}

	public suspendOrgMember(orgId: string, userId: string): Promise<unknown> {
		return this.#http.request(replacePathParams(ORG_MEMBER_SUSPEND_ENDPOINT, { orgId, userId }), {
			method: 'POST'
		});
	}

	public reinstateOrgMember(orgId: string, userId: string): Promise<unknown> {
		return this.#http.request(replacePathParams(ORG_MEMBER_REINSTATE_ENDPOINT, { orgId, userId }), {
			method: 'POST'
		});
	}

	public removeOrgMember(orgId: string, userId: string): Promise<unknown> {
		return this.#http.request(replacePathParams(ORG_MEMBER_ENDPOINT, { orgId, userId }), {
			method: 'DELETE'
		});
	}

	public createOrgInvite(orgId: string, body: CreateOrgInviteRequest): Promise<OrgInviteDto> {
		return this.#http.request<OrgInviteDto>(replacePathParams(ORG_INVITES_ENDPOINT, { orgId }), {
			method: 'POST',
			body
		});
	}

	public listOrgInvites(orgId: string): Promise<OrgInviteDto[]> {
		return this.#http.request<OrgInviteDto[]>(replacePathParams(ORG_INVITES_ENDPOINT, { orgId }), {
			method: 'GET'
		});
	}

	public revokeOrgInvite(orgId: string, inviteId: string): Promise<unknown> {
		return this.#http.request(replacePathParams(ORG_INVITE_ENDPOINT, { orgId, inviteId }), {
			method: 'DELETE'
		});
	}

	public resendOrgInvite(orgId: string, inviteId: string): Promise<unknown> {
		return this.#http.request(replacePathParams(ORG_INVITE_RESEND_ENDPOINT, { orgId, inviteId }), {
			method: 'POST'
		});
	}

	public previewInvite(token: string): Promise<InvitePreviewDto> {
		return this.#http.request<InvitePreviewDto>(
			replacePathParams(INVITE_PREVIEW_ENDPOINT, { token }),
			{ method: 'GET', authToken: null }
		);
	}

	public acceptInvite(token: string): Promise<{ org_id: string; role: string }> {
		return this.#http.request(replacePathParams(INVITE_ACCEPT_ENDPOINT, { token }), {
			method: 'POST'
		});
	}

	public listOrgChildren(orgId: string): Promise<OrgChildrenDto> {
		return this.#http.request<OrgChildrenDto>(replacePathParams(ORG_CHILDREN_ENDPOINT, { orgId }), {
			method: 'GET'
		});
	}

	public createOrgLinkRequest(orgId: string, childOrgId: string): Promise<unknown> {
		return this.#http.request(replacePathParams(ORG_CHILD_REQUESTS_ENDPOINT, { orgId }), {
			method: 'POST',
			body: { child_org_id: childOrgId }
		});
	}

	public listOrgParentRequests(orgId: string): Promise<OrgParentRequestDto[]> {
		return this.#http.request<OrgParentRequestDto[]>(
			replacePathParams(ORG_PARENT_REQUESTS_ENDPOINT, { orgId }),
			{ method: 'GET' }
		);
	}

	public decideOrgParentRequest(
		orgId: string,
		requestId: string,
		decision: 'accept' | 'decline'
	): Promise<unknown> {
		return this.#http.request(
			replacePathParams(ORG_PARENT_REQUEST_DECIDE_ENDPOINT, { orgId, requestId, decision }),
			{ method: 'POST' }
		);
	}

	public unlinkOrgChild(orgId: string, childId: string): Promise<unknown> {
		return this.#http.request(replacePathParams(ORG_CHILD_ENDPOINT, { orgId, childId }), {
			method: 'DELETE'
		});
	}
}
