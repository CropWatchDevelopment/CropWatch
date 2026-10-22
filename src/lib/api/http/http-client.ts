import type { ApiQuery } from './url';

export interface HttpRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
	/** JSON-serialized (with `created_at` fields converted back to UTC). */
	body?: unknown;
	headers?: HeadersInit;
	query?: ApiQuery;
	/** Overrides the client's token for this request; `null` sends no Authorization header. */
	authToken?: string | null;
	responseType?: 'json' | 'text';
	/** Statuses that still throw but are not logged (expected outcomes such as a 404). */
	suppressErrorStatuses?: number[];
}

/** Request options a repository method forwards from its caller. */
export type RequestSignalOptions = Pick<HttpRequestOptions, 'signal'>;

/**
 * The one way the app talks to the CropWatch API (DIP: repositories depend on
 * this abstraction, never on `fetch`). Resolves with the parsed body; rejects
 * with `ApiError` for non-2xx responses.
 */
export interface HttpClient {
	request<T>(path: string, options?: HttpRequestOptions): Promise<T>;
}
