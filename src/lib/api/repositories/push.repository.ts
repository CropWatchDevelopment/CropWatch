import type {
	PushDeviceDto,
	PushRecipientCandidateDto,
	RefreshPushTokenRequest,
	RegisterPushTokenRequest
} from '../api.dtos';
import type { HttpClient, RequestSignalOptions } from '../http/http-client';

const PUSH_TOKENS_ENDPOINT = '/push/tokens';
const PUSH_TOKENS_REFRESH_ENDPOINT = '/push/tokens/refresh';
const PUSH_RECIPIENTS_ENDPOINT = '/push/recipients';

/** Web-push (FCM) device enrollment, and push recipients for alerts. */
export interface PushRepository {
	registerPushToken(payload: RegisterPushTokenRequest): Promise<{ registered: boolean }>;
	refreshPushToken(payload: RefreshPushTokenRequest): Promise<{ subscribed: boolean }>;
	getPushDevices(): Promise<PushDeviceDto[]>;
	removePushDevice(id: string): Promise<void>;
	getPushRecipientCandidates(
		devEuis: string[],
		options?: RequestSignalOptions
	): Promise<PushRecipientCandidateDto[]>;
}

export class HttpPushRepository implements PushRepository {
	readonly #http: HttpClient;

	public constructor(http: HttpClient) {
		this.#http = http;
	}

	public registerPushToken(payload: RegisterPushTokenRequest): Promise<{ registered: boolean }> {
		return this.#http.request<{ registered: boolean }>(PUSH_TOKENS_ENDPOINT, {
			method: 'POST',
			body: payload
		});
	}

	public refreshPushToken(payload: RefreshPushTokenRequest): Promise<{ subscribed: boolean }> {
		return this.#http.request<{ subscribed: boolean }>(PUSH_TOKENS_REFRESH_ENDPOINT, {
			method: 'POST',
			body: payload
		});
	}

	public getPushDevices(): Promise<PushDeviceDto[]> {
		return this.#http.request<PushDeviceDto[]>(PUSH_TOKENS_ENDPOINT, { method: 'GET' });
	}

	public removePushDevice(id: string): Promise<void> {
		return this.#http.request<void>(`${PUSH_TOKENS_ENDPOINT}/${encodeURIComponent(id)}`, {
			method: 'DELETE'
		});
	}

	public getPushRecipientCandidates(
		devEuis: string[],
		options: RequestSignalOptions = {}
	): Promise<PushRecipientCandidateDto[]> {
		// The query builder has no array support — join explicitly.
		return this.#http.request<PushRecipientCandidateDto[]>(PUSH_RECIPIENTS_ENDPOINT, {
			method: 'GET',
			query: { devEuis: devEuis.join(',') },
			signal: options.signal
		});
	}
}
