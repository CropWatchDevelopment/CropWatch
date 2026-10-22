import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { formRequest, testEvent, testLocals, type TestLocals } from '$lib/testing/server';
import { actions } from './+page.server';

type ActionEvent = Parameters<(typeof actions)['forgotPassword']>[0];

function act(locals: TestLocals, fields: Record<string, string>) {
	return actions.forgotPassword(
		testEvent<ActionEvent>({
			locals,
			url: 'https://app.test/auth/forgot-password?redirect=%2Frules',
			request: formRequest(fields, 'https://app.test/auth/forgot-password', {
				'user-agent': 'vitest'
			})
		})
	);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('forgotPassword', () => {
	it('sends the reset email with a link back to login', async () => {
		const locals = testLocals({ jwtString: null });
		locals.services.recaptcha.verify.mockResolvedValue({ success: true });
		locals.services.supabaseAuth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

		await expect(act(locals, { email: ' a@b.c ', recaptchaToken: 'tok' })).resolves.toEqual({
			success: true
		});
		expect(locals.services.recaptcha.verify).toHaveBeenCalledWith('tok', 'FORGOT_PASSWORD', 0.5, {
			route: '/auth/forgot-password',
			flow: 'forgot-password',
			userAgent: 'vitest'
		});
		const [email, options] = locals.services.supabaseAuth.resetPasswordForEmail.mock.calls[0];
		expect(email).toBe('a@b.c');
		expect(options?.redirectTo).toMatch(/^https:\/\/app\.test\/auth\/login\?/);
		expect(options?.redirectTo).toContain('password-reset');
	});

	it('requires an email and a reCAPTCHA token', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(act(locals, { email: ' ', recaptchaToken: 'tok' })).resolves.toMatchObject({
			status: 400,
			data: { message: m.auth_enter_email() }
		});
		await expect(act(locals, { email: 'a@b.c' })).resolves.toMatchObject({
			status: 400,
			data: { message: m.auth_security_try_again() }
		});
		expect(locals.services.recaptcha.verify).not.toHaveBeenCalled();
	});

	it('stops when reCAPTCHA fails', async () => {
		const locals = testLocals({ jwtString: null });
		locals.services.recaptcha.verify.mockResolvedValue({ success: false });

		await expect(act(locals, { email: 'a@b.c', recaptchaToken: 'tok' })).resolves.toMatchObject({
			status: 400,
			data: { message: m.auth_security_try_again() }
		});
		expect(locals.services.supabaseAuth.resetPasswordForEmail).not.toHaveBeenCalled();
	});

	it('fails with 500 when Supabase rejects the request', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const locals = testLocals({ jwtString: null });
		locals.services.recaptcha.verify.mockResolvedValue({ success: true });
		locals.services.supabaseAuth.resetPasswordForEmail.mockResolvedValue({
			data: null,
			error: { message: 'rate limited' }
		} as never);

		await expect(act(locals, { email: 'a@b.c', recaptchaToken: 'tok' })).resolves.toMatchObject({
			status: 500,
			data: { message: m.auth_login_failed() }
		});
	});
});
