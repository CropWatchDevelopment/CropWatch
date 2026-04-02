import { env as publicEnv } from '$env/dynamic/public';
import { m } from '$lib/paraglide/messages.js';
import { handleLoginAction } from '$lib/server/auth/login-action';
import { verifyRecaptchaToken } from '$lib/utils/recaptcha.server';
import type { Actions } from '@sveltejs/kit';

const PUBLIC_API_BASE_URL = (publicEnv.PUBLIC_API_BASE_URL ?? '').trim();
const PUBLIC_LOGIN_ENDPOINT = publicEnv.PUBLIC_LOGIN_ENDPOINT ?? '/auth/login';

export const actions: Actions = {
	default: (event) =>
		handleLoginAction(event, {
			publicApiBaseUrl: PUBLIC_API_BASE_URL,
			publicLoginEndpoint: PUBLIC_LOGIN_ENDPOINT,
			secureCookies: event.url.protocol === 'https:',
			verifyRecaptchaToken,
			messages: m
		})
};
