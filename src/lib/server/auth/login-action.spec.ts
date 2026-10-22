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

	it('also stores the refresh token, so the session outlives the access token', async () => {
		const cookies = createCookiesMock();
		const fetch = vi.fn(
			async () =>
				new Response(
					JSON.stringify({
						message: 'Login successful.',
						result: {
							accessToken: 'test-jwt',
							refreshToken: 'test-refresh',
							expires_at_datetime: new Date(Date.now() + 60_000).toISOString()
						}
					}),
					{ status: 200, headers: { 'content-type': 'application/json' } }
				)
		) as typeof globalThis.fetch;
		const event: LoginActionEvent = {
			request: createRequest('https://app.cropwatch.test/auth/login', {
				email: 'operator@cropwatch.test',
				password: 'CorrectHorseBatteryStaple1!',
				recaptchaToken: 'login-token'
			}),
			cookies,
			fetch
		};

		await expect(handleLoginAction(event, createDependencies())).rejects.toMatchObject({
			status: 303
		});

		expect(cookies.set).toHaveBeenCalledWith(
			'jwt_refresh',
			'test-refresh',
			expect.objectContaining({ httpOnly: true, secure: true, path: '/' })
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

describe('handleLoginAction failures', () => {
	const credentials = {
		email: 'operator@cropwatch.test',
		password: 'CorrectHorseBatteryStaple1!',
		recaptchaToken: 'login-token'
	};

	function loginEvent(fetch: typeof globalThis.fetch, fields = credentials): LoginActionEvent {
		return {
			request: createRequest('https://app.cropwatch.test/auth/login', fields),
			cookies: createCookiesMock(),
			fetch
		};
	}

	const respondWith = (body: unknown, status = 200) =>
		vi.fn(
			async () =>
				new Response(typeof body === 'string' ? body : JSON.stringify(body), {
					status,
					headers: { 'content-type': 'application/json' }
				})
		) as typeof globalThis.fetch;

	const success = (result: Record<string, unknown>) => ({ message: 'Login successful.', result });

	it('fails without an API base URL, before reading the form', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fetch = vi.fn() as typeof globalThis.fetch;

		await expect(
			handleLoginAction(loginEvent(fetch), createDependencies({ publicApiBaseUrl: '' }))
		).resolves.toMatchObject({ status: 500, data: { message: messages.auth_login_failed() } });
		expect(fetch).not.toHaveBeenCalled();
	});

	it('rejects a submission missing a field', async () => {
		await expect(
			handleLoginAction(
				loginEvent(vi.fn() as typeof globalThis.fetch, { ...credentials, password: ' ' }),
				createDependencies()
			)
		).resolves.toMatchObject({
			status: 400,
			data: { message: messages.auth_invalid_form_submission() }
		});
	});

	it('maps network, upstream and parse failures to 502', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const offline = vi.fn(async () => {
			throw new TypeError('fetch failed');
		}) as typeof globalThis.fetch;

		for (const fetch of [offline, respondWith({}, 500), respondWith('{not json')]) {
			await expect(
				handleLoginAction(loginEvent(fetch), createDependencies())
			).resolves.toMatchObject({ status: 502, data: { message: messages.auth_login_failed() } });
		}
	});

	it('treats an unexpected success payload as invalid credentials', async () => {
		const later = new Date(Date.now() + 60_000).toISOString();
		const payloads = [
			{ message: 'Something else', result: { accessToken: 't', expires_at_datetime: later } },
			success({ expires_at_datetime: later }),
			success({ accessToken: 't' }),
			success({ accessToken: 't', expires_at_datetime: 'not a date' }),
			{}
		];

		for (const payload of payloads) {
			await expect(
				handleLoginAction(loginEvent(respondWith(payload)), createDependencies())
			).resolves.toMatchObject({
				status: 401,
				data: { message: messages.auth_invalid_credentials() }
			});
		}
	});

	it('refuses a session that has already expired', async () => {
		const expired = success({
			accessToken: 't',
			expires_at_datetime: new Date(Date.now() - 1000).toISOString()
		});

		await expect(
			handleLoginAction(loginEvent(respondWith(expired)), createDependencies())
		).resolves.toMatchObject({ status: 502, data: { message: messages.auth_login_failed() } });
	});
});
