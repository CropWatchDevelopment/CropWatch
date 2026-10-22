import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import { getRecaptchaStatus, resetRecaptchaFailureState } from '$lib/utils/recaptcha';
import LoginPage from './+page.svelte';

// Boundaries: the SvelteKit runtime (env, page URL, form enhancement) and
// Google's reCAPTCHA Enterprise API, stubbed on `window` so that its script is
// never loaded. The page runs on the real reCAPTCHA helpers.
const runtime = vi.hoisted(() => ({
	env: { PUBLIC_RECAPTCHA_SITE_KEY: 'test-site-key' },
	page: { url: new URL('http://localhost/auth/login'), params: {}, data: {} }
}));
vi.mock('$env/dynamic/public', () => ({ env: runtime.env }));
vi.mock('$app/state', () => ({ page: runtime.page }));

// `use:enhance` without the network: the mock keeps the form's submit
// function so a test can run it as SvelteKit does and hand it a result.
const forms = vi.hoisted(() => ({
	submit: null as SubmitFunction | null,
	applyAction: vi.fn(async () => {})
}));
vi.mock('$app/forms', () => ({
	applyAction: forms.applyAction,
	enhance: (_form: HTMLFormElement, submit: SubmitFunction) => {
		forms.submit = submit;
		return { destroy: () => {} };
	}
}));

type EnterpriseApi = NonNullable<NonNullable<Window['grecaptcha']>['enterprise']>;

let recaptcha: { ready: Mock<EnterpriseApi['ready']>; execute: Mock<EnterpriseApi['execute']> };
let view: ReturnType<typeof renderWithServices> | null = null;

