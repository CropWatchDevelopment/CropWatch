import { env as publicEnv } from '$env/dynamic/public';
import type {
	CreateDeviceRequest,
	CreateLocationRequest,
	DashboardLocationPage,
	DashboardPage,
	DashboardQuery,
	DeviceDataWithinRangeQuery,
	DeviceListQuery,
	DeviceDto,
	DevicePrimaryDataDto,
	DeviceTypeDto,
	DeviceStatusSummary,
	LatestPrimaryDataQuery,
	ListOrPaginatedResponse,
	LocationDto,
	LocationsQuery,
	LoginRequest,
	LoginResponse,
	PaginatedResponse,
	PaginationQuery,
	ReportTemplateDto,
	ReportTemplateListQuery,
	ReportTemplateSaveRequest,
	ReportFormContextDto,
	ReportTemplateHistoryItemDto,
	CommunicationMethodDto,
	RuleActionTypeDto,
	RuleFormContextDto,
	RuleTemplateDto,
	RuleTemplateListQuery,
	RuleTemplateSaveRequest,
	RuleTriggerLogDto,
	SensorTimeSeriesPoint,
	TimeRangeQuery,
	TrafficDataPoint,
	TrafficMonthlyQuery,
	TrafficMonthlyReportDto,
	TriggeredRulesCountResponse,
	PulseRelayRequest,
	UpdateRelayRequest,
	UpdateLocationRequest,
	UpdateLocationOwnerRequest,
	WaterDataPoint,
	GatewayDto,
	BillingLicense,
	BillingProductsResponse,
	SubscriptionStateResponse
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
	timeZoneOffset?: number;
}

interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
	body?: unknown;
	headers?: HeadersInit;
	query?: ApiQuery;
	authToken?: string | null;
	responseType?: 'json' | 'text';
	suppressErrorStatuses?: number[];
}

type ApiMethodOptions = Pick<ApiRequestOptions, 'signal'>;

interface GetDeviceLatestDataOptions extends ApiMethodOptions {
	suppressNotFoundError?: boolean;
}

interface GetRelayDataOptions extends ApiMethodOptions {
	suppressNotFoundError?: boolean;
}

const CREATED_AT_KEY = 'created_at';
const MINUTES_PER_HOUR = 60;
const MILLISECONDS_PER_MINUTE = 60_000;
const TIMEZONE_SUFFIX_PATTERN = /(?:[zZ]|[+-]\d{2}(?::?\d{2})?)$/;
const API_BASE_URL = publicEnv.PUBLIC_API_BASE_URL ?? '';
const LOGIN_ENDPOINT = publicEnv.PUBLIC_LOGIN_ENDPOINT ?? '/auth/login';
const DEVICE_STATUS_ENDPOINT = publicEnv.PUBLIC_DEVICE_STATUS_ENDPOINT ?? '/devices/status';
const DEVICE_LATEST_PRIMARY_ENDPOINT =
	publicEnv.PUBLIC_DEVICE_LATEST_PRIMARY_DATA_ENDPOINT ?? '/devices/latest-primary-data';
const DEVICE_LATEST_PRIMARY_BY_DEV_EUI_ENDPOINT =
	publicEnv.PUBLIC_DEVICE_LATEST_PRIMARY_DATA_BY_DEV_EUI_ENDPOINT ??
	'/devices/{dev_eui}/latest-primary-data';

/**
 * A freshly issued session can be momentarily rejected by the API gateway
 * (clock skew, or the session not yet propagated). Retry a browser-side 401
 * once after this delay before surfacing the failure.
 */
const UNAUTHORIZED_RETRY_DELAY_MS = 600;

