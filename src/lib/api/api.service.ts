import {
	PUBLIC_API_BASE_URL,
	PUBLIC_DEVICE_LATEST_PRIMARY_DATA_BY_DEV_EUI_ENDPOINT,
	PUBLIC_DEVICE_LATEST_PRIMARY_DATA_ENDPOINT,
	PUBLIC_DEVICE_STATUS_ENDPOINT,
	PUBLIC_LOGIN_ENDPOINT,
	PUBLIC_AIR_NOTES_ENDPOINT,
	PUBLIC_RULES_ENDPOINT,
	PUBLIC_TRIGGERED_RULES_ENDPOINT,
	PUBLIC_TRIGGERED_RULES_ENDPOINT_COUNT
} from '$env/static/public';
import { redirect } from '@sveltejs/kit';
import type {
	CreateLocationRequest,
	CreateLocationOwnerRequest,
	CreateReportRequest,
	CreateRuleRequest,
	DeviceDataWithinRangeQuery,
	DeviceDto,
	DevicePrimaryDataDto,
	DeviceStatusSummary,
	LatestPrimaryDataQuery,
	ListOrPaginatedResponse,
	LocationDto,
	LoginRequest,
	LoginResponse,
	PaginatedResponse,
	PaginationQuery,
	ReportDto,
	RuleDto,
	SensorTimeSeriesPoint,
	TimeRangeQuery,
	TrafficDataPoint,
	TriggeredRulesCountResponse,
	UpdateLocationRequest,
	UpdateLocationOwnerRequest,
	UpdateReportRequest,
	UpdateRuleRequest,
	WaterDataPoint
} from './api.dtos';

type FetchLike = typeof fetch;

export type ApiQueryValue = string | number | boolean | Date | null | undefined;
export type ApiQuery = Record<string, ApiQueryValue>;

export interface ApiErrorResponse {
	statusCode?: number;
	error?: string;
	message?: string | string[] | Record<string, unknown>;
	[key: string]: unknown;
}

export class ApiServiceError extends Error {
	public readonly status: number;
	public readonly payload: unknown;

	public constructor(status: number, statusText: string, payload: unknown) {
		super(`CropWatch API request failed (${status} ${statusText})`);
		this.name = 'ApiServiceError';
		this.status = status;
		this.payload = payload;
	}
}

export interface ApiServiceOptions {
	baseUrl?: string;
	fetchFn?: FetchLike;
	authToken?: string | null;
}

interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
	body?: unknown;
	headers?: HeadersInit;
	query?: ApiQuery;
	authToken?: string | null;
	responseType?: 'json' | 'text';
}

const AUTH_ENDPOINT = '/auth';
const AIR_ENDPOINT = '/air/{dev_eui}';
const DEVICES_ENDPOINT = '/devices';
const DEVICE_BY_DEV_EUI_ENDPOINT = '/devices/{dev_eui}';
const DEVICE_DATA_ENDPOINT = '/devices/{dev_eui}/data';
const DEVICE_DATA_WITHIN_RANGE_ENDPOINT = '/devices/{dev_eui}/data-within-range';
const DEVICE_LATEST_DATA_ENDPOINT = '/devices/{dev_eui}/latest-data';
const LOCATIONS_ENDPOINT = '/locations';
const LOCATION_BY_ID_ENDPOINT = '/locations/{id}';
const LOCATION_PERMISSION_ENDPOINT = '/locations/{id}/permission';
const LOCATION_PERMISSION_UPDATE_PERMISSION_LEVEL_ENDPOINT = '/locations/{id}/permission-level';
const POWER_ENDPOINT = '/power/{id}';
const REPORTS_ENDPOINT = '/reports';
const REPORT_BY_ID_ENDPOINT = '/reports/{id}';
const REPORT_BY_REPORT_ID_ENDPOINT = '/reports/{report_id}';
const RULE_BY_ID_ENDPOINT = `${PUBLIC_RULES_ENDPOINT}/{id}`;
const AIR_NOTES_ENDPOINT = `${PUBLIC_AIR_NOTES_ENDPOINT}/notes`;
const SOIL_ENDPOINT = '/soil/{dev_eui}';
const TRAFFIC_ENDPOINT = '/traffic/{dev_eui}';
const WATER_ENDPOINT = '/water/{dev_eui}';