function render() {
	view = renderWithServices(LoginPage);
	return view;
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const submitButton = () => byId<HTMLButtonElement>('login-submit-button');
const href = (id: string) => byId<HTMLAnchorElement>(id).getAttribute('href');

function type(id: string, value: string) {
	const input = byId<HTMLInputElement>(id);
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function fillIn(email = 'ada@example.com', password = 'Secret-123') {
	type('login-email-input', email);
	type('login-password-input', password);
}

/**
 * Runs the form's enhance callback as SvelteKit does on submit; `finish`
 * then hands the returned callback the action's result.
 */
async function submit() {
	if (!forms.submit) throw new Error('the form is not enhanced');
	const formElement = byId<HTMLFormElement>('login-form');
	const action = new URL('http://localhost/auth/login');
	const formData = new FormData(formElement);
	const cancel = vi.fn();
	const after = await forms.submit({
		action,
		formData,
		formElement,
		controller: new AbortController(),
		submitter: submitButton(),
		cancel
	});
	flushSync();
	const finish = async (result: ActionResult) => {
		if (typeof after === 'function') {
			await after({ action, formData, formElement, result, update: vi.fn() });
		}
		flushSync();
	};
	return { cancel, after, formData, finish };
}

beforeEach(() => {
	runtime.page.url = new URL('http://localhost/auth/login');
	recaptcha = {
		ready: vi.fn<EnterpriseApi['ready']>((callback) => callback()),
		execute: vi.fn<EnterpriseApi['execute']>(async () => 'recaptcha-token')
	};
	window.grecaptcha = { enterprise: recaptcha };
});

afterEach(async () => {
	view?.unmount();
	view = null;
	forms.submit = null;
	forms.applyAction.mockReset();
	// reCAPTCHA's state is module-wide: let this page's warm-up finish, then
	// reset it so the next test starts from scratch.
	await vi.waitFor(() => expect(getRecaptchaStatus()).not.toBe('loading'));
	resetRecaptchaFailureState();
	vi.restoreAllMocks();
});

describe('login page', () => {
	it('shows the sign-in form', () => {
		render();

		expect(document.title).toBe(m.auth_login_page_title());
		expect(document.querySelector('h1')?.textContent).toBe(m.auth_login_heading());
		expect(document.querySelector('.auth-subtitle')?.textContent).toBe(m.auth_login_subtitle());
		expect(document.querySelector('.logo-image')?.getAttribute('alt')).toBe(m.app_name());
		expect(
			[...document.querySelectorAll('.field-label')].map((label) => label.textContent)
		).toEqual([m.auth_email_label(), m.auth_password_label()]);
		expect(document.querySelector('.security-copy')?.textContent).toBe(m.auth_security_copy());

		const email = byId<HTMLInputElement>('login-email-input');
		expect([email.name, email.type, email.required, email.autocomplete]).toEqual([
			'email',
			'email',
			true,
			'email'
		]);
		expect(email.placeholder).toBe(m.auth_email_placeholder());
		const password = byId<HTMLInputElement>('login-password-input');
		expect([password.name, password.type, password.required, password.autocomplete]).toEqual([
			'password',
			'password',
			true,
			'current-password'
		]);
		expect(password.placeholder).toBe(m.auth_password_placeholder());
		expect(password.closest('.cw-input')?.querySelector('button')?.getAttribute('aria-label')).toBe(
			m.cwui_input_show_password()
		);

		const form = byId<HTMLFormElement>('login-form');
		expect(form.method).toBe('post');
		expect(form.getAttribute('action')).toBeNull();
		expect(submitButton().type).toBe('submit');
		expect(submitButton().textContent?.trim()).toBe(m.auth_sign_in());
		expect(submitButton().querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
			m.auth_sign_in()
		);
	});

	it('enables signing in once an email and a password are typed', () => {
		render();
		expect(submitButton().disabled).toBe(true);

		type('login-email-input', 'ada@example.com');
		expect(submitButton().disabled).toBe(true);
		type('login-password-input', 'Secret-123');
		expect(submitButton().disabled).toBe(false);

		type('login-email-input', '');
		expect(submitButton().disabled).toBe(true);
	});

	it.each([
		['auth-required', () => m.auth_login_reason_auth_required()],
		['expired', () => m.auth_login_reason_expired()],
		['signed-out', () => m.auth_login_reason_signed_out()],
		['password-reset', () => m.auth_login_reason_password_reset()],
		['error-recovery', () => m.auth_login_reason_error_recovery()]
	])('says why it opened (reason=%s)', (reason, message) => {
		runtime.page.url = new URL(`http://localhost/auth/login?redirect=%2Fsettings&reason=${reason}`);

		render();

		const alert = byId('login-reason-alert');
		expect(alert.getAttribute('role')).toBe('status');
		expect(alert.textContent?.trim()).toBe(message());
	});

	it.each(['', '?reason=', '?reason=hacked'])('shows no reason for %j', (search) => {
		runtime.page.url = new URL(`http://localhost/auth/login${search}`);

		render();

		expect(document.querySelector('.auth-alert')).toBeNull();
	});

	it('links to account creation and password reset', () => {
		render();

		expect(byId('login-create-account-link').textContent?.trim()).toBe(m.auth_create_account());
		expect(href('login-create-account-link')).toBe('/auth/create-account');
		expect(byId('login-forgot-password-link').textContent?.trim()).toBe(m.auth_forgot_password());
		expect(href('login-forgot-password-link')).toBe('/auth/forgot-password');
	});

	it('carries a safe redirect into those links', () => {
		runtime.page.url = new URL(
			'http://localhost/auth/login?redirect=%2Flocations%2F8%3Ftab%3Dmap&reason=expired'
		);

		render();

		expect(href('login-create-account-link')).toBe(
			'/auth/create-account?redirect=%2Flocations%2F8%3Ftab%3Dmap'
		);
		expect(href('login-forgot-password-link')).toBe(
			'/auth/forgot-password?redirect=%2Flocations%2F8%3Ftab%3Dmap'
		);
	});

	it.each(['https://evil.example/', '//evil.example', '/auth/logout'])(
		'drops the redirect %s',
		(redirect) => {
			runtime.page.url = new URL(
				`http://localhost/auth/login?redirect=${encodeURIComponent(redirect)}`
			);

			render();

			expect(href('login-create-account-link')).toBe('/auth/create-account');
			expect(href('login-forgot-password-link')).toBe('/auth/forgot-password');
		}
	);

	it('warms reCAPTCHA up as soon as it opens', async () => {
		render();

		await vi.waitFor(() => expect(recaptcha.ready).toHaveBeenCalledTimes(1));
		expect(recaptcha.execute).not.toHaveBeenCalled();
		expect(document.querySelector('script[src*="recaptcha/enterprise.js"]')).toBeNull();
	});

	it('posts the credentials with a LOGIN reCAPTCHA token, signing in meanwhile', async () => {
		render();
		fillIn();

		const { cancel, formData } = await submit();

		expect(cancel).not.toHaveBeenCalled();
		expect(recaptcha.execute).toHaveBeenCalledWith('test-site-key', { action: 'LOGIN' });
		expect(Object.fromEntries(formData)).toEqual({
			email: 'ada@example.com',
			password: 'Secret-123',
			recaptchaToken: 'recaptcha-token'
		});
		expect(submitButton().disabled).toBe(true);
		expect(submitButton().getAttribute('aria-busy')).toBe('true');
		expect(submitButton().textContent?.trim()).toBe(m.auth_signing_in());
	});

	it('announces the redirect after signing in, then follows it', async () => {
		const { toasts } = render();
		fillIn();
		const result: ActionResult = { type: 'redirect', status: 303, location: '/locations' };

		const { finish } = await submit();
		await finish(result);

		expect(toasts()).toMatchObject([
			{ tone: 'success', message: m.auth_login_success_redirecting() }
		]);
		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(submitButton().getAttribute('aria-busy')).toBeNull();
		expect(submitButton().textContent?.trim()).toBe(m.auth_sign_in());
		expect(submitButton().disabled).toBe(false);
	});

	it("shows why signing in failed and applies the action's result", async () => {
		const { toasts } = render();
		fillIn();
		const result: ActionResult = {
			type: 'failure',
			status: 401,
			data: { message: m.auth_invalid_credentials() }
		};

		const { finish } = await submit();
		await finish(result);

		expect(toasts()).toMatchObject([{ tone: 'danger', message: m.auth_invalid_credentials() }]);
		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(submitButton().disabled).toBe(false);
	});

	it('only applies a failure without a message, or an unexpected error', async () => {
		const { toasts } = render();
		fillIn();

		await (await submit()).finish({ type: 'failure', status: 400, data: {} });
		await (await submit()).finish({ type: 'error', status: 500, error: new Error('boom') });

		expect(toasts()).toEqual([]);
		expect(forms.applyAction).toHaveBeenCalledTimes(2);
		expect(submitButton().disabled).toBe(false);
	});

	it('re-enables the form even when applying the result fails', async () => {
		render();
		fillIn();
		forms.applyAction.mockRejectedValueOnce(new Error('navigation failed'));

		const { finish } = await submit();
		await expect(finish({ type: 'redirect', status: 303, location: '/' })).rejects.toThrow(
			'navigation failed'
		);
		flushSync();

		expect(submitButton().getAttribute('aria-busy')).toBeNull();
		expect(submitButton().disabled).toBe(false);
	});

	it('stops and asks to try again when reCAPTCHA fails', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const failure = new Error('reCAPTCHA token generation timed out');
		recaptcha.execute.mockRejectedValueOnce(failure);
		const { toasts } = render();
		fillIn();

		const { cancel, after, formData } = await submit();

		expect(cancel).toHaveBeenCalledTimes(1);
		expect(after).toBeUndefined();
		expect(formData.has('recaptchaToken')).toBe(false);
		expect(consoleError).toHaveBeenCalledWith('reCAPTCHA execution error:', failure);
		// The same toast as every other auth form (no shorter, login-only duration).
		expect(toasts()).toMatchObject([{ tone: 'danger', message: m.auth_security_try_again() }]);
		expect(toasts()[0].duration).not.toBe(7000);
		expect(submitButton().disabled).toBe(false);
		expect(submitButton().getAttribute('aria-busy')).toBeNull();
	});

	it('ignores another submit while signing in', async () => {
		render();
		fillIn();
		let issueToken: (token: string) => void = () => {};
		recaptcha.execute.mockImplementationOnce(
			() => new Promise<string>((resolve) => (issueToken = resolve))
		);

		const first = submit();
		await vi.waitFor(() => expect(recaptcha.execute).toHaveBeenCalledTimes(1));
		const second = await submit();
		issueToken('token-1');
		const { cancel, formData } = await first;

		expect(second.cancel).toHaveBeenCalledTimes(1);
		expect(second.after).toBeUndefined();
		expect(cancel).not.toHaveBeenCalled();
		expect(formData.get('recaptchaToken')).toBe('token-1');
		expect(recaptcha.execute).toHaveBeenCalledTimes(1);
	});
});
