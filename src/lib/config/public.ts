import { dev } from '$app/environment';
import { env as dynamicPublicEnv } from '$env/dynamic/public';
import { resolveAppEnvironment, type AppEnvironment } from './environment';

export type PublicEnvSource = Readonly<Record<string, string | undefined>>;

/**
 * API paths that a deployment may override through env. Every other path is a
 * constant next to the repository that calls it (see `$lib/api/repositories`).
 */
export interface ApiEndpointConfig {
	login: string;
	deviceStatus: string;
	ruleTemplates: string;
	reportTemplates: string;
	airNotes: string;
	/** Contains `{dev_eui}`, `{month}` and `{year}` placeholders. */
	airNotesForMonth: string;
}

export interface PublicConfig {
	environment: AppEnvironment;
	/** Untrimmed, exactly as configured (`''` when unset). */
	apiBaseUrl: string;
	endpoints: ApiEndpointConfig;
	/** `''` disables analytics; always `''` on the Vite dev server. */
	gaMeasurementId: string;
	/** Trimmed; `null` when unset or blank. */
	recaptchaSiteKey: string | null;
}

/**
 * Builds the public (browser-safe) configuration from `$env/dynamic/public`.
 *
 * It reads the env each time it is called — callers read config at the same
 * moment they used to read env directly, so nothing is captured at import time.
 */
export function readPublicConfig(
	env: PublicEnvSource = dynamicPublicEnv,
	mode: string = import.meta.env.MODE,
	isDevServer: boolean = dev
): PublicConfig {
	const recaptchaSiteKey = (env.PUBLIC_RECAPTCHA_SITE_KEY ?? '').trim();

	return {
		environment: resolveAppEnvironment(env.PUBLIC_APP_ENV, mode),
		apiBaseUrl: env.PUBLIC_API_BASE_URL ?? '',
		endpoints: {
			login: env.PUBLIC_LOGIN_ENDPOINT ?? '/auth/login',
			deviceStatus: env.PUBLIC_DEVICE_STATUS_ENDPOINT ?? '/devices/status',
			ruleTemplates: env.PUBLIC_RULE_TEMPLATES_ENDPOINT ?? '/rules',
			reportTemplates: env.PUBLIC_REPORT_TEMPLATES_ENDPOINT ?? '/reports',
			airNotes: env.PUBLIC_AIR_NOTES_ENDPOINT ?? '/air/notes',
			airNotesForMonth:
				env.PUBLIC_GET_AIR_NOTES_ENDPOINT ?? '/air/notes/{dev_eui}/month/{month}/year/{year}'
		},
		gaMeasurementId: isDevServer ? '' : (env.PUBLIC_GA_MEASUREMENT_ID ?? ''),
		recaptchaSiteKey: recaptchaSiteKey.length > 0 ? recaptchaSiteKey : null
	};
}
