import { ApiError } from '../api-error';
import { mapCreatedAtFields, toTimeZoneOffsetTimestamp, toUtcTimestamp } from './created-at';
import type { HttpClient, HttpRequestOptions } from './http-client';
import { buildUrl } from './url';

export type FetchFn = typeof fetch;

/** A fixed token, or a getter read on every request (so a long-lived client follows the session). */
export type AuthTokenSource = string | null | undefined | (() => string | null | undefined);

export interface FetchHttpClientOptions {
	baseUrl: string;
	/** Called as a plain function (never as a method), so the native `fetch` is safe to pass. */
	fetch: FetchFn;
	authToken?: AuthTokenSource;
	/** Hours added to response `created_at` values (default 0, i.e. `+00:00`). */
	timeZoneOffset?: number;
	/**
	 * Retry a 401 once after {@link UNAUTHORIZED_RETRY_DELAY_MS}. Browser clients
	 * enable it: a freshly issued session can be briefly rejected by the gateway
	 * right after login (clock skew / session propagation). It deliberately does
	 * NOT redirect — `hooks.server.ts` is the authoritative session guard and
	 * redirects on the next navigation if the session is genuinely expired.
	 */
	retryUnauthorizedOnce?: boolean;
	/** Injectable for tests; defaults to `setTimeout`. */
	wait?: (ms: number) => Promise<void>;
}

export const UNAUTHORIZED_RETRY_DELAY_MS = 600;

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function parseResponsePayload(response: Response): Promise<unknown> {
	const rawPayload = await response.text();
	if (!rawPayload) return null;

	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		try {
			return JSON.parse(rawPayload) as unknown;
		} catch {
			return rawPayload;
		}
	}

	return rawPayload;
}

export class FetchHttpClient implements HttpClient {
	readonly #baseUrl: string;
	readonly #fetch: FetchFn;
	readonly #authToken: AuthTokenSource;
	readonly #timeZoneOffset: number;
	readonly #maxAttempts: number;
	readonly #wait: (ms: number) => Promise<void>;

	public constructor(options: FetchHttpClientOptions) {
		this.#baseUrl = options.baseUrl;
		this.#fetch = options.fetch;
		this.#authToken = options.authToken;
		this.#timeZoneOffset =
			typeof options.timeZoneOffset === 'number' && Number.isFinite(options.timeZoneOffset)
				? options.timeZoneOffset
				: 0;
		this.#maxAttempts = options.retryUnauthorizedOnce ? 2 : 1;
		this.#wait = options.wait ?? defaultWait;
	}

	#currentAuthToken(): string | null {
		const source = this.#authToken;
		return (typeof source === 'function' ? source() : source) ?? null;
	}

	public async request<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
		const {
			body,
			headers,
			query,
			authToken,
			responseType = 'json',
			suppressErrorStatuses,
			...requestInit
		} = options;
		const url = buildUrl(this.#baseUrl, path, query);

		const resolvedHeaders = new Headers(headers);
		const resolvedToken = authToken === undefined ? this.#currentAuthToken() : authToken;

		if (!resolvedHeaders.has('Accept')) {
			resolvedHeaders.set(
				'Accept',
				responseType === 'json' ? 'application/json' : 'text/plain, text/html, */*'
			);
		}

		let serializedBody: string | undefined;
		if (body !== undefined) {
			if (!resolvedHeaders.has('Content-Type')) {
				resolvedHeaders.set('Content-Type', 'application/json');
			}
			serializedBody = JSON.stringify(
				mapCreatedAtFields(body, (createdAt) => toUtcTimestamp(createdAt))
			);
		}

		if (resolvedToken) {
			resolvedHeaders.set('Authorization', `Bearer ${resolvedToken}`);
		}

		// Local binding: `this.#fetch(...)` would call fetch with `this` set to the
		// client, which the browser's native fetch rejects ("Illegal invocation").
		const fetchFn = this.#fetch;
		let response!: Response;
		let payload: unknown;

		for (let attempt = 1; attempt <= this.#maxAttempts; attempt += 1) {
			response = await fetchFn(url, {
				...requestInit,
				headers: resolvedHeaders,
				body: serializedBody
			});

			payload = await parseResponsePayload(response);

			if (response.ok || response.status !== 401 || attempt >= this.#maxAttempts) {
				break;
			}

			await this.#wait(UNAUTHORIZED_RETRY_DELAY_MS);
		}

		if (!response.ok) {
			if (!(suppressErrorStatuses ?? []).includes(response.status)) {
				console.error('API request failed', {
					url,
					method: requestInit.method ?? 'GET',
					status: response.status,
					statusText: response.statusText,
					payload
				});
			}

			throw new ApiError(response.status, response.statusText, { url, payload });
		}

		if (responseType === 'text') {
			return (typeof payload === 'string' ? payload : JSON.stringify(payload ?? '')) as T;
		}

		return mapCreatedAtFields(payload, (createdAt) =>
			toTimeZoneOffsetTimestamp(createdAt, this.#timeZoneOffset)
		) as T;
	}
}
