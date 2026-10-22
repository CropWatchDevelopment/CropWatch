import type {
	DeleteDeviceResultDto,
	DeviceDto,
	DeviceListQuery,
	DevicePrimaryDataDto,
	DeviceSetupLookupRequest,
	DeviceSetupLookupResult,
	DeviceSetupRequest,
	DeviceSetupResult,
	DeviceStatusSummary,
	DeviceTypeDto,
	PaginatedResponse
} from '../api.dtos';
import type { HttpClient, RequestSignalOptions } from '../http/http-client';
import { normalizePaginatedListResponse } from '../http/pagination';
import { replacePathParams } from '../http/url';

const DEVICES_ENDPOINT = '/devices';
const DEVICE_GROUPS_ENDPOINT = '/devices/groups';
const DEVICE_TYPES_ENDPOINT = '/devices/device-types';
const DEVICE_BY_DEV_EUI_ENDPOINT = '/devices/{dev_eui}';
const DEVICE_PERMISSION_LEVEL_ENDPOINT = '/devices/{dev_eui}/permission-level';
const DEVICE_SETUP_ENDPOINT = '/device-setup';
const DEVICE_SETUP_LOOKUP_ENDPOINT = '/device-setup/lookup';
const DEVICE_LIST_PAGE_SIZE = 1000;

export interface UpdateDevicePermissionLevelRequest {
	targetUserEmail: string;
	permissionLevel: number;
}

/** Device records: listing, metadata, permissions, guided setup and deletion. */
export interface DeviceRepository {
	getDevices(query?: DeviceListQuery): Promise<DeviceDto[]>;
	/** Every device matching the filters, following pagination. */
	getAllDevices(query?: Omit<DeviceListQuery, 'skip' | 'take'>): Promise<DeviceDto[]>;
	getAllLocationDevices(locationId: number): Promise<PaginatedResponse<DevicePrimaryDataDto>>;
	getDeviceStatuses(): Promise<DeviceStatusSummary>;
	getDeviceGroups(): Promise<string[]>;
	getDeviceTypes(): Promise<DeviceTypeDto[]>;
	getDevice(devEui: string): Promise<DeviceDto>;
	updateDevice(
		devEui: string,
		payload: Record<string, unknown>
	): Promise<Record<string, unknown> | null>;
	/** Permanently deletes a device and all of its data (owner-only). */
	deleteDevice(devEui: string): Promise<DeleteDeviceResultDto>;
	updateDevicePermissionLevel(
		devEui: string,
		payload: UpdateDevicePermissionLevelRequest
	): Promise<Record<string, unknown> | null>;
	/** Checks a DevEUI before guided setup (ownership, model, keys, network). */
	lookupDeviceSetup(
		payload: DeviceSetupLookupRequest,
		options?: RequestSignalOptions
	): Promise<DeviceSetupLookupResult>;
	/** Guided setup: registers on the network, saves the device, uses the license. */
	setupDevice(payload: DeviceSetupRequest): Promise<DeviceSetupResult>;
}

export class HttpDeviceRepository implements DeviceRepository {
	readonly #http: HttpClient;
	readonly #deviceStatusEndpoint: string;

	public constructor(http: HttpClient, endpoints: { deviceStatus: string }) {
		this.#http = http;
		this.#deviceStatusEndpoint = endpoints.deviceStatus;
	}

	async #getDevicesPage(query: DeviceListQuery = {}): Promise<PaginatedResponse<DeviceDto>> {
		const payload = await this.#http.request<
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
		const { data } = await this.#getDevicesPage(query);
		return data ?? [];
	}

	public async getAllDevices(
		query: Omit<DeviceListQuery, 'skip' | 'take'> = {}
	): Promise<DeviceDto[]> {
		const firstPage = await this.#getDevicesPage({
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
			const nextPage = await this.#getDevicesPage({
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
		const payload = await this.#http.request<
			DevicePrimaryDataDto[] | PaginatedResponse<DevicePrimaryDataDto>
		>(`${DEVICES_ENDPOINT}/location/${locationId}`, { method: 'GET' });

		return normalizePaginatedListResponse<DevicePrimaryDataDto>(payload);
	}

	public getDeviceStatuses(): Promise<DeviceStatusSummary> {
		return this.#http.request<DeviceStatusSummary>(this.#deviceStatusEndpoint, {
			method: 'GET'
		});
	}

	public getDeviceGroups(): Promise<string[]> {
		return this.#http.request<string[]>(DEVICE_GROUPS_ENDPOINT, { method: 'GET' });
	}

	public async getDeviceTypes(): Promise<DeviceTypeDto[]> {
		const payload = await this.#http.request<
			DeviceTypeDto[] | PaginatedResponse<DeviceTypeDto> | Record<string, unknown>
		>(DEVICE_TYPES_ENDPOINT, {
			method: 'GET'
		});

		return normalizePaginatedListResponse<DeviceTypeDto>(payload).data ?? [];
	}

	public getDevice(devEui: string): Promise<DeviceDto> {
		return this.#http.request<DeviceDto>(
			replacePathParams(DEVICE_BY_DEV_EUI_ENDPOINT, { dev_eui: devEui }),
			{ method: 'GET' }
		);
	}

	public updateDevice(
		devEui: string,
		payload: Record<string, unknown>
	): Promise<Record<string, unknown> | null> {
		return this.#http.request<Record<string, unknown> | null>(
			replacePathParams(DEVICE_BY_DEV_EUI_ENDPOINT, { dev_eui: devEui }),
			{ method: 'PATCH', body: payload }
		);
	}

	public deleteDevice(devEui: string): Promise<DeleteDeviceResultDto> {
		return this.#http.request<DeleteDeviceResultDto>(
			replacePathParams(DEVICE_BY_DEV_EUI_ENDPOINT, { dev_eui: devEui }),
			{ method: 'DELETE' }
		);
	}

	public updateDevicePermissionLevel(
		devEui: string,
		payload: UpdateDevicePermissionLevelRequest
	): Promise<Record<string, unknown> | null> {
		return this.#http.request<Record<string, unknown> | null>(
			replacePathParams(DEVICE_PERMISSION_LEVEL_ENDPOINT, { dev_eui: devEui }),
			{ method: 'PATCH', body: { ...payload, dev_eui: devEui } }
		);
	}

	public lookupDeviceSetup(
		payload: DeviceSetupLookupRequest,
		options: RequestSignalOptions = {}
	): Promise<DeviceSetupLookupResult> {
		return this.#http.request<DeviceSetupLookupResult>(DEVICE_SETUP_LOOKUP_ENDPOINT, {
			method: 'POST',
			body: payload,
			signal: options.signal
		});
	}

	public setupDevice(payload: DeviceSetupRequest): Promise<DeviceSetupResult> {
		return this.#http.request<DeviceSetupResult>(DEVICE_SETUP_ENDPOINT, {
			method: 'POST',
			body: payload
		});
	}
}