const AUTH_ENDPOINT = '/auth';
const AUTH_USER_PROFILE_ENDPOINT = '/auth/user-profile';
const AIR_ENDPOINT = '/air/{dev_eui}';
const DEVICES_ENDPOINT = '/devices';
const DEVICE_TYPES_ENDPOINT = '/devices/device-types';
const DEVICE_BY_DEV_EUI_ENDPOINT = '/devices/{dev_eui}';
const DEVICE_DATA_ENDPOINT = '/devices/{dev_eui}/data';
const DEVICE_DATA_WITHIN_RANGE_ENDPOINT = '/devices/{dev_eui}/data-within-range';
const DEVICE_LATEST_DATA_ENDPOINT = '/devices/{dev_eui}/latest-data';
const DASHBOARD_DEVICES_ENDPOINT = '/dashboard/devices';
const DASHBOARD_LOCATIONS_ENDPOINT = '/dashboard/locations';
const DASHBOARD_DEVICE_LATEST_ENDPOINT = '/dashboard/devices/{dev_eui}/latest';
const LOCATIONS_ENDPOINT = '/locations';
const LOCATION_BY_ID_ENDPOINT = '/locations/{id}';
const LOCATION_PERMISSION_ENDPOINT = '/locations/{id}/permission';
const LOCATION_PERMISSION_UPDATE_PERMISSION_LEVEL_ENDPOINT = '/locations/{id}/permission-level';
const POWER_ENDPOINT = '/power/{id}';
const RELAY_ENDPOINT = '/relay/{dev_eui}';
const RELAY_PULSE_ENDPOINT = '/relay/{dev_eui}/pulse';
const RULE_TEMPLATES_ENDPOINT = publicEnv.PUBLIC_RULE_TEMPLATES_ENDPOINT ?? '/rules-new';
const RULE_TEMPLATE_ACTION_TYPES_ENDPOINT = `${RULE_TEMPLATES_ENDPOINT}/action-types`;
const RULE_TEMPLATE_FORM_CONTEXT_ENDPOINT = `${RULE_TEMPLATES_ENDPOINT}/form-context`;
const TRIGGERED_RULES_BASE_ENDPOINT = `${RULE_TEMPLATES_ENDPOINT}/triggered`;
const TRIGGERED_RULES_COUNT_ENDPOINT = `${TRIGGERED_RULES_BASE_ENDPOINT}/count`;
const RULE_TEMPLATE_BY_ID_ENDPOINT = `${RULE_TEMPLATES_ENDPOINT}/{id}`;
const RULE_TEMPLATE_HISTORY_ENDPOINT = `${RULE_TEMPLATES_ENDPOINT}/{id}/history`;
const REPORT_TEMPLATES_ENDPOINT = publicEnv.PUBLIC_REPORT_TEMPLATES_ENDPOINT ?? '/reports-new';
const REPORT_TEMPLATE_COMMUNICATION_METHODS_ENDPOINT = `${REPORT_TEMPLATES_ENDPOINT}/communication-methods`;
const REPORT_TEMPLATE_FORM_CONTEXT_ENDPOINT = `${REPORT_TEMPLATES_ENDPOINT}/form-context`;
const REPORT_TEMPLATE_BY_ID_ENDPOINT = `${REPORT_TEMPLATES_ENDPOINT}/{id}`;
const REPORT_TEMPLATE_HISTORY_ENDPOINT = `${REPORT_TEMPLATES_ENDPOINT}/{id}/history`;
const REPORT_TEMPLATE_DOWNLOAD_ENDPOINT = `${REPORT_TEMPLATES_ENDPOINT}/download/{dev_eui}/{reportName}`;
const AIR_NOTES_CREATE_ENDPOINT = publicEnv.PUBLIC_AIR_NOTES_ENDPOINT ?? '/air/notes';
const GET_AIR_NOTES_ENDPOINT =
	publicEnv.PUBLIC_GET_AIR_NOTES_ENDPOINT ?? '/air/notes/{dev_eui}/month/{month}/year/{year}';
const SOIL_ENDPOINT = '/soil/{dev_eui}';
const TRAFFIC_ENDPOINT = '/traffic/{dev_eui}';
const TRAFFIC_MONTHLY_ENDPOINT = '/traffic/{dev_eui}/monthly';
const WATER_ENDPOINT = '/water/{dev_eui}';
const DEVICE_PERMISSION_LEVEL_ENDPOINT = '/devices/{dev_eui}/permission-level';
const GATEWAYS_ENDPOINT = '/gateway';
const PAYMENTS_ENDPOINT = '/payments';
const DEVICE_LIST_PAGE_SIZE = 1000;

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

