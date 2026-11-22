import type { GroupDto } from '../api.dtos';
import type { HttpClient, RequestSignalOptions } from '../http/http-client';
import { replacePathParams } from '../http/url';

/** `listGroups` options: `orgId` narrows the list to one organization's groups. */
export interface ListGroupsOptions extends RequestSignalOptions {
	orgId?: string | null;
}

/**
 * The groups a location or a device can be put in. One implementation serves
 * both pools: `/location-groups` and `/device-groups` take the same calls.
 * A group belongs to an organization (one per name per org). A location or
 * device still saves its group by name (`group` on its own update), so these
 * calls only manage the list.
 */
export interface GroupRepository {
	/** The groups the caller can see (of one org when `orgId` is set), sorted by name. */
	listGroups(options?: ListGroupsOptions): Promise<GroupDto[]>;
	/** The org's group with this name: created, or the existing one when the org has it already. */
	createGroup(name: string, orgId: string): Promise<GroupDto>;
	/** Renames a group the caller manages; every location/device in it shows the new name. */
	renameGroup(id: number, name: string): Promise<GroupDto>;
	/** Deletes a group the caller manages; locations/devices in it are left without a group. */
	deleteGroup(id: number): Promise<void>;
}

export class HttpGroupRepository implements GroupRepository {
	readonly #http: HttpClient;
	readonly #listEndpoint: string;
	readonly #byIdEndpoint: string;

	public constructor(http: HttpClient, basePath: string) {
		this.#http = http;
		this.#listEndpoint = basePath;
		this.#byIdEndpoint = `${basePath}/{id}`;
	}

	public listGroups(options: ListGroupsOptions = {}): Promise<GroupDto[]> {
		return this.#http.request<GroupDto[]>(this.#listEndpoint, {
			method: 'GET',
			query: { org_id: options.orgId ?? undefined },
			signal: options.signal
		});
	}

	public createGroup(name: string, orgId: string): Promise<GroupDto> {
		return this.#http.request<GroupDto>(this.#listEndpoint, {
			method: 'POST',
			body: { name, org_id: orgId }
		});
	}

	public renameGroup(id: number, name: string): Promise<GroupDto> {
		return this.#http.request<GroupDto>(replacePathParams(this.#byIdEndpoint, { id }), {
			method: 'PATCH',
			body: { name }
		});
	}

	public async deleteGroup(id: number): Promise<void> {
		await this.#http.request<unknown>(replacePathParams(this.#byIdEndpoint, { id }), {
			method: 'DELETE'
		});
	}
}