function toIsoIfDate(value: string | Date | undefined): string | undefined {
	if (value === undefined) return undefined;
	return value instanceof Date ? value.toISOString() : value;
}

function buildQueryString(query?: ApiQuery): string {
	if (!query) return '';

	const searchParams = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === null) continue;
		searchParams.set(key, value instanceof Date ? value.toISOString() : String(value));
	}

	const serialized = searchParams.toString();
	return serialized.length > 0 ? `?${serialized}` : '';
}

function buildUrl(baseUrl: string, path: string, query?: ApiQuery): string {
	const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
	const normalizedPath = path.length === 0 ? '' : path.startsWith('/') ? path : `/${path}`;
	return `${normalizedBaseUrl}${normalizedPath}${buildQueryString(query)}`;
}

function replacePathParams(
	pathTemplate: string,
	pathParams: Record<string, string | number>
): string {
	let resolvedPath = pathTemplate;
	for (const [param, value] of Object.entries(pathParams)) {
		resolvedPath = resolvedPath.replaceAll(`{${param}}`, encodeURIComponent(String(value)));
	}
	return resolvedPath;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
	const rawPayload = await response.text();
	if (!rawPayload) return null;

	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		try {
			return JSON.parse(rawPayload) as unknown;
		} catch {
			return rawPayload;
		}
	}

	return rawPayload;
}

export class ApiService {
	private readonly baseUrl: string;
	private readonly fetchFn: FetchLike;
	private authToken: string | null;

	public constructor(options: ApiServiceOptions = {}) {
		this.baseUrl = options.baseUrl ?? PUBLIC_API_BASE_URL;
		this.fetchFn = options.fetchFn ?? fetch;
		this.authToken = options.authToken ?? null;
	}

	public setAuthToken(token: string | null): void {
		this.authToken = token;
	}

	public clearAuthToken(): void {
		this.authToken = null;
	}

	private async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
		const { body, headers, query, authToken, responseType = 'json', ...requestInit } = options;
		const url = buildUrl(this.baseUrl, path, query);

		const resolvedHeaders = new Headers(headers);
		const resolvedToken = authToken === undefined ? this.authToken : authToken;

		if (!resolvedHeaders.has('Accept')) {
			resolvedHeaders.set(
				'Accept',
				responseType === 'json' ? 'application/json' : 'text/plain, text/html, */*'
			);
		}

		let serializedBody: string | undefined;
		if (body !== undefined) {
			if (!resolvedHeaders.has('Content-Type')) {
				resolvedHeaders.set('Content-Type', 'application/json');
			}
			serializedBody = JSON.stringify(body);
		}

		if (resolvedToken) {
			resolvedHeaders.set('Authorization', `Bearer ${resolvedToken}`);
		}

		const response = await this.fetchFn(url, {
			...requestInit,
			headers: resolvedHeaders,
			body: serializedBody
		});

		const payload = await parseResponsePayload(response);
		if (!response.ok) {
			console.error('API request failed', {
				url,
				method: requestInit.method ?? 'GET',
				status: response.status,
				statusText: response.statusText,
				payload
			});
			if (response.status === 401) {
				this.clearAuthToken();
				location.href =
					'/auth/login?redirect=' + encodeURIComponent(location.pathname + location.search);
			}
			// throw new ApiServiceError(response.status, response.statusText, payload);
			throw redirect(303, '/auth/login?redirect=' + encodeURIComponent(location.pathname + location.search));
		}

		if (responseType === 'text') {
			return (typeof payload === 'string' ? payload : JSON.stringify(payload ?? '')) as T;
		}

