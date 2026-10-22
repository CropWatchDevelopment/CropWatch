import { flushSync } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import { isStrongPassword, type IPasswordValidationResult } from '$lib/utils/strongPasswordCheck';
import CreateAccountPasswordFields from './CreateAccountPasswordFields.svelte';

const RULES = [
	m.auth_password_requirement_length,
	m.auth_password_requirement_lowercase,
	m.auth_password_requirement_uppercase,
	m.auth_password_requirement_number,
	m.auth_password_requirement_symbol
];

let view: ReturnType<typeof renderWithServices> | null = null;

function validation(met: Partial<IPasswordValidationResult> = {}): IPasswordValidationResult {
	return {
		hasMinLength: false,
		hasLowerCase: false,
		hasUpperCase: false,
		hasNumber: false,
		hasSymbol: false,
		isValid: false,
		errors: [],
		...met
	};
}

/** Fixed props, as a parent passes them for one render. */
function render(props: {
	password?: string;
	confirmPassword?: string;
	passwordsMatch?: boolean;
	passwordValidation?: IPasswordValidationResult;
}) {
	view = renderWithServices(CreateAccountPasswordFields, {
		props: {
			password: '',
			confirmPassword: '',
			passwordsMatch: false,
			passwordValidation: validation(),
			...props
		}
	});
	return view;
}

/** Bound like the create-account page binds it, with the same derived props. */
function renderBound() {
	let password = $state('');
	let confirmPassword = $state('');
	view = renderWithServices(CreateAccountPasswordFields, {
		props: {
			get password() {
				return password;
			},
			set password(value: string) {
				password = value;
			},
			get confirmPassword() {
				return confirmPassword;
			},
			set confirmPassword(value: string) {
				confirmPassword = value;
			},
			get passwordValidation() {
				return isStrongPassword(password);
			},
			get passwordsMatch() {
				return password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
			}
		}
	});
	return {
		password: () => password,
		confirmPassword: () => confirmPassword
	};
}

const passwordInput = () =>
	document.getElementById('create-account-password-input') as HTMLInputElement;
const confirmInput = () =>
	document.getElementById('create-account-password-confirm-input') as HTMLInputElement;
const checklist = () => document.querySelector('ul.pw-checklist');
const items = () =>
	[...document.querySelectorAll('.pw-checklist li')].map((item) => ({
		icon: item.querySelector('.pw-icon')?.textContent,
		text: item.textContent?.replace(item.querySelector('.pw-icon')?.textContent ?? '', '').trim(),
		met: item.classList.contains('met')
	}));
const matchHint = () => document.querySelector('p.pw-match-hint');

function type(field: HTMLInputElement, value: string) {
	field.value = value;
	field.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('CreateAccountPasswordFields', () => {
	it('shows the password and confirmation fields, without hints while they are empty', () => {
		render({});

		expect(
			[...document.querySelectorAll('.field-label')].map((label) => label.textContent)
		).toEqual([m.auth_password_label_required(), m.auth_confirm_password_label_required()]);
		for (const [field, name] of [
			[passwordInput(), 'password'],
			[confirmInput(), 'confirmPassword']
		] as const) {
			expect([field.name, field.type, field.required, field.autocomplete]).toEqual([
				name,
				'password',
				true,
				'new-password'
			]);
			expect(field.placeholder).toBe(m.auth_password_placeholder());
			expect(field.value).toBe('');
			expect(field.closest('.cw-input')?.querySelector('button')?.getAttribute('aria-label')).toBe(
				m.cwui_input_show_password()
			);
		}
		expect(checklist()).toBeNull();
		expect(matchHint()).toBeNull();
	});

	it('lists every password rule as unmet', () => {
		render({ password: 'x' });

		expect(checklist()?.getAttribute('aria-label')).toBe(m.auth_password_requirements());
		expect(items()).toEqual(RULES.map((rule) => ({ icon: '○', text: rule(), met: false })));
	});

	it('ticks off every rule that is met', () => {
		render({
			password: 'Secret-123',
			passwordValidation: validation({
				hasMinLength: true,
				hasLowerCase: true,
				hasUpperCase: true,
				hasNumber: true,
				hasSymbol: true,
				isValid: true
			})
		});

		expect(items()).toEqual(RULES.map((rule) => ({ icon: '✓', text: rule(), met: true })));
	});

	it('marks each rule on its own', () => {
		render({
			password: 'abcdef',
			passwordValidation: validation({ hasMinLength: true, hasNumber: true })
		});

		expect(items().map(({ icon, met }) => [icon, met])).toEqual([
			['✓', true],
			['○', false],
			['○', false],
			['✓', true],
			['○', false]
		]);
	});

	it('says whether the confirmation matches once one is typed', () => {
		render({ password: 'Secret-123', confirmPassword: 'Secret-123', passwordsMatch: true });
		expect(matchHint()?.textContent?.trim()).toBe(m.auth_passwords_match());
		expect(matchHint()?.className).toContain('pw-match-ok');
		expect(matchHint()?.className).not.toContain('pw-match-fail');
		view?.unmount();

		render({ password: 'Secret-123', confirmPassword: 'Secret', passwordsMatch: false });
		expect(matchHint()?.textContent?.trim()).toBe(m.auth_passwords_do_not_match());
		expect(matchHint()?.className).toContain('pw-match-fail');
		expect(matchHint()?.className).not.toContain('pw-match-ok');
	});

	it('normalises what is typed (NFKC) and hands it to the parent', () => {
		const bound = renderBound();

		type(passwordInput(), 'Ｓｅｃｒｅｔ－１２３');
		expect(bound.password()).toBe('Secret-123');
		expect(passwordInput().value).toBe('Secret-123');
		expect(items().every(({ met }) => met)).toBe(true);
		expect(matchHint()).toBeNull();

		type(confirmInput(), 'Ｓｅｃｒｅｔ－１２');
		expect(bound.confirmPassword()).toBe('Secret-12');
		expect(confirmInput().value).toBe('Secret-12');
		expect(matchHint()?.textContent?.trim()).toBe(m.auth_passwords_do_not_match());

		type(confirmInput(), 'Secret-123');
		expect(bound.confirmPassword()).toBe('Secret-123');
		expect(matchHint()?.textContent?.trim()).toBe(m.auth_passwords_match());

		type(passwordInput(), '');
		expect(bound.password()).toBe('');
		expect(checklist()).toBeNull();
		expect(matchHint()?.textContent?.trim()).toBe(m.auth_passwords_do_not_match());
	});
});
