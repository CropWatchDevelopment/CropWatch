import type {
	PulseRelayRequest,
	RelayHistoryEntryDto,
	TimeRangeQuery,
	UpdateRelayRequest
} from '../api.dtos';
import type { HttpClient, RequestSignalOptions } from '../http/http-client';
import { replacePathParams, toIsoIfDate } from '../http/url';
import type { DeviceDataOptions } from './telemetry.repository';

const RELAY_ENDPOINT = '/relay/{dev_eui}';
const RELAY_PULSE_ENDPOINT = '/relay/{dev_eui}/pulse';
const RELAY_STATUS_REQUEST_ENDPOINT = '/relay/{dev_eui}/status-request';
const RELAY_HISTORY_ENDPOINT = '/relay/{dev_eui}/history';

/** Relay devices: current state, switching commands and command history. */
export interface RelayRepository {
	getRelayData(devEui: string, options?: DeviceDataOptions): Promise<Record<string, unknown>>;
	updateRelay(devEui: string, payload: UpdateRelayRequest): Promise<Record<string, unknown> | null>;
	pulseRelay(devEui: string, payload: PulseRelayRequest): Promise<Record<string, unknown> | null>;
	/** A relay's state changes and commands for a range, newest first. */
	getRelayHistory(
		devEui: string,
		query?: Pick<TimeRangeQuery, 'start' | 'end'>,
		options?: RequestSignalOptions
	): Promise<RelayHistoryEntryDto[]>;
	/** Asks a relay device to report its current state now (its confirmation is overdue). */
	requestRelayStatus(devEui: string): Promise<Record<string, unknown> | null>;
}

export class HttpRelayRepository implements RelayRepository {
	readonly #http: HttpClient;

	public constructor(http: HttpClient) {
		this.#http = http;
	}

	public getRelayData(
		devEui: string,
		options: DeviceDataOptions = {}
	): Promise<Record<string, unknown>> {
		return this.#http.request<Record<string, unknown>>(
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
		return this.#http.request<Record<string, unknown> | null>(
			replacePathParams(RELAY_ENDPOINT, { dev_eui: devEui }),
			{ method: 'PATCH', body: payload }
		);
	}

	public pulseRelay(
		devEui: string,
		payload: PulseRelayRequest
	): Promise<Record<string, unknown> | null> {
		return this.#http.request<Record<string, unknown> | null>(
			replacePathParams(RELAY_PULSE_ENDPOINT, { dev_eui: devEui }),
			{ method: 'POST', body: payload }
		);
	}

	public getRelayHistory(
		devEui: string,
		query: Pick<TimeRangeQuery, 'start' | 'end'> = {},
		options: RequestSignalOptions = {}
	): Promise<RelayHistoryEntryDto[]> {
		return this.#http.request<RelayHistoryEntryDto[]>(
			replacePathParams(RELAY_HISTORY_ENDPOINT, { dev_eui: devEui }),
			{
				method: 'GET',
				signal: options.signal,
				query: {
					start: toIsoIfDate(query.start),
					end: toIsoIfDate(query.end)
				}
			}
		);
	}

	public requestRelayStatus(devEui: string): Promise<Record<string, unknown> | null> {
		return this.#http.request<Record<string, unknown> | null>(
			replacePathParams(RELAY_STATUS_REQUEST_ENDPOINT, { dev_eui: devEui }),
			{ method: 'POST' }
		);
	}
}
