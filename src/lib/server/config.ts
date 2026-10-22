import { env as dynamicPrivateEnv } from '$env/dynamic/private';
import {
	PRIVATE_RECAPTCHA_API_KEY,
	PRIVATE_RECAPTCHA_PROJECT_ID,
	PRIVATE_RECAPTCHA_SITE_KEY
} from '$env/static/private';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

export type EnvSource = Readonly<Record<string, string | undefined>>;

export type RecaptchaLogLevel = 'silent' | 'error' | 'info' | 'debug';

export interface SupabaseConfig {
	url: string;
	anonKey: string;
}

export interface RecaptchaServerConfig {
	projectId: string;
	apiKey: string;
	siteKey: string;
	/** Without a trailing slash. */
	apiBaseUrl: string;
	logLevel: RecaptchaLogLevel;
}

export interface LibellusConfig {
	/** Trimmed; `''` when unset. */
	baseUrl: string;
	/** Trimmed; `''` when unset. */
	apiToken: string;
}

export interface ServerConfig {
	supabase: SupabaseConfig;
	recaptcha: RecaptchaServerConfig;
	libellus: LibellusConfig;
	/** Company (organization) sign-up is offered only when `ORGS_ENABLED=true`. */
	orgsEnabled: boolean;
}

/** Build-time values (`$env/static/*`); injectable so tests never depend on a real .env. */
export interface StaticServerEnv {
	PUBLIC_SUPABASE_URL: string;
	PUBLIC_SUPABASE_ANON_KEY: string;
	PRIVATE_RECAPTCHA_PROJECT_ID: string;
	PRIVATE_RECAPTCHA_API_KEY: string;
	PRIVATE_RECAPTCHA_SITE_KEY: string;
}

const STATIC_SERVER_ENV: StaticServerEnv = {
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_ANON_KEY,
	PRIVATE_RECAPTCHA_PROJECT_ID,
	PRIVATE_RECAPTCHA_API_KEY,
	PRIVATE_RECAPTCHA_SITE_KEY
};

const RECAPTCHA_LOG_LEVELS: readonly RecaptchaLogLevel[] = ['silent', 'error', 'info', 'debug'];
const DEFAULT_RECAPTCHA_API_BASE_URL = 'https://recaptchaenterprise.googleapis.com';

function trimmed(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function resolveRecaptchaLogLevel(processEnv: EnvSource): RecaptchaLogLevel {
	const requested = (processEnv.PRIVATE_RECAPTCHA_LOG_LEVEL ?? '').toLowerCase();
	const known = RECAPTCHA_LOG_LEVELS.find((level) => level === requested);
	if (known) return known;
	return processEnv.NODE_ENV === 'production' ? 'error' : 'info';
}

/**
 * Builds the server-only configuration. Like `readPublicConfig`, it reads the
 * env on every call, so values are taken at the same moment as before.
 */
export function readServerConfig(
	env: EnvSource = dynamicPrivateEnv,
	processEnv: EnvSource = process.env,
	staticEnv: StaticServerEnv = STATIC_SERVER_ENV
): ServerConfig {
	return {
		supabase: {
			url: staticEnv.PUBLIC_SUPABASE_URL,
			anonKey: staticEnv.PUBLIC_SUPABASE_ANON_KEY
		},
		recaptcha: {
			projectId: staticEnv.PRIVATE_RECAPTCHA_PROJECT_ID,
			apiKey: staticEnv.PRIVATE_RECAPTCHA_API_KEY,
			siteKey: staticEnv.PRIVATE_RECAPTCHA_SITE_KEY,
			apiBaseUrl: (env.PRIVATE_RECAPTCHA_API_BASE_URL ?? DEFAULT_RECAPTCHA_API_BASE_URL).replace(
				/\/+$/,
				''
			),
			logLevel: resolveRecaptchaLogLevel(processEnv)
		},
		libellus: {
			baseUrl: trimmed(env.PRIVATE_LIBELLUS_BASE_URL),
			apiToken: trimmed(env.PRIVATE_LIBELLUS_API_TOKEN)
		},
		orgsEnabled: env.ORGS_ENABLED === 'true'
	};
}
