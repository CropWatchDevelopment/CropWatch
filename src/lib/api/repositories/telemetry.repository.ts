import type {
	DeviceDataWithinRangeQuery,
	ListOrPaginatedResponse,
	PaginationQuery,
	TimeRangeQuery,
	TrafficDataPoint,
	TrafficMonthlyQuery,
	TrafficMonthlyReportDto
} from '../api.dtos';
import type { HttpClient, RequestSignalOptions } from '../http/http-client';
import { replacePathParams, toIsoIfDate } from '../http/url';

const DEVICE_DATA_ENDPOINT = '/devices/{dev_eui}/data';
const DEVICE_DATA_WITHIN_RANGE_ENDPOINT = '/devices/{dev_eui}/data-within-range';
const DEVICE_LATEST_DATA_ENDPOINT = '/devices/{dev_eui}/latest-data';
const TRAFFIC_ENDPOINT = '/traffic/{dev_eui}';
const TRAFFIC_MONTHLY_ENDPOINT = '/traffic/{dev_eui}/monthly';

export interface DeviceDataOptions extends RequestSignalOptions {
	/** A 404 (no data yet) still rejects, but is not logged as a failure. */
	suppressNotFoundError?: boolean;
}

/** Sensor readings: a device's latest reading, its history, and traffic counts. */
export interface TelemetryRepository {
	getDeviceLatestData(
		devEui: string,
		options?: DeviceDataOptions
	): Promise<Record<string, unknown>>;
	getDeviceData(
		devEui: string,
		query?: PaginationQuery,
		options?: DeviceDataOptions
	): Promise<ListOrPaginatedResponse<Record<string, unknown>>>;
	getDeviceDataWithinRange(
		devEui: string,
		query?: DeviceDataWithinRangeQuery,
		options?: DeviceDataOptions
	): Promise<ListOrPaginatedResponse<Record<string, unknown>>>;
	getTrafficData(devEui: string, query?: TimeRangeQuery): Promise<TrafficDataPoint[]>;
	getTrafficMonthlyReport(
		devEui: string,
		query: TrafficMonthlyQuery
	): Promise<TrafficMonthlyReportDto[]>;
}

export class HttpTelemetryRepository implements TelemetryRepository {
	readonly #http: HttpClient;

	public constructor(http: HttpClient) {
		this.#http = http;
	}

	public getDeviceLatestData(
		devEui: string,
		options: DeviceDataOptions = {}
	): Promise<Record<string, unknown>> {
		return this.#http.request<Record<string, unknown>>(
			replacePathParams(DEVICE_LATEST_DATA_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET',
				signal: options.signal,
				suppressErrorStatuses: options.suppressNotFoundError ? [404] : undefined
			}
		);
	}

	public getDeviceData(
		devEui: string,
		query: PaginationQuery = {},
		options: DeviceDataOptions = {}
	): Promise<ListOrPaginatedResponse<Record<string, unknown>>> {
		return this.#http.request<ListOrPaginatedResponse<Record<string, unknown>>>(
			replacePathParams(DEVICE_DATA_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET',
				signal: options.signal,
				suppressErrorStatuses: options.suppressNotFoundError ? [404] : undefined,
				query: {
					skip: query.skip,
					take: query.take
				}
			}
		);
	}

	public getDeviceDataWithinRange(
		devEui: string,
		query: DeviceDataWithinRangeQuery = {},
		options: DeviceDataOptions = {}
	): Promise<ListOrPaginatedResponse<Record<string, unknown>>> {
		return this.#http.request<ListOrPaginatedResponse<Record<string, unknown>>>(
			replacePathParams(DEVICE_DATA_WITHIN_RANGE_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET',
				signal: options.signal,
				suppressErrorStatuses: options.suppressNotFoundError ? [404] : undefined,
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

	public getTrafficData(devEui: string, query: TimeRangeQuery = {}): Promise<TrafficDataPoint[]> {
		return this.#http.request<TrafficDataPoint[]>(
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
		return this.#http.request<TrafficMonthlyReportDto[]>(
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
}