function isCreatedAtKey(key: string): boolean {
	return key.toLowerCase() === CREATED_AT_KEY;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function extractListPayload<T>(payload: unknown): T[] | null {
	if (Array.isArray(payload)) {
		return payload as T[];
	}

	if (!isRecord(payload)) {
		return null;
	}

	const candidates = [
		payload.data,
		payload.result,
		payload.items,
		isRecord(payload.data) ? payload.data.data : undefined,
		isRecord(payload.data) ? payload.data.items : undefined,
		isRecord(payload.result) ? payload.result.data : undefined,
		isRecord(payload.result) ? payload.result.items : undefined
	];

	for (const candidate of candidates) {
		if (Array.isArray(candidate)) {
			return candidate as T[];
		}
	}

	return null;
}

function resolvePaginatedTotal(payload: unknown, fallback: number): number {
	if (!isRecord(payload)) {
		return fallback;
	}

	const candidates = [
		payload.total,
		payload.count,
		payload.totalItems,
		isRecord(payload.data) ? payload.data.total : undefined,
		isRecord(payload.data) ? payload.data.count : undefined,
		isRecord(payload.result) ? payload.result.total : undefined,
		isRecord(payload.result) ? payload.result.count : undefined
	];

	for (const candidate of candidates) {
		if (isFiniteNumber(candidate)) {
			return Math.max(0, candidate);
		}
	}

	return fallback;
}

function normalizePaginatedListResponse<T>(payload: unknown): PaginatedResponse<T> {
	const items = extractListPayload<T>(payload) ?? [];
	return {
		data: items,
		total: resolvePaginatedTotal(payload, items.length)
	};
}

function padDatePart(value: number, size = 2): string {
	return String(value).padStart(size, '0');
}

function normalizeTimestampInput(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return trimmed;
	if (TIMEZONE_SUFFIX_PATTERN.test(trimmed)) return trimmed;

	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		return `${trimmed}T00:00:00.000Z`;
	}

	const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
	return `${normalized}Z`;
}

function parseUtcTimestamp(value: string): Date | null {
	const parsed = new Date(normalizeTimestampInput(value));
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatOffset(offsetMinutes: number): string {
	const sign = offsetMinutes >= 0 ? '+' : '-';
	const absoluteMinutes = Math.abs(offsetMinutes);
	const hours = Math.floor(absoluteMinutes / MINUTES_PER_HOUR);
	const minutes = absoluteMinutes % MINUTES_PER_HOUR;
	return `${sign}${padDatePart(hours)}:${padDatePart(minutes)}`;
}

function formatTimestampForOffset(date: Date, offsetHours: number): string {
	const offsetMinutes = Math.round(offsetHours * MINUTES_PER_HOUR);
	const shiftedDate = new Date(date.getTime() + offsetMinutes * MILLISECONDS_PER_MINUTE);

	return [
		`${shiftedDate.getUTCFullYear()}-${padDatePart(shiftedDate.getUTCMonth() + 1)}-${padDatePart(shiftedDate.getUTCDate())}`,
		`${padDatePart(shiftedDate.getUTCHours())}:${padDatePart(shiftedDate.getUTCMinutes())}:${padDatePart(shiftedDate.getUTCSeconds())}.${padDatePart(shiftedDate.getUTCMilliseconds(), 3)}${formatOffset(offsetMinutes)}`
	].join('T');
}

function toTimeZoneOffsetTimestamp(value: string, offsetHours: number): string {
	const parsed = parseUtcTimestamp(value);
	return parsed ? formatTimestampForOffset(parsed, offsetHours) : value;
}

function toUtcTimestamp(value: string): string {
	const parsed = parseUtcTimestamp(value);
	return parsed ? parsed.toISOString() : value;
}

function mapCreatedAtFields(value: unknown, mapper: (createdAt: string) => string): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => mapCreatedAtFields(entry, mapper));
	}

	if (!isRecord(value)) {
		return value;
	}

	return Object.fromEntries(
		Object.entries(value).map(([key, entryValue]) => {
			if (isCreatedAtKey(key)) {
				if (entryValue instanceof Date) {
					return [key, mapper(entryValue.toISOString())];
				}
				return [key, typeof entryValue === 'string' ? mapper(entryValue) : entryValue];
			}

			return [key, mapCreatedAtFields(entryValue, mapper)];
		})
	);
}

export class ApiService {
	private readonly baseUrl: string;
	private readonly fetchFn: FetchLike;
	private authToken: string | null;
	private timeZoneOffset: number;

	public constructor(options: ApiServiceOptions = {}) {
		this.baseUrl = options.baseUrl ?? API_BASE_URL;
		this.fetchFn = options.fetchFn ?? fetch;
		this.authToken = options.authToken ?? null;
		const configuredTimeZoneOffset = options.timeZoneOffset;
		this.timeZoneOffset =
			typeof configuredTimeZoneOffset === 'number' && Number.isFinite(configuredTimeZoneOffset)
				? configuredTimeZoneOffset
				: 0;
	}

	public setAuthToken(token: string | null): void {
		this.authToken = token;
	}

	public setTimeZoneOffset(offset: number): void {
		if (!Number.isFinite(offset)) {
			throw new TypeError('timeZoneOffset must be a finite number');
		}

		this.timeZoneOffset = offset;
	}

	public clearAuthToken(): void {
		this.authToken = null;
	}

