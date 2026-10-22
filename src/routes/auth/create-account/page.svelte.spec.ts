import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import { getRecaptchaStatus, resetRecaptchaFailureState } from '$lib/utils/recaptcha';
import CreateAccountPage from './+page.svelte';

// Boundaries: the SvelteKit runtime (env, page URL, form enhancement) and
// Google's reCAPTCHA Enterprise API, stubbed on `window` so that its script is
// never loaded. The page runs on the real reCAPTCHA helpers.
const runtime = vi.hoisted(() => ({
	env: { PUBLIC_RECAPTCHA_SITE_KEY: 'test-site-key' },
	page: { url: new URL('http://localhost/auth/create-account'), params: {}, data: {} }
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
type Consent = 'privacy' | 'terms' | 'eula';

const CONSENTS: Consent[] = ['privacy', 'terms', 'eula'];

let recaptcha: { ready: Mock<EnterpriseApi['ready']>; execute: Mock<EnterpriseApi['execute']> };
let view: ReturnType<typeof renderWithServices> | null = null;

function render(companySignupEnabled = false) {
	view = renderWithServices(CreateAccountPage, {
		props: { data: { companySignupEnabled }, form: null } as never
	});
	return view;
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => byId<HTMLInputElement>(`create-account-${id}-input`);
const submitButton = () => byId<HTMLButtonElement>('create-account-submit-button');
const text = () => document.body.textContent ?? '';

function type(id: string, value: string) {
	const field = input(id);
	field.value = value;
	field.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/** Opens a policy (in a new tab in the app; kept on this page here), which unlocks its checkbox. */
function openPolicy(consent: Consent) {
	const link = byId<HTMLAnchorElement>(`create-account-consent-${consent}-link`);
	link.addEventListener('click', (event) => event.preventDefault(), { once: true });
	link.click();
	flushSync();
}

function toggleConsent(consent: Consent) {
	byId<HTMLInputElement>(`create-account-consent-${consent}-checkbox`).click();
	flushSync();
}

function fillIn() {
	type('first-name', 'Ada');
	type('last-name', 'Lovelace');
	type('email', 'ada@example.com');
	type('password', 'Secret-123');
	type('password-confirm', 'Secret-123');
	type('company', 'Analytical Engines');
	for (const consent of CONSENTS) {
		openPolicy(consent);
		toggleConsent(consent);
	}
}

/**
 * Runs the form's enhance callback as SvelteKit does on submit; `finish`
 * then hands the returned callback the action's result.
 */
async function submit() {
	if (!forms.submit) throw new Error('the form is not enhanced');
	const formElement = byId<HTMLFormElement>('create-account-form');
	const action = new URL('http://localhost/auth/create-account');
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

beforeEach(() => {
	runtime.page.url = new URL('http://localhost/auth/create-account');
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

describe('create account page', () => {
	it('shows the sign-up form', () => {
		render();

		expect(document.title).toBe(m.auth_create_account_page_title());
		expect(document.querySelector('h1')?.textContent).toBe(m.auth_create_account());
		expect(document.querySelector('.auth-subtitle')?.textContent).toContain(m.auth_or_prefix());
		expect(byId('create-account-sign-in-existing-link').textContent?.trim()).toBe(
			m.auth_sign_in_existing_account()
		);
		expect(document.querySelector('.logo-image')?.getAttribute('alt')).toBe(m.app_name());
		expect(
			[...document.querySelectorAll('label > .field-label')].map((label) => label.textContent)
		).toEqual([
			m.auth_first_name_label_required(),
			m.auth_last_name_label_required(),
			m.auth_email_label_required(),
			m.auth_password_label_required(),
			m.auth_confirm_password_label_required(),
			m.auth_company_name_label_required()
		]);
		expect(
			[
				['first-name', 'firstName', 'text', 'given-name', m.auth_first_name_placeholder()],
				['last-name', 'lastName', 'text', 'family-name', m.auth_last_name_placeholder()],
				['email', 'email', 'email', 'email', m.auth_email_placeholder()],
				['company', 'company', 'text', 'organization', m.auth_company_name_placeholder()]
			].map(([id]) => {
				const field = input(id);
				return [id, field.name, field.type, field.autocomplete, field.placeholder, field.required];
			})
		).toEqual([
			['first-name', 'firstName', 'text', 'given-name', m.auth_first_name_placeholder(), true],
			['last-name', 'lastName', 'text', 'family-name', m.auth_last_name_placeholder(), true],
			['email', 'email', 'email', 'email', m.auth_email_placeholder(), true],
			['company', 'company', 'text', 'organization', m.auth_company_name_placeholder(), true]
		]);
		expect(text()).toContain(m.auth_required_agreements_label());
		expect(submitButton().textContent?.trim()).toBe(m.auth_create_account());
		expect(submitButton().disabled).toBe(true);
		expect(byId('create-account-sign-in-instead-link').textContent?.trim()).toBe(
			m.auth_sign_in_instead()
		);
		expect(document.querySelector('.security-copy')?.textContent).toBe(m.auth_security_copy());
		expect(byId<HTMLFormElement>('create-account-form').method).toBe('post');
	});

	it('asks for an account type only when company sign-up is enabled', () => {
		render(false);
		expect(document.querySelector('input[name="account_type"]')).toBeNull();
		expect(text()).not.toContain(m.auth_account_type_label());
		view?.unmount();

		render(true);
		expect(document.querySelector('.account-type-fields legend')?.textContent).toBe(
			m.auth_account_type_label()
		);
		const personal = byId<HTMLInputElement>('create-account-type-personal');
		const company = byId<HTMLInputElement>('create-account-type-company');
		expect([personal.value, personal.checked, company.value, company.checked]).toEqual([
			'personal',
			true,
			'company',
			false
		]);
		expect(text()).toContain(m.auth_account_type_personal());
		expect(text()).toContain(m.auth_account_type_personal_hint());
		expect(text()).toContain(m.auth_account_type_company());
		expect(text()).toContain(m.auth_account_type_company_hint());
	});

	it('can be submitted only once every field is valid and every policy agreed to', () => {
		render();
		fillIn();
		expect(submitButton().disabled).toBe(false);

		for (const [id, value] of [
			['first-name', 'Ada'],
			['last-name', 'Lovelace'],
			['email', 'ada@example.com'],
			['company', 'Analytical Engines']
		]) {
			type(id, '   ');
			expect(submitButton().disabled, id).toBe(true);
			type(id, value);
			expect(submitButton().disabled, id).toBe(false);
		}

		type('password', 'secret-123');
		type('password-confirm', 'secret-123');
		expect(submitButton().disabled).toBe(true);
		type('password', 'Secret-123');
		expect(submitButton().disabled).toBe(true);
		type('password-confirm', 'Secret-123');
		expect(submitButton().disabled).toBe(false);

		for (const consent of CONSENTS) {
			toggleConsent(consent);
			expect(submitButton().disabled, consent).toBe(true);
			toggleConsent(consent);
			expect(submitButton().disabled, consent).toBe(false);
		}
	});

	it('shows the password rules and whether the passwords match as they are typed', () => {
		render();
		expect(document.querySelector('.pw-checklist')).toBeNull();
		expect(document.querySelector('.pw-match-hint')).toBeNull();

		type('password', 'secret');
		const met = () =>
			[...document.querySelectorAll('.pw-checklist li')].map((item) =>
				item.classList.contains('met')
			);
		expect(met()).toEqual([true, true, false, false, false]);

		type('password', 'Ｓｅｃｒｅｔ－１２３');
		expect(input('password').value).toBe('Secret-123');
		expect(met()).toEqual([true, true, true, true, true]);

		type('password-confirm', 'Secret-12');
		expect(document.querySelector('.pw-match-hint')?.textContent?.trim()).toBe(
			m.auth_passwords_do_not_match()
		);
		type('password-confirm', 'Secret-123');
		expect(document.querySelector('.pw-match-hint')?.textContent?.trim()).toBe(
			m.auth_passwords_match()
		);
	});

	it('asks for all three agreements once one of them is given', () => {
		render();
		expect(text()).not.toContain(m.auth_all_three_required());

		openPolicy('terms');
		toggleConsent('terms');
		expect(text()).toContain(m.auth_all_three_required());

		for (const consent of ['privacy', 'eula'] as const) {
			openPolicy(consent);
			toggleConsent(consent);
		}
		expect(text()).not.toContain(m.auth_all_three_required());
	});

	it('warms reCAPTCHA up as soon as it opens', async () => {
		render();

		await vi.waitFor(() => expect(recaptcha.ready).toHaveBeenCalledTimes(1));
		expect(recaptcha.execute).not.toHaveBeenCalled();
		expect(document.querySelector('script[src*="recaptcha/enterprise.js"]')).toBeNull();
	});

	it('posts every field, a REGISTER reCAPTCHA token and the three agreements', async () => {
		render();
		fillIn();

		const { cancel, formData } = await submit();

		expect(cancel).not.toHaveBeenCalled();
		expect(recaptcha.execute).toHaveBeenCalledWith('test-site-key', { action: 'REGISTER' });
		expect(Object.fromEntries(formData)).toEqual({
			firstName: 'Ada',
			lastName: 'Lovelace',
			email: 'ada@example.com',
			password: 'Secret-123',
			confirmPassword: 'Secret-123',
			company: 'Analytical Engines',
			recaptchaToken: 'recaptcha-token',
			agreedPrivacy: 'true',
			agreedTerms: 'true',
			agreedEula: 'true'
		});
		expect(submitButton().disabled).toBe(true);
		expect(submitButton().getAttribute('aria-busy')).toBe('true');
		expect(submitButton().textContent?.trim()).toBe(m.auth_creating_account());
	});

	it('posts the chosen account type when company sign-up is enabled', async () => {
		render(true);
		fillIn();

		const first = await submit();
		expect(first.formData.get('account_type')).toBe('personal');
		await first.finish({ type: 'failure', status: 400, data: {} });

		byId<HTMLInputElement>('create-account-type-company').click();
		flushSync();
		const second = await submit();
		expect(second.cancel).not.toHaveBeenCalled();
		expect(second.formData.get('account_type')).toBe('company');
		await second.finish({ type: 'failure', status: 400, data: {} });

		byId<HTMLInputElement>('create-account-type-personal').click();
		flushSync();
		expect((await submit()).formData.get('account_type')).toBe('personal');
	});

	it('applies the redirect to the check-email page', async () => {
		const { toasts } = render();
		fillIn();
		const result: ActionResult = {
			type: 'redirect',
			status: 303,
			location: '/auth/create-account/check-email'
		};

		await (await submit()).finish(result);

		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(toasts()).toEqual([]);
		expect(submitButton().getAttribute('aria-busy')).toBeNull();
		expect(submitButton().textContent?.trim()).toBe(m.auth_create_account());
	});

	it('shows why sign-up failed and puts back the fields as the server echoed them', async () => {
		const { toasts } = render();
		fillIn();
		type('first-name', '  Ada ');
		type('email', ' ada@example.com ');
		// The action echoes trimmed values, and null for a field it did not get.
		const result: ActionResult = {
			type: 'failure',
			status: 422,
			data: {
				message: m.auth_account_exists(),
				firstName: 'Ada',
				lastName: 'Lovelace',
				email: 'ada@example.com',
				company: null
			}
		};

		await (await submit()).finish(result);

		expect(toasts()).toMatchObject([{ tone: 'danger', message: m.auth_account_exists() }]);
		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(
			['first-name', 'last-name', 'email', 'company', 'password', 'password-confirm'].map(
				(id) => input(id).value
			)
		).toEqual(['Ada', 'Lovelace', 'ada@example.com', '', 'Secret-123', 'Secret-123']);
		expect(submitButton().getAttribute('aria-busy')).toBeNull();

		type('company', 'Analytical Engines');
		await (
			await submit()
		).finish({
			type: 'failure',
			status: 400,
			data: {
				message: m.auth_all_fields_required(),
				firstName: null,
				lastName: null,
				email: null,
				company: 'Analytical Engines'
			}
		});

		expect(['first-name', 'last-name', 'email', 'company'].map((id) => input(id).value)).toEqual([
			'',
			'',
			'',
			'Analytical Engines'
		]);
		expect(toasts().at(-1)).toMatchObject({
			tone: 'danger',
			message: m.auth_all_fields_required()
		});
	});

	it('only applies a failure without a message, or an unexpected error', async () => {
		const { toasts } = render();
		fillIn();

		await (await submit()).finish({ type: 'failure', status: 400, data: { firstName: 'Bob' } });
		await (await submit()).finish({ type: 'error', status: 500, error: new Error('boom') });

		expect(toasts()).toEqual([]);
		expect(forms.applyAction).toHaveBeenCalledTimes(2);
		expect(input('first-name').value).toBe('Ada');
		expect(submitButton().disabled).toBe(false);
	});

	it('re-enables the form even when applying the result fails', async () => {
		render();
		fillIn();
		forms.applyAction.mockRejectedValueOnce(new Error('navigation failed'));

		const { finish } = await submit();
		await expect(
			finish({ type: 'redirect', status: 303, location: '/auth/create-account/check-email' })
		).rejects.toThrow('navigation failed');
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
		expect(formData.has('agreedPrivacy')).toBe(false);
		expect(consoleError).toHaveBeenCalledWith('reCAPTCHA execution error:', failure);
		expect(toasts()).toMatchObject([{ tone: 'danger', message: m.auth_security_try_again() }]);
		expect(toasts()[0].duration).toBe(0);
		expect(submitButton().disabled).toBe(false);
		expect(submitButton().getAttribute('aria-busy')).toBeNull();
	});

	it('ignores another submit while the account is being created', async () => {
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

	it.each([
		['create-account-sign-in-existing-link', m.auth_sign_in_existing_account],
		['create-account-sign-in-instead-link', m.auth_sign_in_instead]
	])('goes to sign in from %s, keeping the redirect', async (id, label) => {
		runtime.page.url = new URL('http://localhost/auth/create-account?redirect=%2Flocations%2F8');
		render();
		const link = byId<HTMLAnchorElement>(id);
		expect(link.textContent?.trim()).toBe(label());
		// In the markup too, so the link keeps the redirect before hydration (and in a new tab).
		expect(link.getAttribute('href')).toBe('/auth/login?redirect=%2Flocations%2F8');
		const pageLoads = interceptPageLoads();

		try {
			link.click();

			await expect.poll(() => pageLoads.urls).toHaveLength(1);
			expect(pageLoads.urls[0]).toBe(
				`${window.location.origin}/auth/login?redirect=%2Flocations%2F8`
			);
		} finally {
			pageLoads.stop();
		}
	});

	it('goes to plain sign in without a redirect', async () => {
		render();
		expect(byId('create-account-sign-in-instead-link').getAttribute('href')).toBe('/auth/login');
		const pageLoads = interceptPageLoads();

		try {
			byId('create-account-sign-in-instead-link').click();

			await expect.poll(() => pageLoads.urls).toHaveLength(1);
			expect(pageLoads.urls[0]).toBe(`${window.location.origin}/auth/login`);
		} finally {
			pageLoads.stop();
		}
	});
});
