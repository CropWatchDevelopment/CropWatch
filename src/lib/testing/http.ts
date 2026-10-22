import { vi } from 'vitest';
import type { FetchFn } from '$lib/api/http/fetch-http-client';
import type { PublicConfig } from '$lib/config/public';

/**
 * A base URL on the reserved `.test` TLD (RFC 2606): it can never resolve, so a
 * request that escaped a fake could not reach a real CropWatch API.
 */
export const TEST_API_BASE_URL = 'https://api.cropwatch.test';

/** Public config for tests: default endpoints, no analytics, no reCAPTCHA. */
export function testPublicConfig(overrides: Partial<PublicConfig> = {}): PublicConfig {
	return {
		environment: 'development',
		apiBaseUrl: TEST_API_BASE_URL,
		endpoints: {
			login: '/auth/login',
			deviceStatus: '/devices/status',
			ruleTemplates: '/rules',
			reportTemplates: '/reports',
			airNotes: '/air/notes',
			airNotesForMonth: '/air/notes/{dev_eui}/month/{month}/year/{year}'
		},
		gaMeasurementId: '',
		recaptchaSiteKey: null,
		...overrides
	};
}

export function jsonResponse(
	payload: unknown,
	init: { status?: number; statusText?: string; headers?: Record<string, string> } = {}
): Response {
	return new Response(payload === undefined ? null : JSON.stringify(payload), {
		status: init.status ?? 200,
		statusText: init.statusText,
		headers: { 'content-type': 'application/json', ...init.headers }
	});
}

export function textResponse(body: string, init: { status?: number; contentType?: string } = {}) {
	return new Response(body, {
		status: init.status ?? 200,
		headers: { 'content-type': init.contentType ?? 'text/plain' }
	});
}

export interface RecordedRequest {
	url: string;
	/** The URL's path relative to {@link TEST_API_BASE_URL}, with its query. */
	path: string;
	method: string;
	headers: Headers;
	/** The parsed JSON body, or the raw string, or `undefined` for none. */
	body: unknown;
	signal: AbortSignal | null | undefined;
}

export type FakeResponder = (request: RecordedRequest) => Response | Promise<Response>;

/**
 * A scripted stand-in for `fetch`: records every request and answers through
 * `responder` (default: `200 null`). Hand it to `FetchHttpClient`, or to
 * `createServerServices`, to test real request shapes without a network.
 */
export function createFakeFetch(responder: FakeResponder = () => jsonResponse(null)) {
	const requests: RecordedRequest[] = [];

	const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = input instanceof Request ? input.url : String(input);
		const rawBody = init?.body;
		let body: unknown = undefined;
		if (typeof rawBody === 'string') {
			try {
				body = JSON.parse(rawBody);
			} catch {
				body = rawBody;
			}
		}
		const request: RecordedRequest = {
			url,
			path: url.startsWith(TEST_API_BASE_URL) ? url.slice(TEST_API_BASE_URL.length) : url,
			method: init?.method ?? 'GET',
			headers: new Headers(init?.headers),
			body,
			signal: init?.signal
		};
		requests.push(request);
		return responder(request);
	});

	return {
		fetch: fetch as unknown as FetchFn,
		requests,
		/** The single request made; fails the test when there were none or several. */
		onlyRequest(): RecordedRequest {
			if (requests.length !== 1) {
				throw new Error(`Expected exactly one request, got ${requests.length}`);
			}
			return requests[0];
		}
	};
}
