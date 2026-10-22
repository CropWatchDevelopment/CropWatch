import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { AccountRemovalChallengeDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import RemoveAccountPage from './+page.svelte';

const FIRST_CHECK: AccountRemovalChallengeDto = { question: '3 + 4', token: 'challenge-1' };
const SECOND_CHECK: AccountRemovalChallengeDto = { question: '5 + 6', token: 'challenge-2' };

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render() {
	view = renderWithServices(RemoveAccountPage, { services });
	return view;
}

const getChallenge = () => services.account.getAccountRemovalChallenge;
const requestRemoval = () => services.account.requestAccountRemoval;
const form = () => document.querySelector('form');
const field = <T extends HTMLElement>(name: string) =>
	document.querySelector(`[name="${name}"]`) as T | null;
const submitButton = () => form()?.querySelector<HTMLButtonElement>('button[type="submit"]');
const notice = (tone: string) =>
	document.querySelector(`.app-notice--${tone}`)?.textContent?.trim() ?? null;
/** Field labels without the decorative "required" mark (aria-hidden). */
const labels = () =>
	[...document.querySelectorAll('form label')].map((label) => {
		const copy = label.cloneNode(true) as HTMLElement;
		copy.querySelectorAll('[aria-hidden="true"]').forEach((mark) => mark.remove());
		return copy.textContent?.trim();
	});
const retryButton = () =>
	[...document.querySelectorAll('button')].find(
		(button) => button.textContent?.trim() === m.account_removal_retry()
	);

function type(name: string, value: string) {
	const element = field<HTMLInputElement | HTMLTextAreaElement>(name);
	if (!element) throw new Error(`No field "${name}"`);
	element.value = value;
	element.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

async function renderReady() {
	const page = render();
	await expect.poll(() => form()).not.toBeNull();
	return page;
}

function fillIn(email = 'ada@example.com', answer = '7', message = '') {
	type('email', email);
	type('message', message);
	type('answer', answer);
}

beforeEach(() => {
	services = createMockServices();
	getChallenge().mockResolvedValue(FIRST_CHECK);
	requestRemoval().mockResolvedValue(undefined);
});

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('remove account page', () => {
	it('shows only the card while the human check is loading', () => {
		getChallenge().mockReturnValue(new Promise(() => {}));

		render();

		expect(document.title).toBe(`${m.account_removal_title()} - CropWatch`);
		expect(document.querySelector('.cw-card__title')?.textContent).toBe(m.account_removal_title());
		expect(document.querySelector('.cw-card__subtitle')?.textContent?.trim()).toBe(
			m.account_removal_subtitle()
		);
		expect(getChallenge()).toHaveBeenCalledTimes(1);
		expect(getChallenge()).toHaveBeenCalledWith();
		expect(form()).toBeNull();
		expect(document.querySelector('.app-notice')).toBeNull();
	});

	it('asks for the address, a message and the answer to the check', async () => {
		await renderReady();

		expect(document.body.textContent).toContain(m.account_removal_intro());
		expect(labels()).toEqual([
			m.account_removal_email_label(),
			m.account_removal_message_label(),
			m.account_removal_challenge_label({ question: '3 + 4' })
		]);
		const email = field<HTMLInputElement>('email');
		expect([email?.type, email?.required, email?.placeholder]).toEqual([
			'email',
			true,
			'you@example.com'
		]);
		expect(field<HTMLTextAreaElement>('message')?.placeholder).toBe(
			m.account_removal_message_placeholder()
		);
		expect(field<HTMLInputElement>('answer')?.required).toBe(true);
		expect(submitButton()?.textContent?.trim()).toBe(m.account_removal_submit());
		expect(submitButton()?.disabled).toBe(true);
		expect(document.querySelector('.app-notice')).toBeNull();
	});

	it('can be submitted with an email address and an answer', async () => {
		await renderReady();

		for (const [email, answer, enabled] of [
			['ada@example.com', '7', true],
			['a@b', '7', false],
			['a@bc', '7', true],
			['adaexample.com', '7', false],
			['  @b  ', '7', false],
			['ada@example.com', '   ', false],
			['ada@example.com', '', false]
		] as const) {
			type('email', email);
			type('answer', answer);
			expect(submitButton()?.disabled, `${email} / ${answer}`).toBe(!enabled);
		}
	});

	it('sends the trimmed request with the check token, then confirms', async () => {
		await renderReady();
		fillIn('  ada@example.com ', ' 7 ', '  Please delete my data.  ');

		submitButton()?.click();

		await expect.poll(() => notice('success')).toBe(m.account_removal_success());
		expect(requestRemoval()).toHaveBeenCalledExactlyOnceWith({
			email: 'ada@example.com',
			message: 'Please delete my data.',
			answer: 7,
			token: 'challenge-1'
		});
		expect(form()).toBeNull();
		expect(document.querySelector('.app-notice--success')?.getAttribute('aria-live')).toBe(
			'polite'
		);
	});

	it('leaves out an empty message', async () => {
		await renderReady();
		fillIn('ada@example.com', '7', '   ');

		submitButton()?.click();

		await expect.poll(() => requestRemoval().mock.calls.length).toBe(1);
		expect(requestRemoval().mock.calls[0][0]).toEqual({
			email: 'ada@example.com',
			message: undefined,
			answer: 7,
			token: 'challenge-1'
		});
	});

	it('shows that it is sending and ignores another submit meanwhile', async () => {
		let finishRequest: () => void = () => {};
		requestRemoval().mockReturnValue(new Promise<void>((resolve) => (finishRequest = resolve)));
		await renderReady();
		fillIn();

		submitButton()?.click();
		await expect.poll(() => submitButton()?.getAttribute('aria-busy')).toBe('true');
		expect(submitButton()?.disabled).toBe(true);
		form()?.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
		finishRequest();

		await expect.poll(() => notice('success')).toBe(m.account_removal_success());
		expect(requestRemoval()).toHaveBeenCalledTimes(1);
	});

	it.each([
		['a wrong answer', new ApiError(400, 'Bad Request', null), m.account_removal_error_answer],
		[
			'too many attempts',
			new ApiError(429, 'Too Many Requests', null),
			m.account_removal_error_rate_limited
		],
		[
			'a server error',
			new ApiError(500, 'Internal Server Error', null),
			m.account_removal_error_generic
		],
		['a network error', new TypeError('Failed to fetch'), m.account_removal_error_generic]
	])('explains %s and poses a new check', async (_label, failure, message) => {
		requestRemoval().mockRejectedValue(failure);
		getChallenge().mockResolvedValueOnce(FIRST_CHECK).mockResolvedValueOnce(SECOND_CHECK);
		await renderReady();
		fillIn('ada@example.com', '7', 'Bye');

		submitButton()?.click();

		await expect.poll(() => notice('danger')).toBe(message());
		await expect.poll(labels).toContain(m.account_removal_challenge_label({ question: '5 + 6' }));
		expect(getChallenge()).toHaveBeenCalledTimes(2);
		expect(field<HTMLInputElement>('answer')?.value).toBe('');
		expect(field<HTMLInputElement>('email')?.value).toBe('ada@example.com');
		expect(field<HTMLTextAreaElement>('message')?.value).toBe('Bye');
		expect(submitButton()?.getAttribute('aria-busy')).toBeNull();
		expect(submitButton()?.disabled).toBe(true);

		type('answer', '11');
		expect(submitButton()?.disabled).toBe(false);
		requestRemoval().mockResolvedValue(undefined);
		submitButton()?.click();
		await expect.poll(() => notice('success')).toBe(m.account_removal_success());
		expect(requestRemoval()).toHaveBeenLastCalledWith({
			email: 'ada@example.com',
			message: 'Bye',
			answer: 11,
			token: 'challenge-2'
		});
	});

	it('offers a retry when the human check cannot be loaded', async () => {
		getChallenge().mockRejectedValueOnce(new TypeError('Failed to fetch'));
		render();

		await expect.poll(() => notice('danger')).toBe(m.account_removal_error_generic());
		expect(document.querySelector('.app-notice--danger')?.getAttribute('aria-live')).toBe('polite');
		expect(form()).toBeNull();

		retryButton()?.click();

		await expect.poll(() => form()).not.toBeNull();
		expect(getChallenge()).toHaveBeenCalledTimes(2);
		expect(notice('danger')).toBeNull();
		expect(retryButton()).toBeUndefined();
	});

	it('offers the retry when no new check can be loaded after a failed request', async () => {
		requestRemoval().mockRejectedValue(new ApiError(400, 'Bad Request', null));
		getChallenge()
			.mockResolvedValueOnce(FIRST_CHECK)
			.mockRejectedValueOnce(new TypeError('Failed to fetch'));
		await renderReady();
		fillIn();

		submitButton()?.click();

		await expect.poll(() => retryButton()).toBeDefined();
		expect(form()).toBeNull();
		expect(notice('danger')).toBe(m.account_removal_error_generic());
		expect(document.body.textContent).not.toContain(m.account_removal_error_answer());
	});
});
