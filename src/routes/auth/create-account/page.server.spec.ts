import { isRedirect } from '@sveltejs/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import {
	formRequest,
	testEvent,
	testLocals,
	testServerConfig,
	type TestLocals
} from '$lib/testing/server';
import { actions, load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<(typeof actions)['default']>[0];

const VALID = {
	firstName: 'Ada',
	lastName: 'Lovelace',
	email: 'ada@example.com',
	password: 'Secret-123',
	confirmPassword: 'Secret-123',
	company: 'Analytical Engines',
	recaptchaToken: 'tok',
	agreedPrivacy: 'true',
	agreedTerms: 'true',
	agreedEula: 'true'
};

const ECHO = {
	firstName: 'Ada',
	lastName: 'Lovelace',
	email: 'ada@example.com',
	company: 'Analytical Engines'
};

function locals(orgsEnabled = false) {
	return testLocals({ jwtString: null, config: { server: testServerConfig({ orgsEnabled }) } });
}

function act(target: TestLocals, fields: Record<string, string>, query = '') {
	return Promise.resolve(
		actions.default(
			testEvent<ActionEvent>({
				locals: target,
				url: `https://app.test/auth/create-account${query}`,
				request: formRequest(fields)
			})
		)
	);
}

function signedUp(target: TestLocals) {
	target.services.recaptcha.verify.mockResolvedValue({ success: true });
	target.services.supabaseAuth.signUp.mockResolvedValue({ data: {}, error: null } as never);
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('create-account load', () => {
	it('offers company sign-up only with ORGS_ENABLED and never from an invite link', async () => {
		const run = (orgsEnabled: boolean, url: string) =>
			load(testEvent<LoadEvent>({ locals: locals(orgsEnabled), url }));

		await expect(run(true, 'http://localhost/auth/create-account')).resolves.toEqual({
			companySignupEnabled: true
		});
		await expect(run(true, 'http://localhost/auth/create-account?invite=abc')).resolves.toEqual({
			companySignupEnabled: false
		});
		await expect(run(false, 'http://localhost/auth/create-account')).resolves.toEqual({
			companySignupEnabled: false
		});
	});
});

describe('create-account action', () => {
	it('signs up a personal account and goes to the check-email page', async () => {
		const target = locals();
		signedUp(target);

		const thrown = await act(target, VALID).catch((error: unknown) => error);

		expect(isRedirect(thrown)).toBe(true);
		expect((thrown as { location: string }).location).toContain('/auth/create-account/check-email');
		expect(target.services.supabaseAuth.signUp).toHaveBeenCalledWith({
			email: 'ada@example.com',
			password: 'Secret-123',
			options: {
				data: {
					first_name: 'Ada',
					last_name: 'Lovelace',
					company: 'Analytical Engines',
					account_type: 'personal',
					agreed_privacy: true,
					agreed_terms: true,
					agreed_eula: true
				}
			}
		});
		expect(target.services.recaptcha.verify).toHaveBeenCalledWith(
			'tok',
			'REGISTER',
			0.5,
			expect.objectContaining({ route: '/auth/create-account', flow: 'register' })
		);
	});

	it('creates a company account only when orgs are enabled and it is not an invite', async () => {
		const enabled = locals(true);
		signedUp(enabled);
		await act(enabled, { ...VALID, account_type: 'company' }).catch(() => null);
		expect(enabled.services.supabaseAuth.signUp.mock.calls[0][0].options?.data).toMatchObject({
			account_type: 'company',
			company_name: 'Analytical Engines'
		});

		const invited = locals(true);
		signedUp(invited);
		await act(invited, { ...VALID, account_type: 'company' }, '?invite=abc').catch(() => null);
		expect(invited.services.supabaseAuth.signUp.mock.calls[0][0].options?.data).toMatchObject({
			account_type: 'personal'
		});

		const disabled = locals(false);
		signedUp(disabled);
		await act(disabled, { ...VALID, account_type: 'company' }).catch(() => null);
		expect(disabled.services.supabaseAuth.signUp.mock.calls[0][0].options?.data).not.toHaveProperty(
			'company_name'
		);
	});

	it('validates the form before checking reCAPTCHA, echoing what was typed', async () => {
		const target = locals();
		const cases: [Record<string, string>, string][] = [
			[{ ...VALID, company: '' }, m.auth_all_fields_required()],
			[{ ...VALID, recaptchaToken: '' }, m.auth_security_try_again()],
			[{ ...VALID, confirmPassword: 'other' }, m.auth_passwords_do_not_match_plain()],
			// The form only lets a strong password through; a direct POST must not either.
			[{ ...VALID, password: 'secret1', confirmPassword: 'secret1' }, m.auth_password_too_weak()],
			[{ ...VALID, agreedEula: 'false' }, m.auth_must_agree_all_policies()]
		];

		for (const [fields, message] of cases) {
			const result = await act(target, fields);
			expect(result).toMatchObject({ status: 400, data: { message } });
		}
		expect(await act(target, { ...VALID, company: '' })).toMatchObject({
			data: { ...ECHO, company: null }
		});
		expect(target.services.recaptcha.verify).not.toHaveBeenCalled();
	});

	it('stops when reCAPTCHA fails', async () => {
		const target = locals();
		target.services.recaptcha.verify.mockResolvedValue({ success: false });

		await expect(act(target, VALID)).resolves.toMatchObject({
			status: 400,
			data: { message: m.auth_security_try_again(), ...ECHO }
		});
		expect(target.services.supabaseAuth.signUp).not.toHaveBeenCalled();
	});

	it('explains an existing account, and reports other sign-up failures', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const failure = async (error: { message?: string; status?: number }) => {
			const target = locals();
			target.services.recaptcha.verify.mockResolvedValue({ success: true });
			target.services.supabaseAuth.signUp.mockResolvedValue({ data: {}, error } as never);
			return act(target, VALID);
		};

		await expect(
			failure({ message: 'User already registered', status: 422 })
		).resolves.toMatchObject({ status: 422, data: { message: m.auth_account_exists(), ...ECHO } });
		await expect(failure({ message: 'Email has already been registered' })).resolves.toMatchObject({
			status: 500,
			data: { message: m.auth_account_exists() }
		});
		await expect(failure({ message: 'duplicate key' })).resolves.toMatchObject({
			data: { message: m.auth_account_exists() }
		});
		await expect(failure({ status: 503 })).resolves.toMatchObject({
			status: 503,
			data: { message: m.auth_registration_failed() }
		});
	});
});
