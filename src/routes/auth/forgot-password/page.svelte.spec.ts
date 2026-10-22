import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import { getRecaptchaStatus, resetRecaptchaFailureState } from '$lib/utils/recaptcha';
import ForgotPasswordPage from './+page.svelte';

// Boundaries: the SvelteKit runtime (env, page URL, form enhancement) and
// Google's reCAPTCHA Enterprise API, stubbed on `window` so that its script is
// never loaded. The page runs on the real reCAPTCHA helpers.
const runtime = vi.hoisted(() => ({
	env: { PUBLIC_RECAPTCHA_SITE_KEY: 'test-site-key' },
	page: { url: new URL('http://localhost/auth/forgot-password'), params: {}, data: {} }
}));
vi.mock('$env/dynamic/public', () => ({ env: runtime.env }));
vi.mock('$app/state', () => ({ page: runtime.page }));

// `use:enhance` without the network: the mock keeps the form's submit
// function so a test can run it as SvelteKit does and hand it a result.
const forms = vi.hoisted(() => ({
	submit: null as SubmitFunction | null,
	applyAction: vi.fn<(result: ActionResult) => Promise<void>>(async () => {})
}));
vi.mock('$app/forms', () => ({
	applyAction: forms.applyAction,
	enhance: (_form: HTMLFormElement, submit: SubmitFunction) => {
		forms.submit = submit;
		return { destroy: () => {} };
	}
}));

type EnterpriseApi = NonNullable<NonNullable<Window['grecaptcha']>['enterprise']>;
type FormProp = { message?: string; success?: boolean } | null;

let recaptcha: { ready: Mock<EnterpriseApi['ready']>; execute: Mock<EnterpriseApi['execute']> };
let view: ReturnType<typeof renderWithServices> | null = null;

