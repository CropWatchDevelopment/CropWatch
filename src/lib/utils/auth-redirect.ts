export const LOGIN_REASONS = ['auth-required', 'expired', 'signed-out', 'password-reset'] as const;

export type LoginReason = (typeof LOGIN_REASONS)[number];

const APP_ORIGIN = 'https://cropwatch.local';
const ROOT_PATH = '/';

function isLoginReason(value: string | null | undefined): value is LoginReason {
	return typeof value === 'string' && LOGIN_REASONS.includes(value as LoginReason);
}

export function sanitizeRedirectPath(
	value: string | null | undefined,
	fallback: string = ROOT_PATH
): string {
	if (typeof value !== 'string') return fallback;

	const trimmed = value.trim();
	if (!trimmed || trimmed.startsWith('//')) {
		return fallback;
	}

	try {
		const url = new URL(trimmed, APP_ORIGIN);
		if (url.origin !== APP_ORIGIN || !url.pathname.startsWith('/')) {
			return fallback;
		}

		const normalized = `${url.pathname}${url.search}${url.hash}`;
		if (normalized.startsWith('/auth/login') || normalized.startsWith('/auth/logout')) {
			return fallback;
		}

		return normalized || fallback;
	} catch {
		return fallback;
	}
}

export function readRedirectPath(
	searchParams: URLSearchParams,
	fallback: string = ROOT_PATH
): string {
	return sanitizeRedirectPath(searchParams.get('redirect'), fallback);
}

export function readRedirectPathFromUrl(url: URL, fallback: string = ROOT_PATH): string {
	return readRedirectPath(url.searchParams, fallback);
}

export function readLoginReason(searchParams: URLSearchParams): LoginReason | null {
	const rawReason = searchParams.get('reason');
	return isLoginReason(rawReason) ? rawReason : null;
}

function withSearchParams(path: string, params: URLSearchParams): string {
	const search = params.toString();
	return search ? `${path}?${search}` : path;
}

export function withRedirectParam(path: string, redirectTo: string | null | undefined): string {
	const params = new URLSearchParams();
	const sanitizedRedirect = sanitizeRedirectPath(redirectTo, '');

	if (sanitizedRedirect) {
		params.set('redirect', sanitizedRedirect);
	}

	return withSearchParams(path, params);
}

export function buildLoginPath(
	options: {
		path?: string;
		redirectTo?: string | null | undefined;
		reason?: LoginReason | null | undefined;
	} = {}
): string {
	const { path = '/auth/login', redirectTo, reason } = options;
	const params = new URLSearchParams();
	const sanitizedRedirect = sanitizeRedirectPath(redirectTo, '');

	if (sanitizedRedirect) {
		params.set('redirect', sanitizedRedirect);
	}

	if (reason && isLoginReason(reason)) {
		params.set('reason', reason);
	}

	return withSearchParams(path, params);
}

export function buildLogoutPath(
	options: {
		path?: string;
		redirectTo?: string | null | undefined;
	} = {}
): string {
	const { path = '/auth/logout', redirectTo } = options;
	return withRedirectParam(path, redirectTo);
}
