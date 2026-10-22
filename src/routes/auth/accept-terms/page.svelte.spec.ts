import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LegalDocumentStatusDto } from '$lib/api/api.dtos';
import { legalDocumentUrl } from '$lib/i18n/legal-urls';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import AcceptTermsPage from './+page.svelte';

// Boundaries: the SvelteKit runtime (page URL, navigation, form enhancement).
const runtime = vi.hoisted(() => ({
	page: { url: new URL('http://localhost/auth/accept-terms'), params: {}, data: {} },
	goto: vi.fn(async () => {})
}));
vi.mock('$app/state', () => ({ page: runtime.page }));
vi.mock('$app/navigation', () => ({ goto: runtime.goto }));

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

type Consent = 'privacy' | 'terms' | 'eula';

function legalDocument(
	kind: LegalDocumentStatusDto['kind'],
	needs_acceptance: boolean,
	effective_at = '2026-09-01T00:00:00Z'
): LegalDocumentStatusDto {
	return {
		kind,
		current_version: 2,
		// The API's stored URL is never linked (see the page's comment).
		url: `https://www.cropwatch.co.jp/stored/${kind}`,
		effective_at,
		accepted_version: needs_acceptance ? 1 : 2,
		accepted_at: '2025-04-01T00:00:00Z',
		needs_acceptance
	};
}

const DOCUMENTS = [
	legalDocument('privacy_policy', true, '2026-09-01T00:00:00Z'),
	legalDocument('terms_of_service', false),
	legalDocument('eula', true, '2026-10-15T00:00:00Z')
];

let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	documents: LegalDocumentStatusDto[] = DOCUMENTS,
	form: Record<string, unknown> | null = null,
	redirectPath = '/'
) {
	view = renderWithServices(AcceptTermsPage, {
		props: { data: { documents, redirectPath }, form } as never
	});
	return view;
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const submitButton = () => byId<HTMLButtonElement>('accept-terms-submit-button');
const updatedDocuments = () =>
	[...document.querySelectorAll('.updated-docs li')].map((item) => [
		item.querySelector('.updated-doc-name')?.textContent,
		item.querySelector('.updated-doc-date')?.textContent?.trim()
	]);
const updatedOn = (effectiveAt: string) =>
	m.legal_reaccept_updated_on({ date: new Date(effectiveAt).toLocaleDateString() });

function agree(consent: Consent) {
	const link = byId<HTMLAnchorElement>(`create-account-consent-${consent}-link`);
	// The policy opens in a new tab; keep the test page where it is.
	link.addEventListener('click', (event) => event.preventDefault(), { once: true });
	link.click();
	flushSync();
	byId<HTMLInputElement>(`create-account-consent-${consent}-checkbox`).click();
	flushSync();
}

function agreeToAll() {
	for (const consent of ['privacy', 'terms', 'eula'] as const) agree(consent);
}

/**
 * Runs the form's enhance callback as SvelteKit does on submit; `finish`
 * then hands the returned callback the action's result.
 */
async function submit() {
	if (!forms.submit) throw new Error('the form is not enhanced');
	const formElement = byId<HTMLFormElement>('accept-terms-form');
	const action = new URL('http://localhost/auth/accept-terms');
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
	runtime.page.url = new URL('http://localhost/auth/accept-terms');
});

afterEach(() => {
	view?.unmount();
	view = null;
	forms.submit = null;
	forms.applyAction.mockReset();
	runtime.goto.mockReset();
});

