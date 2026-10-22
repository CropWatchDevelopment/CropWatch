import { m } from '$lib/paraglide/messages.js';
import { handleLoginAction } from '$lib/server/auth/login-action';
import type { Actions } from './$types';

export const actions: Actions = {
	default: (event) => {
		const { config, services } = event.locals;
		return handleLoginAction(event, {
			publicApiBaseUrl: config.public.apiBaseUrl.trim(),
			publicLoginEndpoint: config.public.endpoints.login,
			secureCookies: event.url.protocol === 'https:',
			verifyRecaptchaToken: (...args) => services.recaptcha.verify(...args),
			messages: m
		});
	}
};
