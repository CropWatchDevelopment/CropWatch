import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import CheckEmailPage from './+page.svelte';

// Boundary: the SvelteKit page state (its URL carries the redirect).
const { page } = vi.hoisted(() => ({
	page: { url: new URL('http://localhost/auth/create-account/check-email'), params: {}, data: {} }
}));
vi.mock('$app/state', () => ({ page }));

let view: ReturnType<typeof renderWithServices> | null = null;

function render() {
	view = renderWithServices(CheckEmailPage);
	return view;
}

const squash = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();
const texts = (selector: string) =>
	[...document.querySelectorAll(selector)].map((element) => squash(element.textContent));
const signInLink = () =>
	document.getElementById('create-account-check-email-sign-in-link') as HTMLAnchorElement;

beforeEach(() => {
	page.url = new URL('http://localhost/auth/create-account/check-email');
});

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('check email page', () => {
	it('tells the user to activate the new account from the email', () => {
		render();

		expect(document.title).toBe(m.auth_check_email_page_title());
		expect(document.querySelector('.logo-image')?.getAttribute('alt')).toBe(m.app_name());
		expect(document.querySelector('h1.check-title')?.textContent).toBe(
			m.auth_check_email_heading()
		);
		expect(texts('.check-message')).toEqual([
			squash(m.auth_check_email_account_created()),
			squash(
				`${m.auth_check_email_activation_link_prefix()} ${m.auth_check_email_activation_link_highlight()} ${m.auth_check_email_activation_link_suffix()}`
			),
			squash(
				`${m.auth_check_email_open_inbox_prefix()} ${m.auth_check_email_open_inbox_highlight()} ${m.auth_check_email_open_inbox_suffix()}`
			)
		]);
		expect(texts('.check-message strong')).toEqual([
			m.auth_check_email_account_created(),
			m.auth_check_email_activation_link_highlight(),
			m.auth_check_email_open_inbox_highlight()
		]);
		expect(document.querySelector('.security-copy')?.textContent).toBe(m.auth_security_copy());
	});

	it('explains what to do when the email does not arrive', () => {
		render();

		expect(document.querySelector('.tip-heading')?.textContent).toBe(
			m.auth_check_email_missing_heading()
		);
		expect(texts('.tip-list li')).toEqual([
			m.auth_check_email_tip_spam(),
			m.auth_check_email_tip_address(),
			m.auth_check_email_tip_delivery()
		]);
		expect(texts('.check-tips .text-lg')).toEqual([
			m.auth_check_email_you(),
			m.auth_check_email_check(),
			m.auth_check_email_email(),
			m.auth_check_email_you(),
			m.auth_check_email_check(),
			m.auth_check_email_spam()
		]);
		expect(
			[...document.querySelectorAll('.check-tips [role="img"]')].map((icon) =>
				icon.getAttribute('aria-label')
			)
		).toEqual([
			m.auth_check_email_you(),
			m.auth_check_email_next(),
			m.auth_check_email_check(),
			m.auth_check_email_next(),
			m.auth_check_email_email(),
			m.auth_check_email_you(),
			m.auth_check_email_next(),
			m.auth_check_email_check(),
			m.auth_check_email_next()
		]);
		// The spam icon keeps its own colours, so it is an <img>.
		expect(document.querySelector('.check-tips img.cw-icon')?.getAttribute('alt')).toBe(
			m.auth_check_email_spam()
		);
		expect(texts('.check-tips p.font-bold')).toEqual([
			m.auth_check_email_cant_find_it(),
			m.auth_check_email_not_there()
		]);

		const support = document.getElementById(
			'create-account-check-email-contact-support-link'
		) as HTMLAnchorElement;
		expect(support.textContent).toBe(m.auth_check_email_contact_support());
		expect(support.getAttribute('href')).toBe('mailto:sayaka@cropwatch.io');
		expect(support.rel).toBe('external');
	});

	it('links to sign in', () => {
		render();

		expect(squash(signInLink().textContent)).toBe(m.auth_go_to_sign_in());
		expect(signInLink().getAttribute('href')).toBe('/auth/login');
		expect(signInLink().querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
			m.auth_sign_in()
		);
	});

	it('keeps a safe redirect for after signing in', () => {
		page.url = new URL(
			'http://localhost/auth/create-account/check-email?redirect=%2Fauth%2Finvite%2Ftok-123'
		);

		render();

		expect(signInLink().getAttribute('href')).toBe(
			'/auth/login?redirect=%2Fauth%2Finvite%2Ftok-123'
		);
	});

	it('drops an unsafe redirect', () => {
		page.url = new URL(
			'http://localhost/auth/create-account/check-email?redirect=https%3A%2F%2Fevil.example'
		);

		render();

		expect(signInLink().getAttribute('href')).toBe('/auth/login');
	});
});
