import { FetchHttpClient, type FetchFn } from '$lib/api/http/fetch-http-client';
import { readPublicConfig, type PublicConfig } from '$lib/config/public';
import { createAppServices, type AppServices } from '$lib/services/app-services';
import { readServerConfig, type ServerConfig } from './config';
import { createLibellusGateway, type LibellusGateway } from './libellus';
import { createRecaptchaVerifier, type RecaptchaVerifier } from './recaptcha';
import { createSupabaseAuthGateway, type SupabaseAuthGateway } from './supabase';

/**
 * What every server load, action and endpoint receives as `locals.services`:
 * the API repositories plus the server-only gateways.
 */
export interface ServerServices extends AppServices {
	recaptcha: RecaptchaVerifier;
	supabaseAuth: SupabaseAuthGateway;
	libellus: LibellusGateway;
}

export interface ServerServicesOptions {
	/** The request's `event.fetch`. */
	fetch: FetchFn;
	/** Read on every request (the session token from `locals`). */
	authToken: () => string | null | undefined;
	config?: PublicConfig;
	serverConfig?: ServerConfig;
}

/** The request-scoped composition root, called once per request by `hooks.server.ts`. */
export function createServerServices({
	fetch,
	authToken,
	config = readPublicConfig(),
	serverConfig = readServerConfig()
}: ServerServicesOptions): ServerServices {
	const http = new FetchHttpClient({ baseUrl: config.apiBaseUrl, fetch, authToken });

	return {
		...createAppServices(http, config.endpoints),
		recaptcha: createRecaptchaVerifier(serverConfig.recaptcha),
		supabaseAuth: createSupabaseAuthGateway(serverConfig.supabase, fetch),
		libellus: createLibellusGateway(serverConfig.libellus, fetch)
	};
}
