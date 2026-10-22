import type {
	CreateLocationRequest,
	DeleteLocationResultDto,
	LocationDeletePreflightDto,
	LocationDto,
	LocationsQuery,
	PaginatedResponse,
	UpdateLocationOwnerRequest,
	UpdateLocationRequest
} from '../api.dtos';
import type { HttpClient } from '../http/http-client';
import { normalizePaginatedListResponse } from '../http/pagination';
import { replacePathParams } from '../http/url';

const LOCATIONS_ENDPOINT = '/locations';
const LOCATION_GROUPS_ENDPOINT = '/locations/groups';
const LOCATION_BY_ID_ENDPOINT = '/locations/{id}';
const LOCATION_DELETE_PREFLIGHT_ENDPOINT = '/locations/{id}/delete-preflight';
const LOCATION_PERMISSION_ENDPOINT = '/locations/{id}/permission';
const LOCATION_PERMISSION_LEVEL_ENDPOINT = '/locations/{id}/permission-level';

/** Locations and who may access them. */
export interface LocationRepository {
	getAllLocations(query?: LocationsQuery): Promise<PaginatedResponse<LocationDto>>;
	getLocations(): Promise<LocationDto[]>;
	getLocation(id: number | string): Promise<LocationDto>;
	getLocationGroups(): Promise<string[]>;
	createLocation(payload: CreateLocationRequest): Promise<LocationDto | Record<string, unknown>>;
	updateLocation(
		id: number | string,
		payload: UpdateLocationRequest
	): Promise<LocationDto | Record<string, unknown>>;
	/** Owner-only: devices still blocking the delete. 403/404 just mean "not the owner". */
	getLocationDeletePreflight(id: number | string): Promise<LocationDeletePreflightDto>;
	/** Permanently deletes an empty location (owner-only; 409 while it has devices). */
	deleteLocation(id: number | string): Promise<DeleteLocationResultDto>;
	createLocationPermission(
		location_id: number | string,
		newUserEmail: string,
		permission_level: number,
		applyToAllDevices?: boolean
	): Promise<LocationDto>;
	updateLocationPermission(
		location_id: number | string,
		payload: UpdateLocationOwnerRequest,
		applyToAllDevices?: boolean
	): Promise<LocationDto>;
	updateLocationPermissionLevel(
		location_id: number | string,
		email: string,
		permission_level: number
	): Promise<LocationDto>;
	deleteLocationPermission(
		location_id: number | string,
		permissionId?: number | string
	): Promise<LocationDto>;
}

export class HttpLocationRepository implements LocationRepository {
	readonly #http: HttpClient;

	public constructor(http: HttpClient) {
		this.#http = http;
	}

	public async getAllLocations(
		query: LocationsQuery = {}
	): Promise<PaginatedResponse<LocationDto>> {
		const payload = await this.#http.request<LocationDto[] | PaginatedResponse<LocationDto>>(
			LOCATIONS_ENDPOINT,
			{
				method: 'GET',
				query: {
					name: query.name
				}
			}
		);

		return normalizePaginatedListResponse<LocationDto>(payload);
	}

	public async getLocations(): Promise<LocationDto[]> {
		const { data } = await this.getAllLocations();
		return data ?? [];
	}

	public getLocation(id: number | string): Promise<LocationDto> {
		return this.#http.request<LocationDto>(replacePathParams(LOCATION_BY_ID_ENDPOINT, { id }), {
			method: 'GET'
		});
	}

	public getLocationGroups(): Promise<string[]> {
		return this.#http.request<string[]>(LOCATION_GROUPS_ENDPOINT, { method: 'GET' });
	}

	public createLocation(
		payload: CreateLocationRequest
	): Promise<LocationDto | Record<string, unknown>> {
		return this.#http.request<LocationDto | Record<string, unknown>>(LOCATIONS_ENDPOINT, {
			method: 'POST',
			body: payload
		});
	}

	public updateLocation(
		id: number | string,
		payload: UpdateLocationRequest
	): Promise<LocationDto | Record<string, unknown>> {
		return this.#http.request<LocationDto | Record<string, unknown>>(
			replacePathParams(LOCATION_BY_ID_ENDPOINT, { id }),
			{ method: 'PATCH', body: payload }
		);
	}

	public getLocationDeletePreflight(id: number | string): Promise<LocationDeletePreflightDto> {
		return this.#http.request<LocationDeletePreflightDto>(
			replacePathParams(LOCATION_DELETE_PREFLIGHT_ENDPOINT, { id }),
			{ method: 'GET', suppressErrorStatuses: [403, 404] }
		);
	}

	public deleteLocation(id: number | string): Promise<DeleteLocationResultDto> {
		return this.#http.request<DeleteLocationResultDto>(
			replacePathParams(LOCATION_BY_ID_ENDPOINT, { id }),
			{ method: 'DELETE' }
		);
	}

	public createLocationPermission(
		location_id: number | string,
		newUserEmail: string,
		permission_level: number,
		applyToAllDevices?: boolean
	): Promise<LocationDto> {
		return this.#http.request<LocationDto>(
			replacePathParams(LOCATION_PERMISSION_ENDPOINT, { id: location_id }),
			{
				method: 'POST',
				query: {
					newUserEmail,
					permission_level,
					applyToAllDevices
				},
				body: {
					location_id,
					user_email: newUserEmail,
					applyToAllDevices
				}
			}
		);
	}

	public updateLocationPermission(
		location_id: number | string,
		payload: UpdateLocationOwnerRequest,
		applyToAllDevices?: boolean
	): Promise<LocationDto> {
		return this.#http.request<LocationDto>(
			replacePathParams(LOCATION_PERMISSION_ENDPOINT, { id: location_id }),
			{
				method: 'PATCH',
				query: {
					applyToAllDevices
				},
				body: payload
			}
		);
	}

	public updateLocationPermissionLevel(
		location_id: number | string,
		email: string,
		permission_level: number
	): Promise<LocationDto> {
		return this.#http.request<LocationDto>(
			replacePathParams(LOCATION_PERMISSION_LEVEL_ENDPOINT, { id: location_id }),
			{
				method: 'PATCH',
				body: {
					location_id,
					email,
					permission_level
				}
			}
		);
	}

	public deleteLocationPermission(
		location_id: number | string,
		permissionId?: number | string
	): Promise<LocationDto> {
		return this.#http.request<LocationDto>(
			replacePathParams(LOCATION_PERMISSION_ENDPOINT, { id: location_id }),
			{
				method: 'DELETE',
				query: {
					permission_id: permissionId
				}
			}
		);
	}
}