	private async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
		const {
			body,
			headers,
			query,
			authToken,
			responseType = 'json',
			suppressErrorStatuses,
			...requestInit
		} = options;
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
			serializedBody = JSON.stringify(
				mapCreatedAtFields(body, (createdAt) => toUtcTimestamp(createdAt))
			);
		}

		if (resolvedToken) {
			resolvedHeaders.set('Authorization', `Bearer ${resolvedToken}`);
		}

		// A browser-side 401 is retried once: a freshly issued session can be
		// briefly rejected by the gateway right after login (clock skew / session
		// propagation). We deliberately do NOT redirect here — the server hook
		// (`hooks.server.ts`) is the authoritative session guard and will redirect
		// on the next navigation if the session is genuinely expired. Self-
		// redirecting on any single 401 tore down valid sessions during that race.
		const maxAttempts = typeof window !== 'undefined' ? 2 : 1;
		let response!: Response;
		let payload: unknown;

		for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
			response = await this.fetchFn(url, {
				...requestInit,
				headers: resolvedHeaders,
				body: serializedBody
			});

			payload = await parseResponsePayload(response);

			if (response.ok || response.status !== 401 || attempt >= maxAttempts) {
				break;
			}

			await new Promise((resolve) => setTimeout(resolve, UNAUTHORIZED_RETRY_DELAY_MS));
		}

		if (!response.ok) {
			if (!(suppressErrorStatuses ?? []).includes(response.status)) {
				console.error('API request failed', {
					url,
					method: requestInit.method ?? 'GET',
					status: response.status,
					statusText: response.statusText,
					payload
				});
			}

			throw new ApiServiceError(response.status, response.statusText, { url, payload });
		}

		if (responseType === 'text') {
			return (typeof payload === 'string' ? payload : JSON.stringify(payload ?? '')) as T;
		}

		return mapCreatedAtFields(payload, (createdAt) =>
			toTimeZoneOffsetTimestamp(createdAt, this.timeZoneOffset)
		) as T;
	}

	public getApiHome(): Promise<string> {
		return this.request<string>('', { method: 'GET', responseType: 'text' });
	}

	public getAuthenticatedUser(): Promise<Record<string, unknown>> {
		return this.request<Record<string, unknown>>(AUTH_ENDPOINT, { method: 'GET' });
	}

	public getUserProfile(): Promise<Record<string, unknown>> {
		return this.request<Record<string, unknown>>(AUTH_USER_PROFILE_ENDPOINT, { method: 'GET' });
	}

	public login(payload: LoginRequest): Promise<LoginResponse> {
		return this.request<LoginResponse>(LOGIN_ENDPOINT, {
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

	public getRelayData(
		devEui: string,
		options: GetRelayDataOptions = {}
	): Promise<Record<string, unknown>> {
		return this.request<Record<string, unknown>>(
			replacePathParams(RELAY_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET',
				signal: options.signal,
				suppressErrorStatuses: options.suppressNotFoundError ? [404] : undefined
			}
		);
	}

	public updateRelay(
		devEui: string,
		payload: UpdateRelayRequest
	): Promise<Record<string, unknown> | null> {
		return this.request<Record<string, unknown> | null>(
			replacePathParams(RELAY_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'PATCH',
				body: payload
			}
		);
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

	public getTrafficMonthlyReport(
		devEui: string,
		query: TrafficMonthlyQuery
	): Promise<TrafficMonthlyReportDto[]> {
		return this.request<TrafficMonthlyReportDto[]>(
			replacePathParams(TRAFFIC_MONTHLY_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET',
				query: {
					year: query.year,
					month: query.month,
					timezone: query.timezone
				}
			}
		);
	}

	public pulseRelay(
		devEui: string,
		payload: PulseRelayRequest
	): Promise<Record<string, unknown> | null> {
		return this.request<Record<string, unknown> | null>(
			replacePathParams(RELAY_PULSE_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'POST',
				body: payload
			}
		);
	}

	public async getDevicesPage(query: DeviceListQuery = {}): Promise<PaginatedResponse<DeviceDto>> {
		const payload = await this.request<
			DeviceDto[] | PaginatedResponse<DeviceDto> | Record<string, unknown>
		>(DEVICES_ENDPOINT, {
			method: 'GET',
			query: {
				skip: query.skip,
				take: query.take,
				dev_eui: query.dev_eui,
				group: query.group,
				name: query.name,
				location: query.location
			}
		});

		return normalizePaginatedListResponse<DeviceDto>(payload);
	}

	public async getDevices(query: DeviceListQuery = {}): Promise<DeviceDto[]> {
		const { data } = await this.getDevicesPage(query);
		return data ?? [];
	}

	public async getAllDevices(
		query: Omit<DeviceListQuery, 'skip' | 'take'> = {}
	): Promise<DeviceDto[]> {
		const firstPage = await this.getDevicesPage({
			...query,
			skip: 0,
			take: DEVICE_LIST_PAGE_SIZE
		});
		const firstBatch = firstPage.data ?? [];
		const total =
			typeof firstPage.total === 'number' && Number.isFinite(firstPage.total)
				? Math.max(0, firstPage.total)
				: firstBatch.length;

		if (firstBatch.length >= total) {
			return firstBatch;
		}

		const allDevices = [...firstBatch];

		for (let skip = DEVICE_LIST_PAGE_SIZE; skip < total; skip += DEVICE_LIST_PAGE_SIZE) {
			const nextPage = await this.getDevicesPage({
				...query,
				skip,
				take: DEVICE_LIST_PAGE_SIZE
			});
			const nextBatch = nextPage.data ?? [];

			if (nextBatch.length === 0) {
				break;
			}

			allDevices.push(...nextBatch);
		}

		return allDevices;
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

		return normalizePaginatedListResponse<DevicePrimaryDataDto>(payload);
	}

	public async getAllLocations(
		query: LocationsQuery = {}
	): Promise<PaginatedResponse<LocationDto>> {
		const payload = await this.request<LocationDto[] | PaginatedResponse<LocationDto>>(
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
		return this.request<LocationDto>(replacePathParams(LOCATION_BY_ID_ENDPOINT, { id }), {
			method: 'GET'
		});
	}

	public getLocationGroups(): Promise<string[]> {
		return this.request<string[]>(`${LOCATIONS_ENDPOINT}/groups`, {
			method: 'GET'
		});
	}

	public createLocationPermission(
		location_id: number | string,
		newUserEmail: string,
		permission_level: number,
		applyToAllDevices?: boolean
	): Promise<LocationDto> {
		return this.request<LocationDto>(
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
		return this.request<LocationDto>(
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

	public async updateLocationPermissionLevel(
		location_id: number | string,
		email: string,
		permission_level: number
	): Promise<LocationDto> {
		const endpoint = replacePathParams(LOCATION_PERMISSION_UPDATE_PERMISSION_LEVEL_ENDPOINT, {
			id: location_id
		});
		return this.request<LocationDto>(endpoint, {
			method: 'PATCH',
			body: {
				location_id,
				email,
				permission_level
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
		return this.request<DeviceStatusSummary>(DEVICE_STATUS_ENDPOINT, {
			method: 'GET'
		});
	}

	public getDeviceGroups(): Promise<string[]> {
		return this.request<string[]>(`${DEVICES_ENDPOINT}/groups`, {
			method: 'GET'
		});
	}

	public async getDeviceTypes(): Promise<DeviceTypeDto[]> {
		const payload = await this.request<
			DeviceTypeDto[] | PaginatedResponse<DeviceTypeDto> | Record<string, unknown>
		>(DEVICE_TYPES_ENDPOINT, {
			method: 'GET'
		});

		return normalizePaginatedListResponse<DeviceTypeDto>(payload).data ?? [];
	}

	public getDashboardDevices(
		query: DashboardQuery = {},
		options: ApiMethodOptions = {}
	): Promise<DashboardPage> {
		return this.request<DashboardPage>(DASHBOARD_DEVICES_ENDPOINT, {
			method: 'GET',
			signal: options.signal,
			query: {
				skip: query.skip,
				take: query.take,
				group: query.group,
				name: query.name,
				location: query.location,
				locationGroup: query.locationGroup
			}
		});
	}

	public getDashboardLocations(
		query: DashboardQuery = {},
		options: ApiMethodOptions = {}
	): Promise<DashboardLocationPage> {
		return this.request<DashboardLocationPage>(DASHBOARD_LOCATIONS_ENDPOINT, {
			method: 'GET',
			signal: options.signal,
			query: {
				skip: query.skip,
				take: query.take,
				group: query.group,
				name: query.name,
				location: query.location,
				locationGroup: query.locationGroup
			}
		});
	}

	public getDashboardDeviceLatest(
		devEui: string,
		options: ApiMethodOptions = {}
	): Promise<Record<string, unknown> | null> {
		return this.request<Record<string, unknown> | null>(
			replacePathParams(DASHBOARD_DEVICE_LATEST_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET',
				signal: options.signal
			}
		);
	}

	public getLatestPrimaryDeviceData(
		query: LatestPrimaryDataQuery = {},
		options: ApiMethodOptions = {}
	): Promise<PaginatedResponse<DevicePrimaryDataDto>> {
		return this.request<DevicePrimaryDataDto[] | PaginatedResponse<DevicePrimaryDataDto>>(
			DEVICE_LATEST_PRIMARY_ENDPOINT,
			{
				method: 'GET',
				signal: options.signal,
				query: {
					skip: query.skip,
					take: query.take,
					dev_eui: query.dev_eui,
					'group-by-device-group': query.group,
					locationGroup: query.locationGroup,
					location: query.location,
					name: query.name
				}
			}
		).then((payload) => normalizePaginatedListResponse<DevicePrimaryDataDto>(payload));
	}

	public getDevice(devEui: string): Promise<DeviceDto> {
		return this.request<DeviceDto>(
			replacePathParams(DEVICE_BY_DEV_EUI_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET'
			}
		);
	}

	public createDevice(devEui: string, payload: CreateDeviceRequest): Promise<DeviceDto> {
		return this.request<DeviceDto>(
			replacePathParams(DEVICE_BY_DEV_EUI_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'POST',
				body: payload
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
					end: toIsoIfDate(query.end),
					timezone: query.timezone
				}
			}
		);
	}

	public getDeviceLatestData(
		devEui: string,
		options: GetDeviceLatestDataOptions = {}
	): Promise<Record<string, unknown>> {
		return this.request<Record<string, unknown>>(
			replacePathParams(DEVICE_LATEST_DATA_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET',
				signal: options.signal,
				suppressErrorStatuses: options.suppressNotFoundError ? [404] : undefined
			}
		);
	}

	public getDeviceLatestPrimaryData(
		devEui: string,
		options: ApiMethodOptions = {}
	): Promise<DevicePrimaryDataDto> {
		return this.request<DevicePrimaryDataDto>(
			replacePathParams(DEVICE_LATEST_PRIMARY_BY_DEV_EUI_ENDPOINT, {
				dev_eui: devEui
			}),
			{
				method: 'GET',
				signal: options.signal
			}
		);
	}

	public createAirNote(payload: {
		note: string;
		title: string;
		include_in_report: boolean;
		created_at: string;
		dev_eui: string;
	}): Promise<Record<string, unknown> | null> {
		return this.request<Record<string, unknown> | null>(AIR_NOTES_CREATE_ENDPOINT, {
			method: 'POST',
			body: payload
		});
	}

	public getAllAirNotesForMonth(payload: {
		dev_eui: string;
		date: Date;
	}): Promise<Record<string, unknown> | null> {
		const requestUrl = replacePathParams(GET_AIR_NOTES_ENDPOINT, {
			dev_eui: payload.dev_eui,
			month: String(payload.date.getMonth() + 1).padStart(2, '0'),
			year: String(payload.date.getFullYear())
		});
		return this.request<Record<string, unknown> | null>(requestUrl, {
			method: 'GET'
		});
	}

	public updateDevice(
		devEui: string,
		payload: Record<string, unknown>
	): Promise<Record<string, unknown> | null> {
		return this.request<Record<string, unknown> | null>(
			replacePathParams(DEVICE_BY_DEV_EUI_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'PATCH',
				body: payload
			}
		);
	}

	public updateDevicePermissionLevel(
		devEui: string,
		payload: {
			targetUserEmail: string;
			permissionLevel: number;
		}
	): Promise<Record<string, unknown> | null> {
		return this.request<Record<string, unknown> | null>(
			replacePathParams(DEVICE_PERMISSION_LEVEL_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'PATCH',
				body: { ...payload, dev_eui: devEui }
			}
		);
	}

	public getTriggeredRules(): Promise<RuleTemplateDto[]> {
		return this.request<RuleTemplateDto[]>(TRIGGERED_RULES_BASE_ENDPOINT, {
			method: 'GET'
		});
	}

	public getTriggeredRulesCount(): Promise<TriggeredRulesCountResponse> {
		return this.request<TriggeredRulesCountResponse>(TRIGGERED_RULES_COUNT_ENDPOINT, {
			method: 'GET'
		});
	}

	public getRuleTemplates(
		query: RuleTemplateListQuery = {},
		options: ApiMethodOptions = {}
	): Promise<RuleTemplateDto[]> {
		return this.request<RuleTemplateDto[]>(RULE_TEMPLATES_ENDPOINT, {
			method: 'GET',
			signal: options.signal,
			query: {
				search: query.search
			}
		});
	}

	public getRuleTemplate(id: number, options: ApiMethodOptions = {}): Promise<RuleTemplateDto> {
		return this.request<RuleTemplateDto>(replacePathParams(RULE_TEMPLATE_BY_ID_ENDPOINT, { id }), {
			method: 'GET',
			signal: options.signal
		});
	}

	public getRuleTemplateHistory(
		id: number,
		options: ApiMethodOptions = {}
	): Promise<RuleTriggerLogDto[]> {
		return this.request<RuleTriggerLogDto[]>(
			replacePathParams(RULE_TEMPLATE_HISTORY_ENDPOINT, { id }),
			{
				method: 'GET',
				signal: options.signal
			}
		);
	}

	public getRuleTemplateActionTypes(options: ApiMethodOptions = {}): Promise<RuleActionTypeDto[]> {
		return this.request<RuleActionTypeDto[]>(RULE_TEMPLATE_ACTION_TYPES_ENDPOINT, {
			method: 'GET',
			signal: options.signal
		});
	}

	public getRuleFormContext(
		templateId?: number,
		options: ApiMethodOptions = {}
	): Promise<RuleFormContextDto> {
		return this.request<RuleFormContextDto>(RULE_TEMPLATE_FORM_CONTEXT_ENDPOINT, {
			method: 'GET',
			signal: options.signal,
			query: typeof templateId === 'number' ? { templateId } : undefined
		});
	}

	public createRuleTemplate(
		payload: RuleTemplateSaveRequest,
		options: ApiMethodOptions = {}
	): Promise<RuleTemplateDto> {
		return this.request<RuleTemplateDto>(RULE_TEMPLATES_ENDPOINT, {
			method: 'POST',
			body: payload,
			signal: options.signal
		});
	}

	public updateRuleTemplate(
		id: number,
		payload: RuleTemplateSaveRequest,
		options: ApiMethodOptions = {}
	): Promise<RuleTemplateDto> {
		return this.request<RuleTemplateDto>(replacePathParams(RULE_TEMPLATE_BY_ID_ENDPOINT, { id }), {
			method: 'PATCH',
			body: payload,
			signal: options.signal
		});
	}

	public deleteRuleTemplate(id: number, options: ApiMethodOptions = {}): Promise<{ id: number }> {
		return this.request<{ id: number }>(replacePathParams(RULE_TEMPLATE_BY_ID_ENDPOINT, { id }), {
			method: 'DELETE',
			signal: options.signal
		});
	}

	public getReportTemplates(
		query: ReportTemplateListQuery = {},
		options: ApiMethodOptions = {}
	): Promise<ReportTemplateDto[]> {
		return this.request<ReportTemplateDto[]>(REPORT_TEMPLATES_ENDPOINT, {
			method: 'GET',
			signal: options.signal,
			query: {
				search: query.search
			}
		});
	}

	public getReportTemplate(id: number, options: ApiMethodOptions = {}): Promise<ReportTemplateDto> {
		return this.request<ReportTemplateDto>(
			replacePathParams(REPORT_TEMPLATE_BY_ID_ENDPOINT, { id }),
			{
				method: 'GET',
				signal: options.signal
			}
		);
	}

	public getReportTemplateHistory(
		id: number,
		options: ApiMethodOptions = {}
	): Promise<ReportTemplateHistoryItemDto[]> {
		return this.request<ReportTemplateHistoryItemDto[]>(
			replacePathParams(REPORT_TEMPLATE_HISTORY_ENDPOINT, { id }),
			{
				method: 'GET',
				signal: options.signal
			}
		);
	}

	public getReportTemplateCommunicationMethods(
		options: ApiMethodOptions = {}
	): Promise<CommunicationMethodDto[]> {
		return this.request<CommunicationMethodDto[]>(
			REPORT_TEMPLATE_COMMUNICATION_METHODS_ENDPOINT,
			{
				method: 'GET',
				signal: options.signal
			}
		);
	}

	public getReportFormContext(
		templateId?: number,
		options: ApiMethodOptions = {}
	): Promise<ReportFormContextDto> {
		return this.request<ReportFormContextDto>(REPORT_TEMPLATE_FORM_CONTEXT_ENDPOINT, {
			method: 'GET',
			signal: options.signal,
			query: typeof templateId === 'number' ? { templateId } : undefined
		});
	}

	public createReportTemplate(
		payload: ReportTemplateSaveRequest,
		options: ApiMethodOptions = {}
	): Promise<ReportTemplateDto> {
		return this.request<ReportTemplateDto>(REPORT_TEMPLATES_ENDPOINT, {
			method: 'POST',
			body: payload,
			signal: options.signal
		});
	}

	public updateReportTemplate(
		id: number,
		payload: ReportTemplateSaveRequest,
		options: ApiMethodOptions = {}
	): Promise<ReportTemplateDto> {
		return this.request<ReportTemplateDto>(
			replacePathParams(REPORT_TEMPLATE_BY_ID_ENDPOINT, { id }),
			{
				method: 'PATCH',
				body: payload,
				signal: options.signal
			}
		);
	}

	public deleteReportTemplate(
		id: number,
		options: ApiMethodOptions = {}
	): Promise<{ id: number }> {
		return this.request<{ id: number }>(
			replacePathParams(REPORT_TEMPLATE_BY_ID_ENDPOINT, { id }),
			{
				method: 'DELETE',
				signal: options.signal
			}
		);
	}

	public getReportTemplateDownloadUrl(
		devEui: string,
		reportName: string,
		options: ApiMethodOptions = {}
	): Promise<{ url: string }> {
		return this.request<{ url: string }>(
			replacePathParams(REPORT_TEMPLATE_DOWNLOAD_ENDPOINT, { dev_eui: devEui, reportName }),
			{
				method: 'GET',
				signal: options.signal
			}
		);
	}

	public getGateways(): Promise<GatewayDto[]> {
		return this.request<GatewayDto[]>(GATEWAYS_ENDPOINT, {
			method: 'GET'
		});
	}

	// --- Billing / Polar subscriptions -------------------------------------

	public getBillingProducts(): Promise<BillingProductsResponse> {
		return this.request<BillingProductsResponse>(`${PAYMENTS_ENDPOINT}/products`, {
			method: 'GET'
		});
	}

	public getSubscriptionState(): Promise<SubscriptionStateResponse> {
		return this.request<SubscriptionStateResponse>(
			`${PAYMENTS_ENDPOINT}/subscriptions/state`,
			{ method: 'GET' }
		);
	}

	public getLicenses(): Promise<BillingLicense[]> {
		return this.request<BillingLicense[]>(`${PAYMENTS_ENDPOINT}/licenses`, {
			method: 'GET'
		});
	}

	public createBaseCheckout(payload: { discountId?: string | null } = {}): Promise<{
		checkoutUrl: string;
	}> {
		return this.request<{ checkoutUrl: string }>(
			`${PAYMENTS_ENDPOINT}/subscriptions/base/checkout`,
			{ method: 'POST', body: payload }
		);
	}

	public createDeviceCheckout(payload: { quantity: number }): Promise<{ checkoutUrl: string }> {
		return this.request<{ checkoutUrl: string }>(
			`${PAYMENTS_ENDPOINT}/subscriptions/device/checkout`,
			{ method: 'POST', body: payload }
		);
	}

	public changeDeviceSeats(payload: { seats: number }): Promise<{ seats: number }> {
		return this.request<{ seats: number }>(
			`${PAYMENTS_ENDPOINT}/subscriptions/device/seats`,
			{ method: 'PATCH', body: payload }
		);
	}

	public assignLicense(licenseId: number, devEui: string): Promise<BillingLicense> {
		return this.request<BillingLicense>(
			`${PAYMENTS_ENDPOINT}/licenses/${encodeURIComponent(licenseId)}/assign`,
			{ method: 'POST', body: { devEui } }
		);
	}

	public moveLicense(licenseId: number, devEui: string): Promise<BillingLicense> {
		return this.request<BillingLicense>(
			`${PAYMENTS_ENDPOINT}/licenses/${encodeURIComponent(licenseId)}/move`,
			{ method: 'PATCH', body: { devEui } }
		);
	}

	public unassignLicense(licenseId: number): Promise<BillingLicense> {
		return this.request<BillingLicense>(
			`${PAYMENTS_ENDPOINT}/licenses/${encodeURIComponent(licenseId)}/unassign`,
			{ method: 'POST' }
		);
	}

	public cancelLicense(licenseId: number): Promise<{ canceled: boolean }> {
		return this.request<{ canceled: boolean }>(
			`${PAYMENTS_ENDPOINT}/licenses/${encodeURIComponent(licenseId)}/cancel`,
			{ method: 'POST' }
		);
	}

	public openBillingPortal(): Promise<{ portalUrl: string }> {
		return this.request<{ portalUrl: string }>(`${PAYMENTS_ENDPOINT}/portal`, {
			method: 'POST'
		});
	}

	public cancelBaseSubscription(payload: { atPeriodEnd?: boolean } = {}): Promise<{
		status: string;
	}> {
		return this.request<{ status: string }>(`${PAYMENTS_ENDPOINT}/subscriptions/base`, {
			method: 'DELETE',
			body: payload
		});
	}
}

export * from './api.dtos';

export const apiService = new ApiService();

export default apiService;
