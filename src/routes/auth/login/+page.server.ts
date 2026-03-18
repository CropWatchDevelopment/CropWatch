import { dev } from '$app/environment';
import { env as publicEnv } from '$env/dynamic/public';
import { verifyRecaptchaToken } from '$lib/utils/recaptcha.server';
import { fail, redirect, type Actions } from '@sveltejs/kit';

type LoginApiResponse = {
	message?: string;
	result?: {
		accessToken?: string;
		expires_at_datetime?: string;
	};
};

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';
const SECURITY_CHECK_MESSAGE = 'Security verification failed. Please try again.';
const LOGIN_FAILED_MESSAGE = 'Unable to sign in right now. Please try again.';
const PUBLIC_API_BASE_URL = (publicEnv.PUBLIC_API_BASE_URL ?? '').trim();
const PUBLIC_LOGIN_ENDPOINT = publicEnv.PUBLIC_LOGIN_ENDPOINT ?? '/auth/login';

function readNonEmptyString(value: FormDataEntryValue | null): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export const actions: Actions = {
	default: async ({ request, cookies, fetch }) => {
		if (!PUBLIC_API_BASE_URL) {
			console.error('Missing PUBLIC_API_BASE_URL for login action');
			return fail(500, { message: LOGIN_FAILED_MESSAGE });
		}

		const data = await request.formData();
		const email = readNonEmptyString(data.get('email'));
		const password = readNonEmptyString(data.get('password'));
		const recaptchaToken = readNonEmptyString(data.get('recaptchaToken'));

		if (!email || !password || !recaptchaToken) {
			return fail(400, { message: 'Invalid form submission.' });
		}

		const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'LOGIN');
		if (!recaptchaResult.success) {
			return fail(400, { message: SECURITY_CHECK_MESSAGE });
		}

		let response: Response;
		try {
			response = await fetch(`${PUBLIC_API_BASE_URL}${PUBLIC_LOGIN_ENDPOINT}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
		} catch (error) {
			console.error('Login request failed:', error);
			return fail(502, { message: LOGIN_FAILED_MESSAGE });
		}

		if (!response.ok && (response.status === 401 || response.status === 403)) {
			return fail(401, { message: INVALID_CREDENTIALS_MESSAGE });
		}
		if (!response.ok) {
			return fail(502, { message: LOGIN_FAILED_MESSAGE });
		}

		let result: LoginApiResponse;
		try {
			result = (await response.json()) as LoginApiResponse;
		} catch (error) {
			console.error('Login response parse failed:', error);
			return fail(502, { message: LOGIN_FAILED_MESSAGE });
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
			return fail(401, { message: INVALID_CREDENTIALS_MESSAGE });
		}

		const maxAge = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
		if (!Number.isFinite(maxAge) || maxAge <= 0) {
			return fail(502, { message: LOGIN_FAILED_MESSAGE });
		}

		cookies.set('jwt', accessToken, {
			path: '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax',
			maxAge
		});

		const redirectPath = readNonEmptyString(new URL(request.url).searchParams.get('redirect')) || '/';
		return redirectPath;
	}
};
