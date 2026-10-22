/**
 * Deployment environments the app can run in.
 *
 * Each environment is a separate set of env values (API, Supabase project,
 * Firebase project, keys…). Select one explicitly with `PUBLIC_APP_ENV`, or let
 * the Vite mode decide (`vite dev` → development, `vite build` → production,
 * `vite build --mode staging` → staging). See README › Environments.
 */
export const APP_ENVIRONMENTS = ['development', 'staging', 'production'] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export function isAppEnvironment(value: unknown): value is AppEnvironment {
	return typeof value === 'string' && (APP_ENVIRONMENTS as readonly string[]).includes(value);
}

/**
 * `explicit` (PUBLIC_APP_ENV) wins when it names a known environment; otherwise
 * the Vite `mode` maps onto one, and any other mode (e.g. vitest's `test`) is
 * treated as development.
 */
export function resolveAppEnvironment(explicit: string | undefined, mode: string): AppEnvironment {
	const requested = (explicit ?? '').trim().toLowerCase();
	if (isAppEnvironment(requested)) return requested;
	return isAppEnvironment(mode) ? mode : 'development';
}