describe('accept terms page', () => {
	it('lists the documents that changed since the user last agreed', () => {
		render();

		expect(document.title).toBe(m.legal_reaccept_page_title());
		expect(document.querySelector('h1')?.textContent).toBe(m.legal_reaccept_heading());
		expect(document.querySelector('.auth-subtitle')?.textContent).toBe(
			m.legal_reaccept_description()
		);
		expect(document.querySelector('.logo-image')?.getAttribute('alt')).toBe(m.app_name());
		expect(updatedDocuments()).toEqual([
			[m.legal_doc_privacy_policy(), updatedOn('2026-09-01T00:00:00Z')],
			[m.legal_doc_eula(), updatedOn('2026-10-15T00:00:00Z')]
		]);
	});

	it('names every kind of document', () => {
		render([legalDocument('terms_of_service', true), legalDocument('privacy_policy', true)]);

		expect(updatedDocuments().map(([name]) => name)).toEqual([
			m.legal_doc_terms_of_service(),
			m.legal_doc_privacy_policy()
		]);
	});

	it('links the policies for the UI language, not the URLs the API stored', () => {
		render();

		expect(
			(['privacy', 'terms', 'eula'] as const).map((consent) =>
				byId(`create-account-consent-${consent}-link`).getAttribute('href')
			)
		).toEqual([
			legalDocumentUrl('privacy_policy'),
			legalDocumentUrl('terms_of_service'),
			legalDocumentUrl('eula')
		]);
	});

	it('can be submitted once all three agreements are given', () => {
		render();
		expect(submitButton().disabled).toBe(true);
		expect(submitButton().textContent?.trim()).toBe(m.legal_reaccept_submit());

		agree('privacy');
		agree('terms');
		expect(submitButton().disabled).toBe(true);
		agree('eula');
		expect(submitButton().disabled).toBe(false);
	});

	it("shows the action's error", () => {
		render(DOCUMENTS, { error: m.auth_must_agree_all_policies() });

		expect(document.querySelector('.app-notice--danger')?.textContent?.trim()).toBe(
			m.auth_must_agree_all_policies()
		);
	});

	it('shows no notice without an error', () => {
		render(DOCUMENTS, { success: true });

		expect(document.querySelector('.app-notice')).toBeNull();
	});

	it('offers to sign out instead, with a POST to the logout action', () => {
		render();

		const signOut = byId<HTMLButtonElement>('accept-terms-sign-out-link');
		expect(signOut.textContent?.trim()).toBe(m.legal_reaccept_sign_out());
		expect(signOut.type).toBe('submit');
		// It submits its own form, not the agreement form it sits in.
		expect(signOut.form?.id).toBe('accept-terms-sign-out-form');
		expect(signOut.form?.method).toBe('post');
		expect(new URL(signOut.form?.action ?? '').pathname).toBe('/auth/logout');
	});

	it('posts the three agreements and shows that it is saving', async () => {
		render();
		agreeToAll();

		const { cancel, formData } = await submit();

		expect(cancel).not.toHaveBeenCalled();
		expect(Object.fromEntries(formData)).toEqual({
			agreedPrivacy: 'true',
			agreedTerms: 'true',
			agreedEula: 'true'
		});
		expect(submitButton().disabled).toBe(true);
		expect(submitButton().getAttribute('aria-busy')).toBe('true');
	});

	it('goes on to the page the user was heading to, reloading its data', async () => {
		render(DOCUMENTS, null, '/locations/8');
		agreeToAll();

		await (await submit()).finish({ type: 'success', status: 200, data: { success: true } });

		expect(runtime.goto).toHaveBeenCalledWith('/locations/8', { invalidateAll: true });
		expect(forms.applyAction).not.toHaveBeenCalled();
		expect(submitButton().getAttribute('aria-busy')).toBeNull();
	});

	it('follows the redirect the load sanitized, not the raw URL', async () => {
		// The load turns an unsafe ?redirect= into '/'; the page must not re-read the URL.
		runtime.page.url = new URL(
			'http://localhost/auth/accept-terms?redirect=https%3A%2F%2Fevil.example'
		);
		render(DOCUMENTS, null, '/');
		agreeToAll();

		await (await submit()).finish({ type: 'success', status: 200, data: { success: true } });

		expect(runtime.goto).toHaveBeenCalledWith('/', { invalidateAll: true });
	});

	it('applies a failure and stays on the page', async () => {
		render();
		agreeToAll();
		const result: ActionResult = {
			type: 'failure',
			status: 502,
			data: { error: m.legal_reaccept_failed() }
		};

		await (await submit()).finish(result);

		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(runtime.goto).not.toHaveBeenCalled();
		expect(submitButton().disabled).toBe(false);
	});

	it('re-enables the form even when the navigation fails', async () => {
		render();
		agreeToAll();
		runtime.goto.mockRejectedValueOnce(new Error('navigation failed'));

		const { finish } = await submit();
		await expect(finish({ type: 'success', status: 200, data: { success: true } })).rejects.toThrow(
			'navigation failed'
		);
		flushSync();

		expect(submitButton().getAttribute('aria-busy')).toBeNull();
		expect(submitButton().disabled).toBe(false);
	});

	it('ignores another submit while saving', async () => {
		render();
		agreeToAll();
		await submit();

		const second = await submit();

		expect(second.cancel).toHaveBeenCalledTimes(1);
		expect(second.after).toBeUndefined();
		expect(second.formData.has('agreedPrivacy')).toBe(false);
	});
});
