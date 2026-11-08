import type { AiRecommendationDto, AiReportType } from '../api.dtos';
import type { HttpClient, RequestSignalOptions } from '../http/http-client';
import { replacePathParams } from '../http/url';

const AI_RECOMMENDATIONS_ENDPOINT = '/devices/{dev_eui}/ai-recommendations';

export interface AiRecommendationQuery {
	/** Default daily. */
	type?: AiReportType;
	/** How many reports, 1–31 (default 1: the newest). */
	limit?: number;
}

/** A soil sensor's AI growing-environment reports (written nightly by the CropWatch AI worker). */
export interface AiRecommendationRepository {
	/** The newest reports of one type, newest first; empty until the first report exists. */
	getAiRecommendations(
		devEui: string,
		query?: AiRecommendationQuery,
		options?: RequestSignalOptions
	): Promise<AiRecommendationDto[]>;
}

export class HttpAiRecommendationRepository implements AiRecommendationRepository {
	readonly #http: HttpClient;

	public constructor(http: HttpClient) {
		this.#http = http;
	}

	public getAiRecommendations(
		devEui: string,
		query: AiRecommendationQuery = {},
		options: RequestSignalOptions = {}
	): Promise<AiRecommendationDto[]> {
		return this.#http.request<AiRecommendationDto[]>(
			replacePathParams(AI_RECOMMENDATIONS_ENDPOINT, { dev_eui: devEui }),
			{ method: 'GET', query: { type: query.type, limit: query.limit }, signal: options.signal }
		);
	}
}
