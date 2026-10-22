import type { OverviewDto, OverviewRange } from '../api.dtos';
import type { HttpClient, RequestSignalOptions } from '../http/http-client';

const OVERVIEW_ENDPOINT = '/overview';

/** The fleet overview page's aggregated figures for a time range. */
export interface OverviewRepository {
	getOverview(range?: OverviewRange, options?: RequestSignalOptions): Promise<OverviewDto>;
}

export class HttpOverviewRepository implements OverviewRepository {
	readonly #http: HttpClient;

	public constructor(http: HttpClient) {
		this.#http = http;
	}

	public getOverview(
		range: OverviewRange = '24h',
		options: RequestSignalOptions = {}
	): Promise<OverviewDto> {
		return this.#http.request<OverviewDto>(OVERVIEW_ENDPOINT, {
			method: 'GET',
			query: { range },
			signal: options.signal
		});
	}
}
