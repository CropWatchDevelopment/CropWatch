import type { Cookies } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import {
	handleLoginAction,
	type LoginActionDependencies,
	type LoginActionEvent
} from './login-action';

const messages: LoginActionDependencies['messages'] = {
	auth_login_failed: () => 'Unable to sign in right now. Please try again.',
	auth_invalid_form_submission: () => 'Invalid form submission.',
	auth_security_try_again: () => 'Security verification failed. Please try again.',
	auth_invalid_credentials: () => 'Invalid email or password.'
};

function createCookiesMock() {
	return {
		set: vi.fn()
	} as unknown as Cookies;
}

function createRequest(
	url: string,
	formData: Record<string, string>,
	headers: HeadersInit = {}
): Request {
	return new Request(url, {
		method: 'POST',
		headers,
		body: new URLSearchParams(formData)
	});
}

function createDependencies(
	overrides: Partial<LoginActionDependencies> = {}
): LoginActionDependencies {
	return {
		publicApiBaseUrl: 'https://api.cropwatch.test',
		publicLoginEndpoint: '/auth/login',
		secureCookies: true,
		verifyRecaptchaToken: vi.fn(async () => ({ success: true })),
		messages,
		...overrides
	};
}

describe('handleLoginAction', () => {
	it('sets the jwt cookie and redirects to the sanitized target', async () => {
		const cookies = createCookiesMock();
		const fetch = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						message: 'Login successful.',
						result: {
							accessToken: 'test-jwt',
							expires_at_datetime: new Date(Date.now() + 60_000).toISOString()
						}
					}),
					{
						status: 200,
						headers: { 'content-type': 'application/json' }
					}
				)
		) as typeof globalThis.fetch;

		const event: LoginActionEvent = {
			request: createRequest('https://app.cropwatch.test/auth/login?redirect=%2Fsettings', {
				email: 'operator@cropwatch.test',
				password: 'CorrectHorseBatteryStaple1!',
				recaptchaToken: 'login-token'
			}),
			cookies,
			fetch
		};

		await expect(handleLoginAction(event, createDependencies())).rejects.toMatchObject({
			status: 303,
			location: '/settings'
		});

		expect(cookies.set).toHaveBeenCalledWith(
			'jwt',
			'test-jwt',
			expect.objectContaining({
				httpOnly: true,
				secure: true,
				path: '/'
			})
		);
	});

	it('falls back to the root path when the redirect is unsafe', async () => {
		const cookies = createCookiesMock();
		const fetch = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						message: 'Login successful.',
						result: {
							accessToken: 'test-jwt',
							expires_at_datetime: new Date(Date.now() + 60_000).toISOString()
						}
					}),
					{
						status: 200,
						headers: { 'content-type': 'application/json' }
					}
				)
		) as typeof globalThis.fetch;

		const event: LoginActionEvent = {
			request: createRequest(
				'https://app.cropwatch.test/auth/login?redirect=https%3A%2F%2Fevil.example%2Fphish',
				{
					email: 'operator@cropwatch.test',
					password: 'CorrectHorseBatteryStaple1!',
					recaptchaToken: 'login-token'
				}
			),
			cookies,
			fetch
		};

		await expect(handleLoginAction(event, createDependencies())).rejects.toMatchObject({
			status: 303,
			location: '/'
		});
	});

	it('returns invalid credentials when the upstream login endpoint rejects the user', async () => {
		const cookies = createCookiesMock();
		const fetch = vi.fn(
			async () => new Response('Unauthorized', { status: 401 })
		) as typeof globalThis.fetch;

		const event: LoginActionEvent = {
			request: createRequest('https://app.cropwatch.test/auth/login', {
				email: 'operator@cropwatch.test',
				password: 'wrong-password',
				recaptchaToken: 'login-token'
			}),
			cookies,
			fetch
		};

		await expect(handleLoginAction(event, createDependencies())).resolves.toMatchObject({
			status: 401,
			data: {
				message: 'Invalid email or password.'
			}
		});

		expect(cookies.set).not.toHaveBeenCalled();
	});

	it('returns a security failure when reCAPTCHA verification does not pass', async () => {
		const cookies = createCookiesMock();
		const fetch = vi.fn() as typeof globalThis.fetch;
		const verifyRecaptchaToken = vi.fn(async () => ({ success: false }));

		const event: LoginActionEvent = {
			request: createRequest('https://app.cropwatch.test/auth/login', {
				email: 'operator@cropwatch.test',
				password: 'CorrectHorseBatteryStaple1!',
				recaptchaToken: 'login-token'
			}),
			cookies,
			fetch
		};

		await expect(
			handleLoginAction(event, createDependencies({ verifyRecaptchaToken }))
		).resolves.toMatchObject({
			status: 400,
			data: {
				message: 'Security verification failed. Please try again.'
			}
		});

		expect(fetch).not.toHaveBeenCalled();
	});
});