		return payload as T;
	}

	public getApiHome(): Promise<string> {
		return this.request<string>('', { method: 'GET', responseType: 'text' });
	}

	public getAuthenticatedUser(): Promise<Record<string, unknown>> {
		return this.request<Record<string, unknown>>(AUTH_ENDPOINT, { method: 'GET' });
	}

	public login(payload: LoginRequest): Promise<LoginResponse> {
		return this.request<LoginResponse>(PUBLIC_LOGIN_ENDPOINT, {
			method: 'POST',
			body: payload,
			authToken: null
		});
	}

	public getAirData(devEui: string, query: TimeRangeQuery = {}): Promise<SensorTimeSeriesPoint[]> {
		return this.request<SensorTimeSeriesPoint[]>(
			replacePathParams(AIR_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET',
				query: {
					start: toIsoIfDate(query.start),
					end: toIsoIfDate(query.end),
					timezone: query.timezone
				}
			}
		);
	}

	public getSoilData(devEui: string, query: TimeRangeQuery = {}): Promise<SensorTimeSeriesPoint[]> {
		return this.request<SensorTimeSeriesPoint[]>(
			replacePathParams(SOIL_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET',
				query: {
					start: toIsoIfDate(query.start),
					end: toIsoIfDate(query.end),
					timezone: query.timezone
				}
			}
		);
	}

	public getWaterData(devEui: string, query: TimeRangeQuery = {}): Promise<WaterDataPoint[]> {
		return this.request<WaterDataPoint[]>(replacePathParams(WATER_ENDPOINT, { dev_eui: devEui }), {
			method: 'GET',
			query: {
				start: toIsoIfDate(query.start),
				end: toIsoIfDate(query.end),
				timezone: query.timezone
			}
		});
	}

	public getPowerRecord(id: string): Promise<string> {
		return this.request<string>(replacePathParams(POWER_ENDPOINT, { id }), {
			method: 'GET'
		});
	}

	public getTrafficData(devEui: string, query: TimeRangeQuery = {}): Promise<TrafficDataPoint[]> {
		return this.request<TrafficDataPoint[]>(
			replacePathParams(TRAFFIC_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET',
				query: {
					start: toIsoIfDate(query.start),
					end: toIsoIfDate(query.end),
					timezone: query.timezone
				}
			}
		);
	}

	public getDevices(): Promise<DeviceDto[]> {
		return this.request<DeviceDto[]>(DEVICES_ENDPOINT, { method: 'GET' });
	}

	public async getAllLocationDevices(
		locationId: number
	): Promise<PaginatedResponse<DevicePrimaryDataDto>> {
		const endpoint = `${DEVICES_ENDPOINT}/location/${locationId}`;
		const payload = await this.request<
			DevicePrimaryDataDto[] | PaginatedResponse<DevicePrimaryDataDto>
		>(endpoint, {
			method: 'GET'
		});

		if (Array.isArray(payload)) {
			return {
				data: payload,
				total: payload.length
			};
		}

		return payload;
	}

	public async getAllLocations(): Promise<PaginatedResponse<LocationDto>> {
		const payload = await this.request<LocationDto[] | PaginatedResponse<LocationDto>>(
			LOCATIONS_ENDPOINT,
			{ method: 'GET' }
		);

		if (Array.isArray(payload)) {
			return {
				data: payload,
				total: payload.length
			};
		}

		return payload;
	}

	public async getLocations(): Promise<LocationDto[]> {
		const { data } = await this.getAllLocations();
		return data ?? [];
	}

	public getLocation(id: number | string): Promise<LocationDto> {
		return this.request<LocationDto>(replacePathParams(LOCATION_BY_ID_ENDPOINT, { id }), {
			method: 'GET'
		});
	}

	public createLocationPermission(
		location_id: number | string,
		newUserEmail: string,
		permission_level: number,
		applyToAllDevices?: boolean
	): Promise<LocationDto> {
		return this.request<LocationDto>(replacePathParams(LOCATION_PERMISSION_ENDPOINT, { id: location_id }), {
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
		});
	}

	public updateLocationPermission(
		location_id: number | string,
		payload: UpdateLocationOwnerRequest,
		applyToAllDevices?: boolean
	): Promise<LocationDto> {
		return this.request<LocationDto>(replacePathParams(LOCATION_PERMISSION_ENDPOINT, { id: location_id }), {
			method: 'PATCH',
			query: {
				applyToAllDevices
			},
			body: payload
		});
	}

	public async updateLocationPermissionLevel(
		location_id: number | string,
		email: string,
		permission_level: number,
	): Promise<LocationDto> {
		const endpoint = replacePathParams(LOCATION_PERMISSION_UPDATE_PERMISSION_LEVEL_ENDPOINT, { id: location_id });
		return this.request<LocationDto>(endpoint, {
			method: 'PATCH',
			body: {
				location_id,
				email,
				permission_level,
			}
		});
	}

	public createLocation(
		payload: CreateLocationRequest
	): Promise<LocationDto | Record<string, unknown>> {
		return this.request<LocationDto | Record<string, unknown>>(LOCATIONS_ENDPOINT, {
			method: 'POST',
			body: payload
		});
	}

	public updateLocation(
		id: number | string,
		payload: UpdateLocationRequest
	): Promise<LocationDto | Record<string, unknown>> {
		return this.request<LocationDto | Record<string, unknown>>(
			replacePathParams(LOCATION_BY_ID_ENDPOINT, { id }),
			{
				method: 'PATCH',
				body: payload
			}
		);
	}

	public deleteLocation(id: number | string): Promise<number | Record<string, unknown>> {
		return this.request<number | Record<string, unknown>>(
			replacePathParams(LOCATION_BY_ID_ENDPOINT, { id }),
			{
				method: 'DELETE'
			}
		);
	}

	public deleteLocationPermission(
		location_id: number | string,
		permissionId?: number | string
	): Promise<LocationDto> {
		const endpoint = replacePathParams(LOCATION_PERMISSION_ENDPOINT, { id: location_id });
		return this.request<LocationDto>(endpoint, {
			method: 'DELETE',
			query: {
				permission_id: permissionId
			}
		});
	}

	public getDeviceStatuses(): Promise<DeviceStatusSummary> {
		return this.request<DeviceStatusSummary>(PUBLIC_DEVICE_STATUS_ENDPOINT, {
			method: 'GET'
		});
	}

	public getDeviceGroups(): Promise<string[]> {
		return this.request<string[]>(`${DEVICES_ENDPOINT}/groups`, {
			method: 'GET'
		});
	}

	public getLatestPrimaryDeviceData(
		query: LatestPrimaryDataQuery = {}
	): Promise<PaginatedResponse<DevicePrimaryDataDto>> {
		return this.request<PaginatedResponse<DevicePrimaryDataDto>>(
			PUBLIC_DEVICE_LATEST_PRIMARY_DATA_ENDPOINT,
			{
				method: 'GET',
				query: {
					skip: query.skip,
					take: query.take,
					group: query.group,
					location: query.location,
					name: query.name
				}
			}
		);
	}

	public getDevice(devEui: string): Promise<DeviceDto> {
		return this.request<DeviceDto>(
			replacePathParams(DEVICE_BY_DEV_EUI_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET'
			}
		);
	}

	public createDevice(devEui: string): Promise<unknown> {
		return this.request<unknown>(
			replacePathParams(DEVICE_BY_DEV_EUI_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'POST'
			}
		);
	}

	public getDeviceData(
		devEui: string,
		query: PaginationQuery = {}
	): Promise<ListOrPaginatedResponse<Record<string, unknown>>> {
		return this.request<ListOrPaginatedResponse<Record<string, unknown>>>(
			replacePathParams(DEVICE_DATA_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET',
				query: {
					skip: query.skip,
					take: query.take
				}
			}
		);
	}

	public getDeviceDataWithinRange(
		devEui: string,
		query: DeviceDataWithinRangeQuery = {}
	): Promise<ListOrPaginatedResponse<Record<string, unknown>>> {
		return this.request<ListOrPaginatedResponse<Record<string, unknown>>>(
			replacePathParams(DEVICE_DATA_WITHIN_RANGE_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET',
				query: {
					skip: query.skip,
					take: query.take,
					start: toIsoIfDate(query.start),
					end: toIsoIfDate(query.end)
				}
			}
		);
	}

	public getDeviceLatestData(devEui: string): Promise<Record<string, unknown>> {
		return this.request<Record<string, unknown>>(
			replacePathParams(DEVICE_LATEST_DATA_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET'
			}
		);
	}

	public getDeviceLatestPrimaryData(devEui: string): Promise<DevicePrimaryDataDto> {
		return this.request<DevicePrimaryDataDto>(
			replacePathParams(PUBLIC_DEVICE_LATEST_PRIMARY_DATA_BY_DEV_EUI_ENDPOINT, {
				dev_eui: devEui
			}),
			{ method: 'GET' }
		);
	}

	public createRule(payload: CreateRuleRequest): Promise<RuleDto> {
		return this.request<RuleDto>(PUBLIC_RULES_ENDPOINT, {
			method: 'POST',
			body: payload
		});
	}

	public getRules(): Promise<RuleDto[]> {
		return this.request<RuleDto[]>(PUBLIC_RULES_ENDPOINT, { method: 'GET' });
	}

	public getTriggeredRules(): Promise<RuleDto[]> {
		return this.request<RuleDto[]>(PUBLIC_TRIGGERED_RULES_ENDPOINT, {
			method: 'GET'
		});
	}

	public getTriggeredRulesCount(): Promise<TriggeredRulesCountResponse> {
		return this.request<TriggeredRulesCountResponse>(PUBLIC_TRIGGERED_RULES_ENDPOINT_COUNT, {
			method: 'GET'
		});
	}

	public getRule(id: number): Promise<RuleDto> {
		return this.request<RuleDto>(replacePathParams(RULE_BY_ID_ENDPOINT, { id }), {
			method: 'GET'
		});
	}

	public updateRule(id: number, payload: UpdateRuleRequest): Promise<RuleDto> {
		return this.request<RuleDto>(replacePathParams(RULE_BY_ID_ENDPOINT, { id }), {
			method: 'PATCH',
			body: payload
		});
	}

	public deleteRule(id: number): Promise<number> {
		return this.request<number>(replacePathParams(RULE_BY_ID_ENDPOINT, { id }), {
			method: 'DELETE'
		});
	}

	public createReport(payload: CreateReportRequest): Promise<CreateReportRequest | ReportDto> {
		return this.request<CreateReportRequest | ReportDto>(REPORTS_ENDPOINT, {
			method: 'POST',
			body: payload
		});
	}

	public getReports(): Promise<ReportDto[]> {
		return this.request<ReportDto[]>(REPORTS_ENDPOINT, { method: 'GET' });
	}

	public getReport(id: string): Promise<ReportDto> {
		return this.request<ReportDto>(replacePathParams(REPORT_BY_ID_ENDPOINT, { id }), {
			method: 'GET'
		});
	}

	public updateReport(reportId: string, payload: UpdateReportRequest): Promise<ReportDto> {
		return this.request<ReportDto>(
			replacePathParams(REPORT_BY_REPORT_ID_ENDPOINT, { report_id: reportId }),
			{
				method: 'PATCH',
				body: payload
			}
		);
	}

	public deleteReport(reportId: string): Promise<number> {
		return this.request<number>(
			replacePathParams(REPORT_BY_REPORT_ID_ENDPOINT, { report_id: reportId }),
			{
				method: 'DELETE'
			}
		);
	}
}

export * from './api.dtos';

export const apiService = new ApiService();

export default apiService;
