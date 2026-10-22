import { describe, expect, it, vi } from 'vitest';
import { testPublicConfig } from '$lib/testing/http';
import { formRequest, testEvent, testLocals, testServerConfig } from '$lib/testing/server';

const { handleLoginAction } = vi.hoisted(() => ({
	handleLoginAction: vi.fn<(...args: unknown[]) => Promise<{ handled: boolean }>>(async () => ({
		handled: true
	}))
}));
vi.mock('$lib/server/auth/login-action', () => ({ handleLoginAction }));

const { actions } = await import('./+page.server');

type ActionEvent = Parameters<(typeof actions)['default']>[0];

describe('login action wiring', () => {
	it('passes the configured API, cookie security and the injected reCAPTCHA verifier', async () => {
		const locals = testLocals({
			jwtString: null,
			config: {
				public: testPublicConfig({
					apiBaseUrl: '  https://api.cropwatch.test  ',
					endpoints: { ...testPublicConfig().endpoints, login: '/v2/login' }
				}),
				server: testServerConfig()
			}
		});
		locals.services.recaptcha.verify.mockResolvedValue({ success: true });
		const event = testEvent<ActionEvent>({
			locals,
			url: 'https://app.test/auth/login',
			request: formRequest({})
		});

		await expect(actions.default(event)).resolves.toEqual({ handled: true });

		const [passedEvent, deps] = handleLoginAction.mock.calls[0] as unknown as [
			unknown,
			{
				publicApiBaseUrl: string;
				publicLoginEndpoint: string;
				secureCookies: boolean;
				verifyRecaptchaToken: (...args: unknown[]) => Promise<unknown>;
			}
		];
		expect(passedEvent).toBe(event);
		expect(deps).toMatchObject({
			publicApiBaseUrl: 'https://api.cropwatch.test',
			publicLoginEndpoint: '/v2/login',
			secureCookies: true
		});
		await deps.verifyRecaptchaToken('token', 'LOGIN', 0.5, { flow: 'login' });
		expect(locals.services.recaptcha.verify).toHaveBeenCalledWith('token', 'LOGIN', 0.5, {
			flow: 'login'
		});
	});

	it('uses insecure cookies over plain HTTP (local development)', async () => {
		handleLoginAction.mockClear();
		await actions.default(
			testEvent<ActionEvent>({ locals: testLocals(), url: 'http://localhost/auth/login' })
		);

		expect(handleLoginAction.mock.calls[0][1]).toMatchObject({ secureCookies: false });
	});
});
