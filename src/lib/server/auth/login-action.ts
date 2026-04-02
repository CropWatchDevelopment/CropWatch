import { fail, redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import type { RecaptchaLogContext, RecaptchaVerificationResult } from '$lib/utils/recaptcha.server';
import { readRedirectPathFromUrl } from '$lib/utils/auth-redirect';

type LoginApiResponse = {
	message?: string;
	result?: {
		accessToken?: string;
		expires_at_datetime?: string;
	};
};

type LoginMessages = {
	auth_login_failed: () => string;
	auth_invalid_form_submission: () => string;
	auth_security_try_again: () => string;
	auth_invalid_credentials: () => string;
};

type VerifyRecaptcha = (
	token: string,
	expectedAction: string,
	minScore?: number,
	context?: RecaptchaLogContext
) => Promise<RecaptchaVerificationResult>;

export type LoginActionDependencies = {
	publicApiBaseUrl: string;
	publicLoginEndpoint: string;
	secureCookies: boolean;
	verifyRecaptchaToken: VerifyRecaptcha;
	messages: LoginMessages;
};

export type LoginActionEvent = {
	request: Request;
	cookies: Cookies;
	fetch: typeof fetch;
};

function readNonEmptyString(value: FormDataEntryValue | null): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export async function handleLoginAction(
	{ request, cookies, fetch }: LoginActionEvent,
	deps: LoginActionDependencies
) {
	const { publicApiBaseUrl, publicLoginEndpoint, secureCookies, verifyRecaptchaToken, messages } =
		deps;

	if (!publicApiBaseUrl) {
		console.error('Missing PUBLIC_API_BASE_URL for login action');
		return fail(500, { message: messages.auth_login_failed() });
	}

	const data = await request.formData();
	const email = readNonEmptyString(data.get('email'));
	const password = readNonEmptyString(data.get('password'));
	const recaptchaToken = readNonEmptyString(data.get('recaptchaToken'));

	if (!email || !password || !recaptchaToken) {
		return fail(400, { message: messages.auth_invalid_form_submission() });
	}

	const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'LOGIN', 0.5, {
		route: '/auth/login',
		flow: 'login',
		userAgent: request.headers.get('user-agent') ?? undefined
	});
	if (!recaptchaResult.success) {
		return fail(400, { message: messages.auth_security_try_again() });
	}

	let response: Response;
	try {
		response = await fetch(`${publicApiBaseUrl}${publicLoginEndpoint}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password })
		});
	} catch (error) {
		console.error('Login request failed:', error);
		return fail(502, { message: messages.auth_login_failed() });
	}

	if (!response.ok && (response.status === 401 || response.status === 403)) {
		return fail(401, { message: messages.auth_invalid_credentials() });
	}
	if (!response.ok) {
		return fail(502, { message: messages.auth_login_failed() });
	}

	let result: LoginApiResponse;
	try {
		result = (await response.json()) as LoginApiResponse;
	} catch (error) {
		console.error('Login response parse failed:', error);
		return fail(502, { message: messages.auth_login_failed() });
	}

	const accessToken = result.result?.accessToken;
	const expiresAtRaw = result.result?.expires_at_datetime;
	const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

	if (
		result.message !== 'Login successful.' ||
		!accessToken ||
		!expiresAt ||
		Number.isNaN(expiresAt.getTime())
	) {
		return fail(401, { message: messages.auth_invalid_credentials() });
	}

	const maxAge = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
	if (!Number.isFinite(maxAge) || maxAge <= 0) {
		return fail(502, { message: messages.auth_login_failed() });
	}

	cookies.set('jwt', accessToken, {
		path: '/',
		httpOnly: true,
		secure: secureCookies,
		sameSite: 'lax',
		maxAge
	});

	const redirectPath = readRedirectPathFromUrl(new URL(request.url), '/');
	throw redirect(303, redirectPath);
}