/** `form` is reactive: applying a result updates it, as SvelteKit's `applyAction` does. */
function render(form: FormProp = null) {
	const props = $state({ data: {}, form });
	forms.applyAction.mockImplementation(async (result) => {
		if (result.type === 'success' || result.type === 'failure') {
			props.form = (result.data ?? null) as FormProp;
		}
	});
	view = renderWithServices(ForgotPasswordPage, { props: props as never });
	return view;
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const submitButton = () => byId<HTMLButtonElement>('forgot-password-submit-button');
const heading = () => document.querySelector('h1')?.textContent;
const subtitle = () => document.querySelector('.auth-subtitle')?.textContent;

function typeEmail(value: string) {
	const input = byId<HTMLInputElement>('forgot-password-email-input');
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/**
 * Runs the form's enhance callback as SvelteKit does on submit; `finish`
 * then hands the returned callback the action's result.
 */
async function submit() {
	if (!forms.submit) throw new Error('the form is not enhanced');
	const formElement = byId<HTMLFormElement>('forgot-password-form');
	const action = new URL('http://localhost/auth/forgot-password?/forgotPassword');
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

/**
 * Full page loads (`window.location.assign`) are recorded and cancelled
 * through the Navigation API, so the test page stays put.
 */
function interceptPageLoads() {
	const navigation = (window as unknown as { navigation: EventTarget }).navigation;
	const urls: string[] = [];
	const onNavigate = (event: Event) => {
		urls.push((event as Event & { destination: { url: string } }).destination.url);
		event.preventDefault();
	};
	navigation.addEventListener('navigate', onNavigate);
	return { urls, stop: () => navigation.removeEventListener('navigate', onNavigate) };
}

async function clickAndCatchPageLoad(id: string) {
	const pageLoads = interceptPageLoads();
	try {
		byId(id).click();
		await expect.poll(() => pageLoads.urls).toHaveLength(1);
		return pageLoads.urls[0].slice(window.location.origin.length);
	} finally {
		pageLoads.stop();
	}
}

beforeEach(() => {
	runtime.page.url = new URL('http://localhost/auth/forgot-password');
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

describe('forgot password page', () => {
	it('asks for the email address to send a reset link to', () => {
		render();

		expect(document.title).toBe(m.auth_forgot_password_page_title());
		expect(heading()).toBe(m.auth_forgot_password());
		expect(subtitle()).toBe(m.auth_forgot_password_subtitle());
		expect(document.querySelector('.logo-image')?.getAttribute('alt')).toBe(m.app_name());
		expect(document.querySelector('.field-label')?.textContent).toBe(m.auth_email_label());
		const email = byId<HTMLInputElement>('forgot-password-email-input');
		expect([email.name, email.type, email.required, email.autocomplete]).toEqual([
			'email',
			'email',
			true,
			'email'
		]);
		expect(email.placeholder).toBe(m.auth_email_placeholder());
		const form = byId<HTMLFormElement>('forgot-password-form');
		expect(form.method).toBe('post');
		expect(form.getAttribute('action')).toBe('?/forgotPassword');
		expect(submitButton().type).toBe('submit');
		expect(submitButton().disabled).toBe(false);
		expect(submitButton().textContent?.trim()).toBe(m.auth_send_reset_link());
		expect(submitButton().querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
			m.auth_send_reset_link()
		);
		expect(byId('forgot-password-back-to-login-link').textContent?.trim()).toBe(
			m.auth_back_to_login()
		);
		expect(byId('forgot-password-back-to-login-link').getAttribute('href')).toBe('/auth/login');
		expect(byId('forgot-password-create-account-link').textContent?.trim()).toBe(
			m.auth_create_account()
		);
		expect(byId('forgot-password-create-account-link').getAttribute('href')).toBe(
			'/auth/create-account'
		);
		expect(document.querySelector('.security-copy')?.textContent).toBe(m.auth_security_copy());
		expect(byId('forgot-password-sent-back-to-login-link')).toBeNull();
	});

	it('confirms the link was sent once the action succeeded', () => {
		render({ success: true });

		expect(document.title).toBe(m.auth_forgot_password_page_title());
		expect(heading()).toBe(m.auth_check_email_heading());
		expect(subtitle()).toBe(m.auth_forgot_password_sent_body());
		expect(byId('forgot-password-form')).toBeNull();
		const back = byId('forgot-password-sent-back-to-login-link');
		expect(back.textContent?.trim()).toBe(m.auth_back_to_login());
		expect(back.getAttribute('href')).toBe('/auth/login');
		expect(back.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
			m.auth_back_to_login()
		);
		expect(document.querySelector('.security-copy')?.textContent).toBe(m.auth_security_copy());
	});

	it('keeps asking after a failed attempt', () => {
		render({ message: m.auth_enter_email() });

		expect(heading()).toBe(m.auth_forgot_password());
		expect(byId('forgot-password-form')).not.toBeNull();
	});

	it('warms reCAPTCHA up as soon as it opens', async () => {
		render();

		await vi.waitFor(() => expect(recaptcha.ready).toHaveBeenCalledTimes(1));
		expect(recaptcha.execute).not.toHaveBeenCalled();
		expect(document.querySelector('script[src*="recaptcha/enterprise.js"]')).toBeNull();
	});

	it('posts the email with a FORGOT_PASSWORD reCAPTCHA token, then confirms', async () => {
		const { toasts } = render();
		typeEmail('ada@example.com');

		const { cancel, formData, finish } = await submit();

		expect(cancel).not.toHaveBeenCalled();
		expect(recaptcha.execute).toHaveBeenCalledWith('test-site-key', { action: 'FORGOT_PASSWORD' });
		expect(Object.fromEntries(formData)).toEqual({
			email: 'ada@example.com',
			recaptchaToken: 'recaptcha-token'
		});
		expect(submitButton().disabled).toBe(true);
		expect(submitButton().textContent?.trim()).toBe(m.auth_sending());
		expect(submitButton().querySelector('[role="img"]')).toBeNull();

		const result: ActionResult = { type: 'success', status: 200, data: { success: true } };
		await finish(result);

		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(toasts()).toEqual([]);
		expect(heading()).toBe(m.auth_check_email_heading());
	});

	it('shows why the request failed and lets the user try again', async () => {
		const { toasts } = render();
		typeEmail('ada@example.com');
		const result: ActionResult = {
			type: 'failure',
			status: 500,
			data: { message: m.auth_login_failed() }
		};

		await (await submit()).finish(result);

		expect(toasts()).toMatchObject([{ tone: 'danger', message: m.auth_login_failed() }]);
		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(heading()).toBe(m.auth_forgot_password());
		expect(submitButton().disabled).toBe(false);
		expect(submitButton().textContent?.trim()).toBe(m.auth_send_reset_link());
	});

	it('only applies a failure without a message, or an unexpected error', async () => {
		const { toasts } = render();

		await (await submit()).finish({ type: 'failure', status: 400, data: {} });
		await (await submit()).finish({ type: 'error', status: 500, error: new Error('boom') });

		expect(toasts()).toEqual([]);
		expect(forms.applyAction).toHaveBeenCalledTimes(2);
		expect(submitButton().disabled).toBe(false);
	});

	it('stops and asks to try again when reCAPTCHA fails', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const failure = new Error('reCAPTCHA token generation timed out');
		recaptcha.execute.mockRejectedValueOnce(failure);
		const { toasts } = render();
		typeEmail('ada@example.com');

		const { cancel, after, formData } = await submit();

		expect(cancel).toHaveBeenCalledTimes(1);
		expect(after).toBeUndefined();
		expect(formData.has('recaptchaToken')).toBe(false);
		expect(consoleError).toHaveBeenCalledWith('reCAPTCHA token failed:', failure);
		expect(toasts()).toMatchObject([{ tone: 'danger', message: m.auth_security_try_again() }]);
		expect(toasts()[0].duration).toBe(0);
		expect(submitButton().disabled).toBe(false);
	});

	it('ignores another submit while the link is being requested', async () => {
		render();
		typeEmail('ada@example.com');
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

	it('goes back to sign in or on to sign up, keeping the redirect', async () => {
		runtime.page.url = new URL('http://localhost/auth/forgot-password?redirect=%2Freports');
		render();
		// In the markup too, so the links keep the redirect before hydration (and in a new tab).
		expect(byId('forgot-password-back-to-login-link').getAttribute('href')).toBe(
			'/auth/login?redirect=%2Freports'
		);
		expect(byId('forgot-password-create-account-link').getAttribute('href')).toBe(
			'/auth/create-account?redirect=%2Freports'
		);

		await expect(clickAndCatchPageLoad('forgot-password-back-to-login-link')).resolves.toBe(
			'/auth/login?redirect=%2Freports'
		);
		await expect(clickAndCatchPageLoad('forgot-password-create-account-link')).resolves.toBe(
			'/auth/create-account?redirect=%2Freports'
		);
	});

	it('goes back to plain sign in after the link was sent', async () => {
		render({ success: true });

		await expect(clickAndCatchPageLoad('forgot-password-sent-back-to-login-link')).resolves.toBe(
			'/auth/login'
		);
	});
});
