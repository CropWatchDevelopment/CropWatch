import type { DashboardLocationPage, DashboardPage, DashboardQuery } from '../api.dtos';
import type { HttpClient, RequestSignalOptions } from '../http/http-client';
import { replacePathParams } from '../http/url';

const DASHBOARD_DEVICES_ENDPOINT = '/dashboard/devices';
const DASHBOARD_LOCATIONS_ENDPOINT = '/dashboard/locations';
const DASHBOARD_DEVICE_LATEST_ENDPOINT = '/dashboard/devices/{dev_eui}/latest';

/** The home dashboard's device and location pages, and per-device latest readings. */
export interface DashboardRepository {
	getDashboardDevices(
		query?: DashboardQuery,
		options?: RequestSignalOptions
	): Promise<DashboardPage>;
	getDashboardLocations(
		query?: DashboardQuery,
		options?: RequestSignalOptions
	): Promise<DashboardLocationPage>;
	getDashboardDeviceLatest(
		devEui: string,
		options?: RequestSignalOptions
	): Promise<Record<string, unknown> | null>;
}

function dashboardQuery(query: DashboardQuery) {
	return {
		skip: query.skip,
		take: query.take,
		group: query.group,
		name: query.name,
		location: query.location,
		locationGroup: query.locationGroup
	};
}

export class HttpDashboardRepository implements DashboardRepository {
	readonly #http: HttpClient;

	public constructor(http: HttpClient) {
		this.#http = http;
	}

	public getDashboardDevices(
		query: DashboardQuery = {},
		options: RequestSignalOptions = {}
	): Promise<DashboardPage> {
		return this.#http.request<DashboardPage>(DASHBOARD_DEVICES_ENDPOINT, {
			method: 'GET',
			signal: options.signal,
			query: dashboardQuery(query)
		});
	}

	public getDashboardLocations(
		query: DashboardQuery = {},
		options: RequestSignalOptions = {}
	): Promise<DashboardLocationPage> {
		return this.#http.request<DashboardLocationPage>(DASHBOARD_LOCATIONS_ENDPOINT, {
			method: 'GET',
			signal: options.signal,
			query: dashboardQuery(query)
		});
	}

	public getDashboardDeviceLatest(
		devEui: string,
		options: RequestSignalOptions = {}
	): Promise<Record<string, unknown> | null> {
		return this.#http.request<Record<string, unknown> | null>(
			replacePathParams(DASHBOARD_DEVICE_LATEST_ENDPOINT, { dev_eui: devEui }),
			{ method: 'GET', signal: options.signal }
		);
	}
}
