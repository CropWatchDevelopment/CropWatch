import { browser } from '$app/environment';
import { FetchHttpClient } from '$lib/api/http/fetch-http-client';
import type { PublicConfig } from '$lib/config/public';
import { createAppServices, type AppServices } from './app-services';

export interface ClientServicesOptions {
	config: PublicConfig;
	/** Read on every request, so the services follow login, logout and token refresh. */
	authToken: () => string | null | undefined;
}

/**
 * The services the root layout provides to every component (see
 * `setServices`). Requests use the global `fetch`, looked up per request —
 * in the browser that is SvelteKit's wrapper around `window.fetch` — and a
 * browser 401 is retried once (see `FetchHttpClient`).
 */
export function createClientServices({ config, authToken }: ClientServicesOptions): AppServices {
	const http = new FetchHttpClient({
		baseUrl: config.apiBaseUrl,
		fetch: (input, init) => globalThis.fetch(input, init),
		authToken,
		retryUnauthorizedOnce: browser
	});
	return createAppServices(http, config.endpoints);
}
