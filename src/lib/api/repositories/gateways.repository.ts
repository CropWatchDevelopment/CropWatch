import type { DeviceGatewayDto, GatewayDevicesResponseDto, GatewayDto } from '../api.dtos';
import type { HttpClient, RequestSignalOptions } from '../http/http-client';
import { replacePathParams } from '../http/url';

const GATEWAYS_ENDPOINT = '/gateway';
const GATEWAY_BY_ID_ENDPOINT = '/gateway/{gateway_id}';
const GATEWAY_DEVICES_ENDPOINT = '/gateway/{gateway_id}/devices';
const GATEWAYS_BY_DEVICE_ENDPOINT = '/gateway/by-device/{dev_eui}';

/** LoRaWAN gateways, the devices each one hears, and the gateways that hear a device. */
export interface GatewayRepository {
	getGateways(options?: RequestSignalOptions): Promise<GatewayDto[]>;
	getGateway(gatewayId: string, options?: RequestSignalOptions): Promise<GatewayDto>;
	getGatewayDevices(
		gatewayId: string,
		options?: RequestSignalOptions
	): Promise<GatewayDevicesResponseDto>;
	getDeviceGateways(devEui: string, options?: RequestSignalOptions): Promise<DeviceGatewayDto[]>;
}

export class HttpGatewayRepository implements GatewayRepository {
	readonly #http: HttpClient;

	public constructor(http: HttpClient) {
		this.#http = http;
	}

	public getGateways(options: RequestSignalOptions = {}): Promise<GatewayDto[]> {
		return this.#http.request<GatewayDto[]>(GATEWAYS_ENDPOINT, {
			method: 'GET',
			signal: options.signal
		});
	}

	public getGateway(gatewayId: string, options: RequestSignalOptions = {}): Promise<GatewayDto> {
		return this.#http.request<GatewayDto>(
			replacePathParams(GATEWAY_BY_ID_ENDPOINT, { gateway_id: gatewayId }),
			{ method: 'GET', signal: options.signal }
		);
	}

	public getGatewayDevices(
		gatewayId: string,
		options: RequestSignalOptions = {}
	): Promise<GatewayDevicesResponseDto> {
		return this.#http.request<GatewayDevicesResponseDto>(
			replacePathParams(GATEWAY_DEVICES_ENDPOINT, { gateway_id: gatewayId }),
			{ method: 'GET', signal: options.signal }
		);
	}

	public getDeviceGateways(
		devEui: string,
		options: RequestSignalOptions = {}
	): Promise<DeviceGatewayDto[]> {
		return this.#http.request<DeviceGatewayDto[]>(
			replacePathParams(GATEWAYS_BY_DEVICE_ENDPOINT, { dev_eui: devEui }),
			{ method: 'GET', signal: options.signal }
		);
	}
}
