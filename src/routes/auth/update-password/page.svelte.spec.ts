import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import UpdatePasswordPage from './+page.svelte';

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

const RULES = [
	m.auth_password_requirement_length,
	m.auth_password_requirement_lowercase,
	m.auth_password_requirement_uppercase,
	m.auth_password_requirement_number,
	m.auth_password_requirement_symbol
];

let view: ReturnType<typeof renderWithServices> | null = null;

function render() {
	view = renderWithServices(UpdatePasswordPage, { props: { data: {}, form: null } as never });
	return view;
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const submitButton = () => byId<HTMLButtonElement>('update-password-submit-button');
const rules = () =>
	[...document.querySelectorAll('.req-list li')].map((item) => [
		item.textContent,
		item.classList.contains('met')
	]);
const matchMessage = () => document.querySelector('.match-ok, .match-err');

function type(id: string, value: string) {
	const input = byId<HTMLInputElement>(id);
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function choose(password: string, confirmation = password) {
	type('update-password-input', password);
	type('update-password-confirm-input', confirmation);
}

/**
 * Runs the form's enhance callback as SvelteKit does on submit; `finish`
 * then hands the returned callback the action's result.
 */
async function submit() {
	if (!forms.submit) throw new Error('the form is not enhanced');
	const formElement = byId<HTMLFormElement>('update-password-form');
	const action = new URL('http://localhost/auth/update-password');
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

afterEach(() => {
	view?.unmount();
	view = null;
	forms.submit = null;
	forms.applyAction.mockReset();
});

describe('update password page', () => {
	it('asks for the new password twice', () => {
		render();

		expect(document.title).toBe(m.auth_update_password_page_title());
		expect(document.querySelector('h1')?.textContent).toBe(m.auth_update_password_heading());
		expect(document.querySelector('.auth-subtitle')?.textContent).toBe(
			m.auth_update_password_subtitle()
		);
		expect(document.querySelector('.logo-image')?.getAttribute('alt')).toBe(m.app_name());
		expect(
			[...document.querySelectorAll('.field-label')].map((label) => label.textContent)
		).toEqual([m.auth_password_label(), m.auth_update_password_confirm_label()]);
		for (const [id, name] of [
			['update-password-input', 'password'],
			['update-password-confirm-input', 'confirmPassword']
		]) {
			const field = byId<HTMLInputElement>(id);
			expect([field.name, field.type, field.required, field.autocomplete]).toEqual([
				name,
				'password',
				true,
				'new-password'
			]);
			expect(field.placeholder).toBe(m.auth_password_placeholder());
			expect(field.closest('.cw-input')?.querySelector('button')?.getAttribute('aria-label')).toBe(
				m.cwui_input_show_password()
			);
		}
		expect(byId<HTMLFormElement>('update-password-form').method).toBe('post');
		expect(submitButton().type).toBe('submit');
		expect(submitButton().disabled).toBe(true);
		expect(submitButton().textContent?.trim()).toBe(m.auth_update_password_submit());
		expect(document.querySelector('.password-requirements')).toBeNull();
		expect(matchMessage()).toBeNull();

		const back = byId<HTMLAnchorElement>('update-password-back-to-login-link');
		expect(back.getAttribute('href')).toBe('/auth/login');
		expect(back.textContent?.trim()).toBe(m.auth_back_to_login());
	});

	it('shows which password rules are met as the password is typed', () => {
		render();

		type('update-password-input', 'abc');
		expect(document.querySelector('.req-heading')?.textContent).toBe(
			m.auth_password_requirements()
		);
		expect(rules()).toEqual(RULES.map((rule, index) => [rule(), index === 1]));

		type('update-password-input', 'Abc123!');
		expect(rules()).toEqual(RULES.map((rule) => [rule(), true]));

		type('update-password-input', '');
		expect(document.querySelector('.password-requirements')).toBeNull();
	});

	it('says whether the confirmation matches once one is typed', () => {
		render();
		type('update-password-input', 'Abc123!');
		expect(matchMessage()).toBeNull();

		type('update-password-confirm-input', 'Abc123');
		expect(matchMessage()?.className).toContain('match-err');
		expect(matchMessage()?.textContent).toBe(m.auth_passwords_do_not_match());

		type('update-password-confirm-input', 'Abc123!');
		expect(matchMessage()?.className).toContain('match-ok');
		expect(matchMessage()?.textContent).toBe(m.auth_passwords_match());
	});

	it('can be submitted only with a strong password typed twice', () => {
		render();

		choose('abc123!', 'abc123!');
		expect(submitButton().disabled).toBe(true);
		choose('Abc123!', 'Abc123?');
		expect(submitButton().disabled).toBe(true);
		choose('Abc123!');
		expect(submitButton().disabled).toBe(false);
	});

	it('posts both passwords and shows that it is sending', async () => {
		render();
		choose('Abc123!');

		const { cancel, formData } = await submit();

		expect(cancel).not.toHaveBeenCalled();
		expect(Object.fromEntries(formData)).toEqual({
			password: 'Abc123!',
			confirmPassword: 'Abc123!'
		});
		expect(submitButton().disabled).toBe(true);
		expect(submitButton().textContent?.trim()).toBe(m.auth_sending());
	});

	it('applies the redirect to sign in once the password is updated', async () => {
		const { toasts } = render();
		choose('Abc123!');
		const result: ActionResult = {
			type: 'redirect',
			status: 303,
			location: '/auth/login?reason=password-reset'
		};

		await (await submit()).finish(result);

		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(toasts()).toEqual([]);
		expect(submitButton().disabled).toBe(false);
		expect(submitButton().textContent?.trim()).toBe(m.auth_update_password_submit());
	});

	it('shows why the update failed', async () => {
		const { toasts } = render();
		choose('Abc123!');
		const result: ActionResult = {
			type: 'failure',
			status: 500,
			data: { message: 'Failed to update password. The link may have expired.' }
		};

		await (await submit()).finish(result);

		expect(toasts()).toMatchObject([
			{ tone: 'danger', message: 'Failed to update password. The link may have expired.' }
		]);
		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(submitButton().disabled).toBe(false);
	});

	it('only applies a failure without a message, or an unexpected error', async () => {
		const { toasts } = render();
		choose('Abc123!');

		await (await submit()).finish({ type: 'failure', status: 400, data: {} });
		await (await submit()).finish({ type: 'error', status: 500, error: new Error('boom') });

		expect(toasts()).toEqual([]);
		expect(forms.applyAction).toHaveBeenCalledTimes(2);
	});

	it('cancels a second submit while one is in flight, so it is not posted twice', async () => {
		render();
		choose('Abc123!');
		const first = await submit();

		const second = await submit();

		expect(typeof first.after).toBe('function');
		expect(second.after).toBeUndefined();
		expect(second.cancel).toHaveBeenCalledTimes(1);
		expect(submitButton().disabled).toBe(true);
	});
});
