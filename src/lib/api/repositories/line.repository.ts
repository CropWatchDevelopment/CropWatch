import type {
	LineLinkCodeResponse,
	LineLinkStartResponse,
	LineRecipientCandidateDto
} from '../api.dtos';
import type { HttpClient, RequestSignalOptions } from '../http/http-client';

const LINE_LINK_START_ENDPOINT = '/line/link-start';
const LINE_LINK_CODE_ENDPOINT = '/line/link-code';
const LINE_LINK_ENDPOINT = '/line/link';
const LINE_RECIPIENTS_ENDPOINT = '/line/recipients';

/** Linking the account to LINE, and LINE recipients for alerts and reports. */
export interface LineRepository {
	startLineLink(): Promise<LineLinkStartResponse>;
	createLineLinkCode(): Promise<LineLinkCodeResponse>;
	unlinkLine(): Promise<void>;
	getLineRecipientCandidates(
		devEuis: string[],
		options?: RequestSignalOptions
	): Promise<LineRecipientCandidateDto[]>;
}

export class HttpLineRepository implements LineRepository {
	readonly #http: HttpClient;

	public constructor(http: HttpClient) {
		this.#http = http;
	}

	public startLineLink(): Promise<LineLinkStartResponse> {
		return this.#http.request<LineLinkStartResponse>(LINE_LINK_START_ENDPOINT, { method: 'POST' });
	}

	public createLineLinkCode(): Promise<LineLinkCodeResponse> {
		return this.#http.request<LineLinkCodeResponse>(LINE_LINK_CODE_ENDPOINT, { method: 'POST' });
	}

	public unlinkLine(): Promise<void> {
		return this.#http.request<void>(LINE_LINK_ENDPOINT, { method: 'DELETE' });
	}

	public getLineRecipientCandidates(
		devEuis: string[],
		options: RequestSignalOptions = {}
	): Promise<LineRecipientCandidateDto[]> {
		// The query builder has no array support — join explicitly.
		return this.#http.request<LineRecipientCandidateDto[]>(LINE_RECIPIENTS_ENDPOINT, {
			method: 'GET',
			query: { devEuis: devEuis.join(',') },
			signal: options.signal
		});
	}
}
